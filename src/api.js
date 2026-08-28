const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.DASHBOARD_URL || "*" }));

// ----- Auth middleware -----
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ----- Auth routes -----
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: "ভুল ইমেইল বা পাসওয়ার্ড" });
  }
  const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token });
});

// ----- One-time admin setup (CLI/ssh ছাড়াই প্রথম অ্যাডমিন বানানোর জন্য) -----
// curl দিয়ে একবার কল করবেন, তারপর এটা ব্যবহার বন্ধ করে দিতে পারেন (ADMIN_SETUP_KEY সরিয়ে)
app.post("/api/setup/create-admin", async (req, res) => {
  const { setupKey, email, password } = req.body;
  if (!process.env.ADMIN_SETUP_KEY || setupKey !== process.env.ADMIN_SETUP_KEY) {
    return res.status(401).json({ error: "Invalid setup key" });
  }
  if (!email || !password) {
    return res.status(400).json({ error: "email ও password দিতে হবে" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  res.json({ success: true, email: admin.email });
});

// ----- Groups -----
app.get("/api/groups", requireAuth, async (req, res) => {
  const groups = await prisma.group.findMany();
  res.json(serializeBigInt(groups));
});

// ----- Keywords CRUD -----
app.get("/api/groups/:groupId/keywords", requireAuth, async (req, res) => {
  const keywords = await prisma.keyword.findMany({
    where: { groupId: Number(req.params.groupId) },
  });
  res.json(keywords);
});

app.post("/api/groups/:groupId/keywords", requireAuth, async (req, res) => {
  const { keyword, matchType, actionType, responseText, muteMinutes } = req.body;
  const created = await prisma.keyword.create({
    data: {
      groupId: Number(req.params.groupId),
      keyword,
      matchType: matchType || "contains",
      actionType,
      responseText,
      muteMinutes,
    },
  });
  res.json(created);
});

app.put("/api/keywords/:id", requireAuth, async (req, res) => {
  const updated = await prisma.keyword.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(updated);
});

app.delete("/api/keywords/:id", requireAuth, async (req, res) => {
  await prisma.keyword.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});

// ----- Users (warnings/mute/ban) -----
app.get("/api/groups/:groupId/users", requireAuth, async (req, res) => {
  const users = await prisma.groupUser.findMany({
    where: { groupId: Number(req.params.groupId) },
    orderBy: { warningCount: "desc" },
  });
  res.json(serializeBigInt(users));
});

// ----- Warnings log -----
app.get("/api/groups/:groupId/warnings", requireAuth, async (req, res) => {
  const warnings = await prisma.warning.findMany({
    where: { groupId: Number(req.params.groupId) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(serializeBigInt(warnings));
});

// ----- FAQ / AI knowledge base -----
app.get("/api/groups/:groupId/faq", requireAuth, async (req, res) => {
  const faqs = await prisma.faqEntry.findMany({ where: { groupId: Number(req.params.groupId) } });
  res.json(faqs);
});

app.post("/api/groups/:groupId/faq", requireAuth, async (req, res) => {
  const { question, answer } = req.body;
  const created = await prisma.faqEntry.create({
    data: { groupId: Number(req.params.groupId), question, answer },
  });
  res.json(created);
});

app.delete("/api/faq/:id", requireAuth, async (req, res) => {
  await prisma.faqEntry.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});

// BigInt কে JSON এ পাঠানোর জন্য (telegramId BigInt টাইপ)
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

module.exports = app;
