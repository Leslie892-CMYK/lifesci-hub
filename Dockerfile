# 多阶段构建：先构建前端，再以最小依赖运行
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server/index.js"]
