FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "timeout 30 npx prisma db push --accept-data-loss || true; npx next start -p ${PORT:-3000}"]
