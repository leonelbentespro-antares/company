/**
 * ============================================================
 * LEXHUB SAAS — API GATEWAY (CORE SERVICE)
 * Versão Segura com Proteção Multi-Camada
 * ============================================================
 */

import express from 'express';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 3001;

// ============================================================
// CAMADA 1: MIDDLEWARES DE SEGURANÇA (Ordem importa!)
// ============================================================

import {
    configureHelmet,
    configureCors,
    configureRateLimit,
} from './middleware/security.js';

import {
    ipBlacklistGuard,
    registerHoneypotRoutes,
    anomalyDetector,
} from './middleware/threatDetector.js';

// 1a. Helmet — Headers de segurança HTTP (deve vir antes de tudo)
app.use(configureHelmet());

// 1b. CORS — Somente origins autorizadas
app.use(configureCors());

// 1c. Blacklist de IPs — Bloquear atacantes conhecidos imediatamente
app.use(ipBlacklistGuard);

// 1d. Rate Limiting global
app.use(configureRateLimit());

// 1e. Parse do body (necessário antes dos honeypots capturarem o body)
app.use(express.json({ limit: '1mb' })); // Limitar tamanho do payload
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 1f. Detector de anomalias (monitora códigos de resposta)
app.use(anomalyDetector);

// ============================================================
// CAMADA 2: HONEYPOT ROUTES (ANTES das rotas legítimas!)
// Qualquer acesso a estas URLs é um atacante/scanner
// ============================================================

registerHoneypotRoutes(app);

// ============================================================
// CAMADA 3: WORKERS DO BULLMQ (Ativos)
// ============================================================

import './workers/whatsappWorker.js';
import './workers/documentWorker.js';

// ============================================================
// CAMADA 4: ROTAS LEGÍTIMAS COM PROTEÇÃO JWT
// ============================================================

import { webhookRouter } from './routes/webhooks.js';
// import { aiRouter } from './routes/ai.js';
import { adminRouter } from './routes/admin.js';
import { whatsappRouter } from './routes/whatsapp.js';
import { integrationsRouter } from './routes/integrations.js';
import { initSocketIO } from './socket/index.js';

// Inicializar Socket.IO no servidor HTTP compartilhado
initSocketIO(httpServer);

// Webhooks da Meta: validação HMAC própria (não usa JWT)
app.use('/webhooks', webhookRouter);

// Rotas da API: exigem JWT válido + tenant extraído
// O middleware de auth é aplicado dentro de cada router
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/integrations', integrationsRouter);
// app.use('/api', aiRouter);

// Rota de admin para visualizar alertas de segurança (uso interno)
app.use('/internal', adminRouter);

// ============================================================
// HEALTH CHECK (público — sem autenticação)
// ============================================================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'lexhub-core-api',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================
// HANDLER 404 — Registrar tentativas em caminhos desconhecidos
// ============================================================

app.use((req, res) => {
    // Paths desconhecidos aumentam o score de ameaça do IP
    console.log(`[404] ${req.method} ${req.path} — IP: ${req.ip}`);
    res.status(404).json({ error: 'Rota não encontrada.', code: 'NOT_FOUND' });
});

// ============================================================
// HANDLER DE ERROS GLOBAIS
// ============================================================

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.message?.includes('Origin não autorizada')) {
        return res.status(403).json({ error: 'CORS: origem não permitida.', code: 'CORS_ERROR' });
    }
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Erro interno do servidor.', code: 'INTERNAL_ERROR' });
});

// ============================================================
// START
// ============================================================

httpServer.listen(port, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║       LexHub Core API — Modo Seguro          ║
║  Endpoint: http://localhost:${port}             ║
║  WebSocket: ws://localhost:${port}              ║
║  CORS: ${(process.env.ALLOWED_ORIGINS || 'localhost:5173').substring(0, 30)}  ║
║  Honeypots: ATIVOS                           ║
║  Threat Detection: ATIVO                    ║
╚══════════════════════════════════════════════╝
`);
});
