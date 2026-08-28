const prisma = require("../lib/prisma");
const { getOrCreateGroup } = require("./messageHandler");

/**
 * শুধু গ্রুপ অ্যাডমিনরাই এই কমান্ডগুলো চালাতে পারবে
 */
async function isGroupAdmin(ctx) {
  if (ctx.chat.type === "private") return false;
  const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
  return ["administrator", "creator"].includes(member.status);
}

/**
 * /addkeyword <keyword> | <action: reply/warn/mute/ban> | <response বা minutes>
 * উদাহরণ:
 *   /addkeyword ইনবক্স | reply | কেউ ইনবক্সে যাবেন না, স্প্যাম হতে পারে
 *   /addkeyword হাই | mute | 5
 */
async function addKeywordCommand(ctx) {
  if (!(await isGroupAdmin(ctx))) {
    return ctx.reply("❌ শুধু গ্রুপ অ্যাডমিনরাই এই কমান্ড ব্যবহার করতে পারবেন।");
  }

  const raw = ctx.message.text.replace("/addkeyword", "").trim();
  const parts = raw.split("|").map((p) => p.trim());

  if (parts.length < 2) {
    return ctx.reply(
      "ব্যবহার:\n`/addkeyword শব্দ | action | response_বা_minutes`\n\n" +
        "উদাহরণ:\n`/addkeyword ইনবক্স | reply | কেউ ইনবক্সে যাবেন না, স্প্যাম হতে পারে`\n" +
        "`/addkeyword হাই | mute | 5`\n" +
        "action হতে পারে: reply, warn, mute, ban",
      { parse_mode: "Markdown" }
    );
  }

  const [keyword, actionType, extra] = parts;
  const group = await getOrCreateGroup(ctx.chat);

  const data = {
    groupId: group.id,
    keyword,
    actionType,
    responseText: actionType === "reply" ? extra : null,
    muteMinutes: actionType === "mute" ? parseInt(extra, 10) || 5 : null,
  };

  const created = await prisma.keyword.create({ data });
  await ctx.reply(`✅ কিওয়ার্ড যোগ হয়েছে: "${created.keyword}" → ${created.actionType}`);
}

/**
 * /listkeywords — গ্রুপের সব কিওয়ার্ড দেখায়
 */
async function listKeywordsCommand(ctx) {
  const group = await getOrCreateGroup(ctx.chat);
  const keywords = await prisma.keyword.findMany({ where: { groupId: group.id } });

  if (keywords.length === 0) {
    return ctx.reply("এখনো কোনো কিওয়ার্ড সেট করা হয়নি। /addkeyword দিয়ে যোগ করুন।");
  }

  const list = keywords
    .map(
      (k, i) =>
        `${i + 1}. "${k.keyword}" → ${k.actionType}${k.muteMinutes ? ` (${k.muteMinutes} মিনিট)` : ""} [id:${k.id}]`
    )
    .join("\n");

  await ctx.reply(`📋 কিওয়ার্ড লিস্ট:\n${list}`);
}

/**
 * /delkeyword <id>
 */
async function delKeywordCommand(ctx) {
  if (!(await isGroupAdmin(ctx))) {
    return ctx.reply("❌ শুধু গ্রুপ অ্যাডমিনরাই এই কমান্ড ব্যবহার করতে পারবেন।");
  }
  const id = parseInt(ctx.message.text.replace("/delkeyword", "").trim(), 10);
  if (!id) return ctx.reply("ব্যবহার: /delkeyword <id>  (id জানতে /listkeywords দিন)");

  await prisma.keyword.delete({ where: { id } }).catch(() => null);
  await ctx.reply("🗑️ কিওয়ার্ড ডিলিট করা হয়েছে।");
}

/**
 * /warnings — কোন ইউজার কতবার ওয়ার্ন হয়েছে (রিপ্লাই করে ইউজার সিলেক্ট করতে হবে)
 */
async function warningsCommand(ctx) {
  const target = ctx.message.reply_to_message?.from;
  if (!target) return ctx.reply("যার ওয়ার্নিং দেখতে চান তার মেসেজে রিপ্লাই দিয়ে /warnings লিখুন।");

  const group = await getOrCreateGroup(ctx.chat);
  const groupUser = await prisma.groupUser.findUnique({
    where: { groupId_telegramId: { groupId: group.id, telegramId: BigInt(target.id) } },
  });

  await ctx.reply(
    `${target.first_name} এর ওয়ার্নিং: ${groupUser?.warningCount || 0}/3, মিউটেড: ${
      groupUser?.isMuted ? "হ্যাঁ" : "না"
    }, ব্যানড: ${groupUser?.isBanned ? "হ্যাঁ" : "না"}`
  );
}

module.exports = {
  addKeywordCommand,
  listKeywordsCommand,
  delKeywordCommand,
  warningsCommand,
};
