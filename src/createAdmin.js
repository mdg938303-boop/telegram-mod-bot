// ব্যবহার: node src/createAdmin.js your@email.com yourpassword
require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.log("ব্যবহার: node src/createAdmin.js your@email.com yourpassword");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`✅ অ্যাডমিন তৈরি/আপডেট হয়েছে: ${admin.email}`);
  process.exit(0);
}

main();
