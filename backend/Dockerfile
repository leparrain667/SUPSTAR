FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm prune --omit=dev
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 4000
CMD ["node", "src/server.js"]
