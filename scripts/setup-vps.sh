#!/bin/bash

# LexHub VPS Setup Script - Ubuntu 25.10
# Este script configura o ambiente completo para o LexHub rodar em produção.

set -e

echo "🚀 Iniciando configuração do servidor LexHub..."

# 1. Atualizar o Sistema
echo "📦 Atualizando pacotes do sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get upgrade -y

# 2. Instalar dependências básicas
echo "🛠️ Instalando ferramentas básicas..."
apt-get install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx

# 3. Instalar Node.js 20 (LTS)
echo "🟢 Instalando Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 4. Instalar PM2 (Gerenciador de Processos)
echo "🔄 Instalando PM2..."
npm install -g pm2

# 5. Configurar Firewall (UFW)
echo "🛡️ Configurando Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3005
echo "y" | ufw enable

# 6. Criar estrutura de diretórios
echo "📁 Criando diretórios da aplicação..."
mkdir -p /var/www/lexhub/api
mkdir -p /var/www/lexhub/frontend

# 7. Configurar Nginx como Proxy Reverso
echo "🌐 Configurando Nginx..."
cat << 'EOF' > /etc/nginx/sites-available/lexhub
server {
    listen 80;
    server_name _; # Aceita qualquer host (IP ou Domínio)

    # API Backend
    location /api {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket (Socket.io)
    location /socket.io {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Frontend (Arquivos Estáticos)
    location / {
        root /var/www/lexhub/frontend;
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/lexhub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "✅ Configuração da VPS finalizada com sucesso!"
echo "------------------------------------------------"
echo "Próximos passos:"
echo "1. Enviar os arquivos da API para /var/www/lexhub/api"
echo "2. Enviar o build do Frontend para /var/www/lexhub/frontend"
echo "3. Configurar o .env na VPS"
echo "4. Rodar 'pm2 start src/index.ts --name lexhub-api'"
echo "------------------------------------------------"