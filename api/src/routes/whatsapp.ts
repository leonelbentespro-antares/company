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
                
                // Persistir no banco de dados para garantir visibilidade global
                try {
                    const { handleConnectionEvent } = await import('../services/whatsappService.js');
                    await handleConnectionEvent(tenantId, 'connected', freshQr || '');
                } catch (e) {
                    console.error('[WhatsApp Route] Erro ao persistir conexão detectada por polling:', e);
                }

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

// ============================================================
// DISPOSITIVOS — CRUD via backend (bypass RLS usando supabaseAdmin)
// ============================================================
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

// GET /api/whatsapp/devices — listar dispositivos do tenant
whatsappRouter.get('/devices', authMiddleware, async (req, res) => {
    const tenantId = req.tenantId!;
    try {
        const { data, error } = await supabaseAdmin
            .from('whatsapp_devices')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/whatsapp/devices — criar dispositivo
whatsappRouter.post('/devices', authMiddleware, async (req, res) => {
    const tenantId = req.tenantId!;
    const { name, phone, status, type, batteryLevel, lastActive } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

    try {
        const { data, error } = await supabaseAdmin
            .from('whatsapp_devices')
            .insert({
                tenant_id: tenantId,
                name,
                phone: phone || 'Desconhecido',
                status: status || 'connected',
                type: type || 'qr',
                battery_level: batteryLevel || 100,
                last_active: lastActive || new Date().toISOString(),
            })
            .select()
            .single();
        if (error) throw error;
        console.log(`[WhatsApp Devices] Dispositivo "${name}" criado para tenant ${tenantId}`);
        res.json(data);
    } catch (err: any) {
        console.error('[WhatsApp Devices] Erro ao criar dispositivo:', err);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/whatsapp/devices/:id — atualizar dispositivo
whatsappRouter.patch('/devices/:id', authMiddleware, async (req, res) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const updates = req.body;
    
    try {
        const { error } = await supabaseAdmin
            .from('whatsapp_devices')
            .update({ name: updates.name, phone: updates.phone, status: updates.status })
            .eq('id', id)
            .eq('tenant_id', tenantId);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/whatsapp/devices/:id — remover dispositivo
whatsappRouter.delete('/devices/:id', authMiddleware, async (req, res) => {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    
    try {
        const { error } = await supabaseAdmin
            .from('whatsapp_devices')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/whatsapp/sync-phone — Sincroniza o numero real do WhatsApp conectado via UAZAPI
whatsappRouter.get('/sync-phone', authMiddleware, async (req, res) => {
    const tenantId = req.tenantId!;
    try {
        // Buscar instância da sessão em memória ou direto na UAZAPI
        const session = getSession(tenantId);
        const UAZAPI_BASE_URL = process.env['UAZAPI_BASE_URL'] || 'https://free.uazapi.com';
        const UAZAPI_ADMIN_TOKEN = process.env['UAZAPI_TOKEN'] || '';

        // Buscar instâncias para encontrar o token do tenant
        const listResp = await fetch(`${UAZAPI_BASE_URL}/instance/all`, {
            headers: { 'admintoken': UAZAPI_ADMIN_TOKEN }
        });
        if (!listResp.ok) throw new Error('Falha ao consultar instâncias da UAZAPI');
        
        const instances = await listResp.json();
        const myInstance = Array.isArray(instances)
            ? instances.find((i: any) => i.name === tenantId)
            : null;

        if (!myInstance?.token) {
            return res.json({ phone: null, message: 'Instância não encontrada na UAZAPI' });
        }

        // Buscar status com o token da instância
        const statusResp = await fetch(`${UAZAPI_BASE_URL}/instance/status`, {
            headers: { 'token': myInstance.token }
        });
        if (!statusResp.ok) throw new Error('Falha ao buscar status da instância');
        
        const statusData = await statusResp.json();
        const profilePhone = statusData.instance?.phone || statusData.instance?.profilePhone || null;

        if (profilePhone) {
            // Atualizar no banco
            await supabaseAdmin
                .from('whatsapp_devices')
                .update({ phone: profilePhone })
                .eq('tenant_id', tenantId)
                .eq('status', 'connected');
            
            console.log(`[WhatsApp Sync] Número real atualizado para ${tenantId}: ${profilePhone}`);
        }

        res.json({ phone: profilePhone, instance: myInstance });
    } catch (err: any) {
        console.error('[WhatsApp Sync] Erro:', err.message);
        res.status(500).json({ error: err.message });
    }
});
