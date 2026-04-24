FROM node:20-bookworm-slim AS base

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run railway:build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npm run railway:start:web"]
