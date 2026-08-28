const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * গ্রুপের FAQ এন্ট্রি ব্যবহার করে ইউজারের প্রশ্নের উত্তর দেয়।
 * faqEntries = [{ question, answer }, ...]
 */
async function answerUserQuestion(userMessage, faqEntries = []) {
  const knowledgeBase = faqEntries
    .map((f, i) => `${i + 1}. প্রশ্ন: ${f.question}\n   উত্তর: ${f.answer}`)
    .join("\n");

  const systemPrompt = `তুমি একটা টেলিগ্রাম গ্রুপের সহায়ক অ্যাসিস্ট্যান্ট। ইউজারদের প্রশ্নের উত্তর দাও সংক্ষেপে, বাংলায়, বন্ধুত্বপূর্ণভাবে।

গ্রুপের নির্দিষ্ট তথ্য/নিয়ম (যদি প্রশ্নের সাথে মিলে যায়, এগুলো ব্যবহার করে উত্তর দাও):
${knowledgeBase || "(কোনো নির্দিষ্ট তথ্য সেট করা নেই)"}

যদি প্রশ্নের উত্তর উপরের তথ্যে না থাকে, সাধারণ জ্ঞান দিয়ে সংক্ষিপ্ত সহায়ক উত্তর দাও। উত্তর ৩-৪ লাইনের বেশি বড় করো না।`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  return text || "দুঃখিত, এখন উত্তর দিতে পারছি না।";
}

module.exports = { answerUserQuestion };
