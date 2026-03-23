FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build

# Standalone output: copy public assets and static files into standalone dir
RUN cp -r public .next/standalone/public && \
    cp -r .next/static .next/standalone/.next/static

EXPOSE 3000
CMD ["sh", "-c", "echo \"[start] PORT=${PORT:-3000}\"; timeout 30 npx prisma db push --accept-data-loss || true; HOSTNAME=0.0.0.0 PORT=${PORT:-3000} node .next/standalone/server.js"]
