# Base de Conhecimento e Comandos Rápidos

Esta documentação resume os comandos úteis e atalhos de gerenciamento do LexHub. 
Mantenha este arquivo atualizado com novos snippets usados no cotidiano de desenvolvimento.

## 1. Comandos de Manutenção (Local ou VPS)
### Restart Rápido da API (com recarregamento de logs PM2)
```bash
pm2 restart lexhub-api && pm2 logs lexhub-api --lines 50
```

### Limpar Buffer e Derrubar o PM2 Completamente
Caso ocorram erros fantasma em Node:
```bash
pm2 kill
pm2 start src/index.ts --name lexhub-api --interpreter node --node-args="--loader ts-node/esm"
```

## 2. Iniciar Ambiente de Desenvolvimento Local (Mac)
Certifique-se de que está na pasta `lexhub-saas-21`.
```bash
# Sobe o Frontend (Porta 5173 por padrão)
npm run dev

# Sobe o Backend localmente na porta 3005 usando ts-node-dev (ou pm2)
cd api
npm run dev
```

## 3. Integração AI (Modelos Gemini)
O assistente é movido pelo modelo `gemini-2.5-flash` provisionado via API do Google.
Em falhas de limite de cota (Quota Exceeded 429), ative ou peça pro desenvolvedor gerar uma nova `GEMINI_API_KEY` gratuita ou migrar para tier pago.

## 4. Variáveis de Ambiente Essenciais (`.env.production`)
Sempre cheque se o arquivo `.env.production` da VPS contém:
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY`
- `VITE_API_URL` apontando pro domínio correto do Frontend
- `UAZAPI_ADMIN_TOKEN` ou `UAZAPI_TOKEN` e `UAZAPI_BASE_URL` para o Webhook de Instâncias
- `META_VERIFY_TOKEN` (Se estiver rodando Cloud API oficial em paralelo)
- `GEMINI_API_KEY` (Chave Google)
