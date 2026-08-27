FROM docker.io/library/node:20-alpine

WORKDIR /usr/src/app

# Install openssl for Prisma
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
