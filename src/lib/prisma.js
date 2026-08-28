const { PrismaClient } = require("@prisma/client");

// পুরো অ্যাপে একটাই Prisma instance ব্যবহার করা হবে (connection pool বাঁচানোর জন্য)
const prisma = new PrismaClient();

module.exports = prisma;
