import { Router } from 'express';
import QRCode from 'qrcode';
import { startWhatsAppSession, getSession, getQR, logoutSession, getInstanceStatus, qrCodes } from '../services/whatsappService.js';
import { emitToTenant } from '../socket/index.js';
import { verifySupabaseJWT, extractTenant } from '../middleware/security.js';

export const whatsappRouter = Router();

// Endpoint to start/request a session for a tenant
whatsappRouter.post('/start', async (req, res) => {
    const { tenantId, phone } = req.body;

    if (!tenantId) {
        return res.status(401).json({ error: 'TenantId não autorizado ou ausente.' });
    }

    try {
        await startWhatsAppSession(tenantId, phone);
        res.json({ success: true, message: 'Processo de sessão iniciado via uazapiGO V2.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to get the connection status or QR Code
whatsappRouter.get('/status/:tenantId', async (req, res) => {
    const { tenantId } = req.params;

    const session = getSession(tenantId);
    let qrText = getQR(tenantId);

    if (!session) {
        return res.json({ status: 'Disconnected' });
    }

    // Se está em Connecting, tenta buscar QR/PairCode atualizado via GET /instance/status (V2)
    if (session.status === 'Connecting' && session.token && !qrText) {
        try {
            const statusResp = await getInstanceStatus(session.token);
            const instanceStatus = statusResp.instance?.status;
            const freshQr = statusResp.instance?.qrcode;
            const freshPair = statusResp.instance?.paircode;

            if (instanceStatus === 'connected') {
                session.status = 'Connected';
                qrCodes.delete(tenantId);
                emitToTenant(tenantId, 'whatsapp:connected', { status: 'Connected' });
            } else if (freshQr) {
                qrText = freshQr;
                qrCodes.set(tenantId, freshQr);
                session.status = 'QR_READY';
            } else if (freshPair) {
                qrText = freshPair;
                qrCodes.set(tenantId, freshPair);
                session.status = 'PAIR_CODE_READY';
            }
        } catch (e) {
            console.warn(`[WhatsApp] Falha ao consultar status V2 para ${tenantId}:`, e);
        }
    }

    if (session.status === 'PAIR_CODE_READY' && qrText) {
        return res.json({ status: 'PAIR_CODE_READY', paircode: qrText });
    }

    if (qrText) {
        try {
            // uazapiGO V2 pode retornar QR como base64 data URI
            if (qrText.startsWith('data:image')) {
                return res.json({ status: 'QR_READY', qr: qrText });
            }
            
            const qrBase64 = await QRCode.toDataURL(qrText);
            return res.json({ status: 'QR_READY', qr: qrBase64 });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to generate QR DataURL' });
        }
    }

    if (session.status === 'Connected') {
        return res.json({ 
            status: 'Connected', 
            user: { id: tenantId, name: tenantId }
        });
    }

    res.json({ status: session.status || 'Connecting' });
});

// Endpoint to disconnect
whatsappRouter.post('/logout', async (req, res) => {
    const tenantId = req.body.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Não autorizado.' });

    await logoutSession(tenantId);
    res.json({ success: true, message: 'Desconectado com sucesso.' });
});

