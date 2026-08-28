# Telegram Group Moderation Bot + AI + Dashboard API

## যা আছে এই ভার্সনে
- কিওয়ার্ড ডিটেকশন → auto-reply / warn / mute / ban
- ৩ বার ওয়ার্নিং হলে অটো-ব্যান
- AI (Claude) দিয়ে ইউজারের প্রশ্নের উত্তর (বট মেনশন করলে বা "?" দিয়ে মেসেজ শেষ হলে)
- টেলিগ্রামের ভেতর থেকেই অ্যাডমিন কমান্ড: `/addkeyword`, `/listkeywords`, `/delkeyword`, `/warnings`
- ওয়েব ড্যাশবোর্ডের জন্য REST API (auth সহ) — পরের ধাপে Next.js dashboard এই API ব্যবহার করবে

## ধাপে ধাপে সেটআপ

### ১. বট বানানো
Telegram-এ `@BotFather` কে মেসেজ দিন → `/newbot` → টোকেন কপি করুন।

### ২. Neon.tech ডেটাবেস
1. https://neon.tech এ ফ্রি অ্যাকাউন্ট বানান, নতুন প্রজেক্ট তৈরি করুন
2. Connection Details থেকে **pooled** ও **direct** কানেকশন স্ট্রিং কপি করুন

### ২.৫ Gemini API Key
1. https://aistudio.google.com/app/apikey এ যান, Google অ্যাকাউন্ট দিয়ে লগইন করুন
2. **Create API Key** ক্লিক করুন, ফ্রি টিয়ারেই key পেয়ে যাবেন

### ৩. লোকাল সেটআপ (টেস্ট করার জন্য)
```bash
cp .env.example .env
# .env ফাইলে BOT_TOKEN, DATABASE_URL, DIRECT_URL, GEMINI_API_KEY, JWT_SECRET বসান

npm install
npx prisma migrate dev --name init   # ডেটাবেসে টেবিল তৈরি করবে
node src/createAdmin.js you@email.com yourpassword   # ড্যাশবোর্ড লগইন তৈরি
npm start
```
বট চালু হলে টেলিগ্রামে গিয়ে বটকে গ্রুপে **অ্যাডমিন** বানান (Restrict Members পারমিশন সহ), তারপর `/addkeyword` দিয়ে টেস্ট করুন।

### ৪. Fly.io তে ডিপ্লয় (CLI ছাড়া, ব্রাউজার থেকেই — মোবাইলের জন্য)
1. https://fly.io তে সাইন আপ করুন
2. Dashboard-এ **Launch an app** → **Deploy from a GitHub repo** সিলেক্ট করুন
3. আপনার `telegram-mod-bot` রিপো কানেক্ট করুন — Fly.io নিজে থেকেই `Dockerfile` ও `fly.toml` ডিটেক্ট করবে
4. Secrets/Environment variables ফর্মে বসান: `BOT_TOKEN`, `DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, `ADMIN_SETUP_KEY`
5. Deploy করুন

Migration Dockerfile-এর ভেতরেই অটো চলে যায় (প্রতি স্টার্টে), আলাদা করে কিছু করা লাগবে না।

### ৫. প্রথম অ্যাডমিন লগইন বানানো (curl দিয়ে, Termux থেকে)
```bash
curl -X POST https://YOUR-APP-NAME.fly.dev/api/setup/create-admin \
  -H "Content-Type: application/json" \
  -d '{"setupKey":"আপনার_ADMIN_SETUP_KEY","email":"you@email.com","password":"yourpassword"}'
```
`{"success":true,...}` পেলে অ্যাডমিন তৈরি হয়ে গেছে। এরপর নিরাপত্তার জন্য Fly.io dashboard থেকে `ADMIN_SETUP_KEY` secret-টা মুছে দিন বা বদলে ফেলুন।

## পরের ধাপ
এই backend + API রেডি হওয়ার পর পরের ধাপে **Next.js dashboard** বানাবো যেটা এই API কল করে:
- কিওয়ার্ড ম্যানেজার UI
- ইউজার লিস্ট (ওয়ার্নিং/মিউট/ব্যান স্ট্যাটাস)
- অ্যানালিটিক্স
- AI নলেজ বেস (FAQ) এডিটর

সেটা Vercel এ ফ্রি ডিপ্লয় হবে।
