import { Router } from 'express';
import QRCode from 'qrcode';
import { startWhatsAppSession, getSession, getQR, logoutSession } from '../services/whatsappService.js';
import { verifySupabaseJWT, extractTenant } from '../middleware/security.js';

export const whatsappRouter = Router();

// Endpoint to start/request a session for a tenant
whatsappRouter.post('/start', async (req, res) => {
    // Revertido temporariamente para req.body para teste sem banco configurado localmente
    const tenantId = req.body.tenantId;

    if (!tenantId) {
        return res.status(401).json({ error: 'TenantId não autorizado ou ausente.' });
    }

    try {
        await startWhatsAppSession(tenantId);
        res.json({ success: true, message: 'Processo de sessão iniciado.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to get the connection status or QR Code
// Revertido para usar o param da URL para testes
whatsappRouter.get('/status/:tenantId', async (req, res) => {
    const { tenantId } = req.params;

    const session = getSession(tenantId);
    const qrText = getQR(tenantId);

    if (!session) {
        return res.json({ status: 'Disconnected' });
    }

    if (qrText) {
        try {
            const qrBase64 = await QRCode.toDataURL(qrText);
            return res.json({ status: 'QR_READY', qr: qrBase64 });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to generate QR DataURL' });
        }
    }

    // Verify if auth exists
    const isConnected = !!session.authState?.creds?.me;
    
    if (isConnected) {
        return res.json({ 
            status: 'Connected', 
            user: session.authState?.creds?.me 
        });
    }

    res.json({ status: 'Connecting' });
});

// Endpoint to disconnect
whatsappRouter.post('/logout', (req, res) => {
    const tenantId = req.body.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Não autorizado.' });

    logoutSession(tenantId);
    res.json({ success: true, message: 'Desconectado com sucesso.' });
});
