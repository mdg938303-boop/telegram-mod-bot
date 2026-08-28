const prisma = require("../lib/prisma");
const { answerUserQuestion } = require("../lib/ai");

/**
 * গ্রুপ রেকর্ড খুঁজে বের করে, না থাকলে তৈরি করে (auto-register)
 */
async function getOrCreateGroup(chat) {
  return prisma.group.upsert({
    where: { telegramId: BigInt(chat.id) },
    update: { title: chat.title },
    create: { telegramId: BigInt(chat.id), title: chat.title },
  });
}

/**
 * ইউজারের গ্রুপ-স্পেসিফিক রেকর্ড খুঁজে বের করে/তৈরি করে
 */
async function getOrCreateGroupUser(groupId, from) {
  return prisma.groupUser.upsert({
    where: { groupId_telegramId: { groupId, telegramId: BigInt(from.id) } },
    update: { username: from.username, firstName: from.first_name },
    create: {
      groupId,
      telegramId: BigInt(from.id),
      username: from.username,
      firstName: from.first_name,
    },
  });
}

/**
 * টেক্সটের মধ্যে কোনো সক্রিয় কিওয়ার্ড আছে কিনা খুঁজে বের করে (case-insensitive, partial match)
 */
function findMatchingKeyword(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.find((k) => {
    if (!k.isActive) return false;
    const kw = k.keyword.toLowerCase();
    return k.matchType === "exact" ? lower === kw : lower.includes(kw);
  });
}

/**
 * mute/ban/warn অ্যাকশন কার্যকর করে — Telegram-এ ও ডেটাবেসে
 */
async function applyAction({ ctx, group, groupUser, keyword }) {
  const { actionType } = keyword;
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  if (actionType === "mute") {
    const minutes = keyword.muteMinutes || 5;
    const untilDate = Math.floor(Date.now() / 1000) + minutes * 60;
    await ctx.telegram.restrictChatMember(chatId, userId, {
      permissions: { can_send_messages: false },
      until_date: untilDate,
    });
    await prisma.groupUser.update({
      where: { id: groupUser.id },
      data: { isMuted: true, mutedUntil: new Date(untilDate * 1000) },
    });
    await ctx.reply(
      `⚠️ ${ctx.from.first_name} কে "${keyword.keyword}" শব্দ ব্যবহারের জন্য ${minutes} মিনিটের জন্য মিউট করা হলো।`
    );
  } else if (actionType === "ban") {
    await ctx.telegram.banChatMember(chatId, userId);
    await prisma.groupUser.update({
      where: { id: groupUser.id },
      data: { isBanned: true },
    });
    await ctx.reply(`🚫 ${ctx.from.first_name} কে "${keyword.keyword}" শব্দ ব্যবহারের জন্য ব্যান করা হলো।`);
  } else if (actionType === "warn") {
    const updated = await prisma.groupUser.update({
      where: { id: groupUser.id },
      data: { warningCount: { increment: 1 } },
    });
    await ctx.reply(
      `⚠️ ${ctx.from.first_name}, দয়া করে নিয়ম মেনে চলুন। (ওয়ার্নিং: ${updated.warningCount}/3)`
    );
    // ৩ বার ওয়ার্নিং হলে অটো-ব্যান
    if (updated.warningCount >= 3) {
      await ctx.telegram.banChatMember(chatId, userId);
      await prisma.groupUser.update({
        where: { id: groupUser.id },
        data: { isBanned: true },
      });
      await ctx.reply(`🚫 ৩ বার ওয়ার্নিং পাওয়ায় ${ctx.from.first_name} কে অটো-ব্যান করা হলো।`);
    }
  } else if (actionType === "reply") {
    await ctx.reply(keyword.responseText || "এই বিষয়ে গ্রুপ রুল অনুযায়ী কথা বলা যাবে না।");
  }

  await prisma.warning.create({
    data: {
      groupId: group.id,
      telegramId: BigInt(userId),
      username: ctx.from.username,
      reason: `keyword: ${keyword.keyword}`,
      actionType,
    },
  });
}

/**
 * প্রতিটা টেক্সট মেসেজে এই ফাংশন কল হবে
 */
async function handleMessage(ctx) {
  try {
    if (!ctx.message?.text || ctx.chat.type === "private") return;

    const group = await getOrCreateGroup(ctx.chat);
    const groupUser = await getOrCreateGroupUser(group.id, ctx.from);

    // ব্যানড ইউজার হলে কিছু করার দরকার নেই
    if (groupUser.isBanned) return;

    const keywords = await prisma.keyword.findMany({ where: { groupId: group.id } });
    const matched = findMatchingKeyword(ctx.message.text, keywords);

    if (matched) {
      await applyAction({ ctx, group, groupUser, keyword: matched });
      return;
    }

    // কিওয়ার্ড ম্যাচ না হলে, এবং মেসেজটা প্রশ্নের মতো মনে হলে (বট মেনশন বা "?" দিয়ে শেষ) → AI উত্তর
    const botUsername = ctx.botInfo?.username;
    const isMentioned = botUsername && ctx.message.text.includes(`@${botUsername}`);
    const looksLikeQuestion = ctx.message.text.trim().endsWith("?");

    if (group.aiEnabled && (isMentioned || looksLikeQuestion)) {
      const faqEntries = await prisma.faqEntry.findMany({ where: { groupId: group.id } });
      const answer = await answerUserQuestion(ctx.message.text, faqEntries);
      await ctx.reply(answer, { reply_parameters: { message_id: ctx.message.message_id } });
    }
  } catch (err) {
    console.error("handleMessage error:", err);
  }
}

module.exports = { handleMessage, getOrCreateGroup, getOrCreateGroupUser };
