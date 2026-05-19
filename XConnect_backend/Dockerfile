FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

# COPY prisma TRƯỚC
COPY prisma ./prisma
COPY . .

# generate ở builder stage
RUN npx prisma generate

RUN npm run build


FROM node:22-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/keys ./keys

EXPOSE 8080
CMD ["node", "dist/src/main.js"]