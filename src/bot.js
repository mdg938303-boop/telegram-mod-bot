const { Telegraf } = require("telegraf");
const { handleMessage } = require("./handlers/messageHandler");
const {
  addKeywordCommand,
  listKeywordsCommand,
  delKeywordCommand,
  warningsCommand,
} = require("./handlers/adminCommands");

const bot = new Telegraf(process.env.BOT_TOKEN);

// অ্যাডমিন কমান্ডগুলো (টেলিগ্রামের ভেতর থেকেই)
bot.command("addkeyword", addKeywordCommand);
bot.command("listkeywords", listKeywordsCommand);
bot.command("delkeyword", delKeywordCommand);
bot.command("warnings", warningsCommand);

bot.start((ctx) =>
  ctx.reply("👋 বট চালু হয়েছে! গ্রুপে অ্যাডমিন হিসেবে যোগ করে /addkeyword দিয়ে কিওয়ার্ড সেট করুন।")
);

// প্রতিটা টেক্সট মেসেজ পাস হবে কিওয়ার্ড ডিটেকশন + AI Q&A লজিকে
bot.on("text", handleMessage);

bot.catch((err, ctx) => {
  console.error(`বট এরর (${ctx.updateType}):`, err);
});

module.exports = bot;
