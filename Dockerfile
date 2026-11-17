# ---- 构建阶段：安装依赖并构建前端 ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json

RUN npm --prefix server install --omit=dev --no-audit --no-fund \
 && npm --prefix web install --no-audit --no-fund

COPY . .
RUN npm --prefix web run build

# ---- 运行阶段：只带服务端与构建产物 ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server ./server
COPY --from=builder /app/web/dist ./web/dist

# 演示数据在首次启动时自动生成；生产可挂载 /app/server/data 持久化
VOLUME ["/app/server/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/index.js"]
