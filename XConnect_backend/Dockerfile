# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install deps (INCLUDING prisma CLI)
RUN npm install

# Copy prisma FIRST (QUAN TRỌNG)
COPY prisma ./prisma

# Copy full source
COPY . .

# Generate prisma client
RUN npx prisma generate

# Build app
RUN npm run build


# -------------------
# Production stage
# -------------------
FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./

# chỉ install production deps
RUN npm ci --omit=dev

# copy build output
COPY --from=builder /app/dist ./dist

# copy prisma runtime (QUAN TRỌNG)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

CMD ["node", "dist/main.js"]