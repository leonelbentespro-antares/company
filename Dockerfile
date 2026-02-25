FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Servidor estático ultra-rápido para o Frontend compilado (SPA)
FROM nginx:alpine

# Copia os arquivos compilados do Vite
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Configuração simples do NGINX pra SPA (redirecionar tudo para index.html)
RUN echo "server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files \$uri \$uri/ /index.html; \
    } \
    }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
