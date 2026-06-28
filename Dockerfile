FROM node:20-alpine AS base

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:railway"]
