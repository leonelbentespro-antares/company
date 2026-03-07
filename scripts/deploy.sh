#!/bin/bash

# LexHub Deployment Script (Mac to VPS)
# Este script faz o build do frontend e envia tudo para a VPS via rsync.

VPS_IP="187.77.232.237"
VPS_PATH="/var/www/lexhub"

echo "🎨 Fazendo build do Frontend..."
npm run build

echo "📤 Enviando Frontend para a VPS..."
# Envia o conteúdo da pasta dist/ para a pasta frontend/ da VPS
rsync -avz --delete dist/ root@$VPS_IP:$VPS_PATH/frontend/

echo "📤 Enviando Backend (API) para a VPS..."
# Envia a pasta api/ ignorando node_modules e arquivos desnecessários
rsync -avz --delete --exclude 'node_modules' --exclude 'logs' --exclude 'dist' api/ root@$VPS_IP:$VPS_PATH/api/

echo "⚙️ Configurando variáveis de ambiente na VPS..."
# Copia o .env de produção para a VPS como o .env oficial
scp api/.env.production root@$VPS_IP:$VPS_PATH/api/.env

echo "🚀 Reiniciando serviços na VPS..."
ssh root@$VPS_IP << 'EOF'
    cd /var/www/lexhub/api
    npm install
    npm run build
    pm2 delete lexhub-api || true
    pm2 start dist/index.js --name lexhub-api
    pm2 save
EOF

echo "✅ Deploy finalizado! Acesse http://$VPS_IP"
