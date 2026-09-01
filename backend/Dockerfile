# ---------- Stage 1: dependências ----------
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# ---------- Stage 2: imagem final ----------
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Usuário não-root — não rodar a aplicação como root dentro do container.
RUN addgroup -S almox && adduser -S almox -G almox

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY db ./db

USER almox
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
