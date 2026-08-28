require("dotenv").config();

const bot = require("./bot");
const app = require("./api");

const PORT = process.env.PORT || 3000;

// একই Fly.io VM-এ বট (polling) আর API (Express) দুটোই চলবে
app.listen(PORT, () => {
  console.log(`✅ API সার্ভার চালু: পোর্ট ${PORT}`);
});

bot.launch();
console.log("✅ টেলিগ্রাম বট চালু হয়েছে (polling mode)");

// গ্রেসফুল শাটডাউন
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
