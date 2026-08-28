FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 3000

# প্রতিবার স্টার্টে migration চালিয়ে নেয় (ssh ছাড়াই), তারপর অ্যাপ চালু করে
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
