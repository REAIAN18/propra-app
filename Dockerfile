FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx next start -p ${PORT:-3000}"]
