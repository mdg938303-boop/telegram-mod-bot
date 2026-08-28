FROM node:20-slim

# Prisma-র জন্য OpenSSL দরকার (Neon-এর মতো SSL-required ডেটাবেসের সাথে কানেক্ট করতে)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 3000

# প্রতিবার স্টার্টে migration চালিয়ে নেয় (ssh ছাড়াই), তারপর অ্যাপ চালু করে
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
