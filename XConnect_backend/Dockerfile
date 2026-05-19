FROM node:24-alpine AS builder

WORKDIR /app

# Cài đặt pnpm
RUN npm install -g pnpm

# Copy file package + npmrc
COPY package.json pnpm-lock.yaml .npmrc ./

# Cài đặt toàn bộ dependencies (bao gồm devDependencies để build)
RUN pnpm install --frozen-lockfile

# Copy toàn bộ source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build ứng dụng NestJS
RUN pnpm run build

# ==========================================
# Giai đoạn 2: Production (Image siêu nhẹ)
# ==========================================
FROM node:24-alpine

WORKDIR /app

# Cài đặt pnpm
RUN npm install -g pnpm

# Copy file package + npmrc
COPY package.json pnpm-lock.yaml .npmrc ./

# Chỉ cài đặt production dependencies để giảm dung lượng
RUN pnpm install --prod --frozen-lockfile

# Copy thư mục prisma và generate lại client (rất quan trọng)
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

# Copy thư mục dist (code đã build) từ giai đoạn builder
COPY --from=builder /app/dist ./dist

# Port mặc định
EXPOSE 8080

# Chạy ứng dụng
CMD ["node", "dist/src/main.js"]
