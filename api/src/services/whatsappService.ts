import { emitToTenant } from '../socket/index.js';
import { supabaseAdmin } from '../config/supabase.js';
import { uploadFileToR2, getSecureFileUrl } from './storage/cloudflareR2Service.js';
const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com';
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_TOKEN || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://187.77.232.237/api/webhooks/uazapi';

// Em memória temporária (Para produção seria ideal usar Redis / Supabase)
export const sessions = new Map<string, { tenantId: string; token: string; status: string }>();
export const qrCodes = new Map<string, string>(); // tenantId -> current QR or PairCode

/**
 * Faz requisições HTTP para a uazapiGO V2.
 * IMPORTANTE: Esta conta UAZAPI usa AdminToken em TODOS os endpoints.
 * O token de instância individual não funciona neste plano.
 */
export async function uazapiFetch(endpoint: string, method = 'GET', body?: any, _instanceToken?: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'AdminToken': UAZAPI_ADMIN_TOKEN,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

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
            console.error(`[UAZAPI V2 ERROR] ${method} ${endpoint} - Status: ${res.status}, Error:`, err);
            throw new Error(typeof err === 'string' ? err : (err.error || err.message || JSON.stringify(err)));
        }
        
        const data = await res.json();
        console.log(`[UAZAPI V2 Debug] ${method} ${endpoint} - Response Payload:`, JSON.stringify(data).substring(0, 300));
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
            url: WEBHOOK_URL, // Using the imported WEBHOOK_URL
            events: ['messages', 'connection', 'messages_update'],
            addUrlEvents: false
        }, instanceToken);
    } catch (e) {
        console.warn(`[WhatsApp] Falha ao configurar webhook para ${tenantId}`);
    }
    // 3. Conectar (QR ou Pair Code)
    try {
        console.log(`[WhatsApp] Chamando /instance/connect para ${tenantId}...`);
        const connectBody = phone ? { phone } : {};
        const connectResponse = await uazapiFetch('/instance/connect', 'POST', connectBody, instanceToken);
        console.log(`[WhatsApp] Resposta /instance/connect:`, JSON.stringify(connectResponse).substring(0, 200));

        
        let qrcode = connectResponse.instance?.qrcode || connectResponse.qrcode;
        let paircode = connectResponse.instance?.paircode || connectResponse.paircode;

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
            // Se não veio de primeira, fazemos o polling em BACKGROUND para não travar a requisição POST
            console.log(`[WhatsApp] QR não veio no connect. Iniciando polling em background para ${tenantId}...`);
            (async () => {
                try {
                    for (let i = 0; i < 6; i++) { // Tenta por ~12 segundos
                        await new Promise(r => setTimeout(r, 2000));
                        const statusData = await getInstanceStatus(instanceToken!);
                        const bQr = statusData.instance?.qrcode || statusData.qrcode;
                        const bPair = statusData.instance?.paircode || statusData.paircode;
                        
                        if (bQr) {
                            console.log(`[WhatsApp] Polling background encontrou QR para ${tenantId}. Emitindo para frontend...`);
                            qrCodes.set(tenantId, bQr);
                            sessionData.status = 'QR_READY';
                            emitToTenant(tenantId, 'qr:update', { qr: bQr, status: 'QR_READY' });
                            return;
                        }
                        if (bPair) {
                            qrCodes.set(tenantId, bPair);
                            sessionData.status = 'PAIR_CODE_READY';
                            emitToTenant(tenantId, 'qr:update', { paircode: bPair, status: 'PAIR_CODE_READY' });
                            return;
                        }
                        if (statusData.instance?.status === 'connected') {
                            sessionData.status = 'Connected';
                            emitToTenant(tenantId, 'whatsapp:connected', { status: 'Connected' });
                            return;
                        }
                    }
                    // Se chegou aqui, deu timeout
                    sessionData.status = 'Failed';
                    console.warn(`[WhatsApp] Timeout ao gerar QR para ${tenantId}.`);
                    emitToTenant(tenantId, 'qr:error', { message: 'Timeout ao gerar QR Code. Tente novamente.' });
                } catch (err) {
                    sessionData.status = 'Failed';
                    console.error(`[WhatsApp] Erro no polling background para ${tenantId}:`, err);
                }
            })();
        }
    } catch (e) {
        sessionData.status = 'Failed';
        console.error(`[WhatsApp] Erro ao conectar instância ${tenantId}:`, e);
        throw e;
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
    if (!session || !session.token) {
        sessions.delete(tenantId);
        qrCodes.delete(tenantId);
        return;
    }
    
    try {
        await uazapiFetch('/instance/logout', 'DELETE', {}, session.token);
    } catch (e) {
        console.warn(`[WhatsApp] Falha ao fazer logout remoto para ${tenantId}:`, e);
    }
    
    sessions.delete(tenantId);
    qrCodes.delete(tenantId);
    emitToTenant(tenantId, 'whatsapp:disconnected', { status: 'Disconnected' });
}

/**
 * Handle incoming connection events from webhooks to persist the session via Supabase directly.
 */
export async function handleConnectionEvent(tenantId: string, status: string, phone: string = '') {
    if (status === 'connected' || status === 'open') {
        const session = sessions.get(tenantId);
        if (session) {
            session.status = 'Connected';
            qrCodes.delete(tenantId);
            emitToTenant(tenantId, 'whatsapp:connected', { status: 'Connected' });
        }
        
        // Assegurar que o dispositivo está no Supabase via service role (backend-side)
        try {
            console.log(`[WhatsAppService] Inserindo/Confirmando conexão do tenant ${tenantId} no banco de dados...`);
            
            // Verifica se já existe um dispositivo conectado com esse tenant
            const { data: existing } = await supabaseAdmin
                .from('whatsapp_devices')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (!existing || existing.length === 0) {
                 await supabaseAdmin.from('whatsapp_devices').insert({
                    tenant_id: tenantId,
                    name: `WhatsApp ${phone || tenantId}`,
                    phone: phone || 'Desconhecido',
                    status: 'connected',
                    type: 'qr',
                    battery_level: 100,
                    last_active: new Date().toISOString()
                });
            } else {
                 await supabaseAdmin.from('whatsapp_devices')
                    .update({ 
                        status: 'connected', 
                        phone: phone || existing[0].phone,
                        last_active: new Date().toISOString()
                    })
                    .eq('id', existing[0].id);
            }
        } catch(e) {
            console.error('[WhatsAppService] Erro ao persistir conexão no banco via webhook:', e);
        }
    } else if (status === 'disconnected' || status === 'close') {
         const session = sessions.get(tenantId);
         
         // A UAZAPI V2 às vezes envia um webhook de "disconnected" imediatamente após /instance/connect
         // Se a sessão está no meio do processo de gerar QR/Pair, ignoramos esse evento para não cancelar a conexão
         if (session && (session.status === 'QR_READY' || session.status === 'PAIR_CODE_READY' || session.status === 'Connecting')) {
             console.log(`[WhatsAppService] Ignorando evento de desconexão para o tenant ${tenantId} pois está em processo de ${session.status}.`);
             return; // Interrompe para não apagar as variáveis em memória
         }

         sessions.delete(tenantId);
         qrCodes.delete(tenantId);

         try {
             await supabaseAdmin.from('whatsapp_devices')
                .update({ status: 'disconnected' })
                .eq('tenant_id', tenantId);
         } catch(e) {}
    }
}
