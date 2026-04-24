FROM node:20-alpine AS base

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run railway:build

EXPOSE 3000

CMD ["sh", "-c", "npm run railway:start:web"]
