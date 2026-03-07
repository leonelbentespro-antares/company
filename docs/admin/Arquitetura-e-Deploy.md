# Arquitetura e Deploy do LexHub SaaS

Este documento serve como guia definitivo de arquitetura e implantação para a sustentação do LexHub SaaS.

## 1. Visão Geral da Arquitetura
O LexHub é uma aplicação Web SaaS Multi-Tenant construída com:
- **Frontend:** React + Vite, TailwindCSS
- **Backend:** Node.js, Express (API Core)
- **Realtime:** Socket.IO para chat em tempo real multi-tenant
- **Database / Auth:** Supabase (PostgreSQL + RLS + GoTrue)
- **Serviços Externos:** 
  - UAZAPI V2 (Integração WhatsApp Web via QR)
  - NotificaMe Hub (Fila/Disparos)
  - Meta Cloud API (WhatsApp Business oficial)
  - Gemini API (Inteligência Artificial Nativa)

## 2. Padrões de Multi-Tenant e Isolamento
Todas as ações no backend exigem validação de `tenant_id`.
Os Sockets ingressam em salas específicas no formato `tenant:ID_DO_TENANT`, garantindo que os webhooks emitam mensagens e status de conexões APENAS para as telas dos usuários responsáveis por aquela conta.

## 3. Fluxo de Deploy
O deploy atual é construído via script para uma VPS gerenciada por PM2. 

### Comando Principal
Para realizar deploy manual sem CI/CD (da máquina local do desenvolvedor para a VPS):
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### O que o Deploy faz?
1. Executa `npm run build` no Frontend localmente para gerar a pasta `dist`.
2. Faz o upload da pasta `dist` (Frontend) para `/var/www/lexhub/frontend/` via Rsync.
3. Faz o upload da pasta `api` (Backend source) via Rsync.
4. Conecta via SSH na VPS, instala dependências (incluindo `ts-node` e `typescript` nativos) e reinicia o serviço via `pm2 restart lexhub-api`.

## 4. Gerenciamento do Servidor (VPS)
- **Módulo gerenciador:** PM2.
- **Visualização de Logs ao vivo (Backend):** 
  `pm2 logs lexhub-api --lines 100`
- **Checagem de erros críticos:** 
  `cat /root/.pm2/logs/lexhub-api-error.log`

## 5. Webhooks e DNS (Cloudflare)
- A comunicação entre os Gateways externos (UAZAPI, Meta) e o LexHub se dá obrigatoriamente via HTTPS.
- Mantenha na Cloudflare a configuração DNS restrita para Always Use HTTPS. O backend local na VPS atende internamente na porta 3005 e é roteado silenciosamente pelo NGINX presente na máquina. 
