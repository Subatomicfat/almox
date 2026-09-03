# ---------- Stage 1: build ----------
FROM node:18-alpine AS build
WORKDIR /app

# IMPORTANTE: variáveis VITE_* são embutidas no bundle NO MOMENTO DO BUILD
# (Vite não lê process.env em runtime dentro do navegador). Por isso a
# URL da API entra como build ARG, não como variável de ambiente do
# container em execução — mudar isso depois do build exige rebuildar.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
