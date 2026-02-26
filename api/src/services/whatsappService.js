import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { emitToTenant } from '../socket/index.js';
const sessionsDir = path.join(process.cwd(), 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}
export const sessions = new Map();
export const qrCodes = new Map(); // tenantId -> current QR
const logger = pino({ level: 'silent' });
export async function startWhatsAppSession(tenantId) {
    if (sessions.has(tenantId)) {
        console.log(`[WhatsApp] Session for ${tenantId} already exists.`);
        return;
    }
    const sessionPath = path.join(sessionsDir, tenantId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: true, // For debugging in server console
        auth: state,
        browser: Browsers.macOS('Desktop'),
    });
    sessions.set(tenantId, sock);
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log(`[WhatsApp] New QR generated for ${tenantId}`);
            qrCodes.set(tenantId, qr);
            // 🔌 Emitir QR em tempo real via Socket.io (substitui o polling)
            try {
                const QRCode = await import('qrcode');
                const qrBase64 = await QRCode.default.toDataURL(qr);
                emitToTenant(tenantId, 'qr:update', { qr: qrBase64, status: 'QR_READY' });
            }
            catch (e) {
                console.error('[WhatsApp] Erro ao gerar QR base64:', e);
            }
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WhatsApp] Connection closed for ${tenantId}. Reconnect: ${shouldReconnect}`);
            if (shouldReconnect) {
                sessions.delete(tenantId);
                setTimeout(() => startWhatsAppSession(tenantId), 5000);
            }
            else {
                console.log(`[WhatsApp] ${tenantId} logged out.`);
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                }
                sessions.delete(tenantId);
                qrCodes.delete(tenantId);
            }
        }
        else if (connection === 'open') {
            console.log(`[WhatsApp] Connection OPEN for ${tenantId}`);
            qrCodes.delete(tenantId);
            // 🔌 Notificar frontend em tempo real que o WhatsApp conectou
            emitToTenant(tenantId, 'whatsapp:connected', {
                status: 'Connected',
                user: sock.authState?.creds?.me,
            });
        }
    });
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message) {
                    const textBody = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                    if (textBody) {
                        console.log(`[WhatsApp ${tenantId}] Msg from ${msg.key.remoteJid}: "${textBody}"`);
                        // Aqui você vai se conectar aos BullMQ workers ou fluxo RAG futuramente
                    }
                }
            }
        }
    });
    return sock;
}
export function getSession(tenantId) {
    return sessions.get(tenantId);
}
export function getQR(tenantId) {
    return qrCodes.get(tenantId);
}
export function logoutSession(tenantId) {
    const session = sessions.get(tenantId);
    if (session) {
        session.logout();
        sessions.delete(tenantId);
        qrCodes.delete(tenantId);
    }
}
//# sourceMappingURL=whatsappService.js.map