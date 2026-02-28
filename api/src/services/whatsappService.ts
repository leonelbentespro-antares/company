import { emitToTenant } from '../socket/index.js';
import { uploadFileToR2, getSecureFileUrl } from './storage/cloudflareR2Service.js';

const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com';
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_TOKEN || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://lexhub.company/api/webhooks/uazapi';

// Em memória temporária (Para produção seria ideal usar Redis / Supabase)
export const sessions = new Map<string, { tenantId: string; token: string; status: string }>();
export const qrCodes = new Map<string, string>(); // tenantId -> current QR or PairCode

/**
 * Faz requisições HTTP para a uazapiGO V2.
 */
export async function uazapiFetch(endpoint: string, method = 'GET', body?: any, token?: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    if (token) {
        headers['token'] = token;
    } else if (UAZAPI_ADMIN_TOKEN) {
        headers['admintoken'] = UAZAPI_ADMIN_TOKEN;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const options: RequestInit = {
            method,
            headers,
            signal: controller.signal
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(`${UAZAPI_BASE_URL}${endpoint}`, options);
        clearTimeout(timeout);
        
        console.log(`[UAZAPI V2 Debug] ${method} ${endpoint} - Status: ${res.status}`);

        if (!res.ok) {
            let err;
            try {
                err = await res.json();
            } catch {
                err = await res.text();
            }
            console.error(`[UAZAPI V2 ERROR] ${method} ${endpoint}:`, err);
            throw new Error(typeof err === 'string' ? err : (err.error || err.message || JSON.stringify(err)));
        }
        
        const data = await res.json();
        console.log(`[UAZAPI V2 Debug] ${method} ${endpoint} - Response Payload:`, JSON.stringify(data).substring(0, 200));
        return data;
    } catch (e: any) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') {
            console.error(`[UAZAPI V2 ERROR] Timeout na requisição ${method} ${endpoint}`);
            throw new Error('Timeout na comunicação com uazapiGO');
        }
        throw e;
    }
}

/**
 * Inicia ou retoma uma sessão WhatsApp para o tenant.
 * Fluxo V2: /instance/init -> /webhook -> /instance/connect
 */
export async function startWhatsAppSession(tenantId: string, phone?: string) {
    console.log(`[WhatsApp] Iniciando instância V2 para tenant ${tenantId} (phone: ${phone || 'QR'})...`);

    // 1. Obter Token (Criar ou buscar existente)
    let instanceToken: string | undefined;
    
    try {
        const initResp = await uazapiFetch('/instance/init', 'POST', { name: tenantId });
        instanceToken = initResp.instance?.token || initResp.token;
    } catch (e) {
        // Se falhar, tenta buscar na lista
        const instances = await uazapiFetch('/instance/all', 'GET');
        const existing = Array.isArray(instances) ? instances.find((i: any) => i.name === tenantId) : null;
        if (existing) instanceToken = existing.token;
    }

    if (!instanceToken) {
        throw new Error(`Não foi possível inicializar instância para ${tenantId}`);
    }

    // Inicializar objeto de sessão
    const sessionData = { tenantId, token: instanceToken, status: 'Connecting' };
    sessions.set(tenantId, sessionData);

    // 2. Configurar Webhook
    try {
        await uazapiFetch('/webhook', 'POST', {
            enabled: true,
            url: WEBHOOK_URL,
            events: ['messages', 'connection', 'messages_update'],
            addUrlEvents: true
        }, instanceToken);
    } catch (e) {
        console.warn(`[WhatsApp] Falha ao configurar webhook para ${tenantId}`);
    }

    // 3. Conectar (QR ou Pair Code)
    try {
        const connectBody = phone ? { phone } : {};
        const connectResponse = await uazapiFetch('/instance/connect', 'POST', connectBody, instanceToken);
        
        let qrcode = connectResponse.instance?.qrcode || connectResponse.qrcode;
        let paircode = connectResponse.instance?.paircode || connectResponse.paircode;

        // uazapiGO V2 logic: If QR is not ready immediately, wait and poll status for a few seconds
        if (!qrcode && !paircode && connectResponse.instance?.status !== 'connected') {
            console.log(`[WhatsApp] QR não veio no connect. Iniciando polling de status para ${tenantId}...`);
            for (let i = 0; i < 5; i++) { // Tenta 5 vezes (10 segundos total)
                await new Promise(r => setTimeout(r, 2000));
                const statusData = await getInstanceStatus(instanceToken);
                qrcode = statusData.instance?.qrcode || statusData.qrcode;
                paircode = statusData.instance?.paircode || statusData.paircode;
                
                if (qrcode || paircode) {
                    console.log(`[WhatsApp] QR/PairCode obtido via polling após ${i+1} tentativas.`);
                    break;
                }
                
                if (statusData.instance?.status === 'connected') {
                    console.log(`[WhatsApp] Instância ${tenantId} conectou durante o polling.`);
                    break;
                }
            }
        }

        if (qrcode) {
            qrCodes.set(tenantId, qrcode);
            sessionData.status = 'QR_READY';
            emitToTenant(tenantId, 'qr:update', { qr: qrcode, status: 'QR_READY' });
        } else if (paircode) {
            qrCodes.set(tenantId, paircode);
            sessionData.status = 'PAIR_CODE_READY';
            emitToTenant(tenantId, 'qr:update', { paircode, status: 'PAIR_CODE_READY' });
        } else if (connectResponse.instance?.status === 'connected') {
            sessionData.status = 'Connected';
            emitToTenant(tenantId, 'whatsapp:connected', { status: 'Connected' });
        } else {
            console.warn(`[WhatsApp] Timeout ou falha ao gerar QR para ${tenantId}.`);
            emitToTenant(tenantId, 'qr:error', { message: 'Timeout ao gerar QR Code' });
        }
    } catch (e) {
        console.error(`[WhatsApp] Erro ao conectar instância ${tenantId}:`, e);
    }

    return sessionData;
}

/**
 * Consulta o status atual da instância.
 */
export async function getInstanceStatus(instanceToken: string) {
    return uazapiFetch('/instance/status', 'GET', undefined, instanceToken);
}

/**
 * Envia mensagem de texto via POST /send/text.
 */
export async function sendTextMessage(instanceToken: string, number: string, text: string) {
    return uazapiFetch('/send/text', 'POST', { number, text }, instanceToken);
}

/**
 * Envia mídia.
 */
export async function sendMediaMessage(
    instanceToken: string,
    number: string,
    mediaUrl: string,
    caption?: string,
    mediaType: string = 'image'
) {
    return uazapiFetch('/send/media', 'POST', {
        number,
        mediaUrl,
        caption: caption || '',
        mediaType
    }, instanceToken);
}

export function getSession(tenantId: string) {
    return sessions.get(tenantId);
}

export function getQR(tenantId: string) {
    return qrCodes.get(tenantId);
}

/**
 * Desconecta a instância.
 */
export async function logoutSession(tenantId: string) {
    const session = sessions.get(tenantId);
    if (!session) return;
    
    try {
        await uazapiFetch('/instance/disconnect', 'POST', {}, session.token);
    } catch (e) {
        console.error(`[WhatsApp] Falha ao desconectar tenant ${tenantId}:`, e);
    }
    
    sessions.delete(tenantId);
    qrCodes.delete(tenantId);
}
