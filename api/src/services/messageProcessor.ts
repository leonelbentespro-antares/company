import { supabaseAdmin as supabase } from '../config/supabase.js';
import { emitToTenant } from '../socket/index.js';
import { getAIResponse } from './aiService.js';
import { whatsappOutgoingQueue } from '../queues/whatsapp.js';
import { uploadMediaToSupabase } from './storage/supabaseStorageService.js';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import fs from 'fs'; 

const UUID_NAMESPACE = '6b86b273-ed4c-4a31-9ead-ce403b544b35';

const UAZAPI_BASE_URL = process.env['UAZAPI_BASE_URL'] || 'https://free.uazapi.com';
const UAZAPI_TOKEN = process.env['UAZAPI_TOKEN'] || '';

/**
 * Baixa a mídia de uma mensagem UAZAPI e faz upload para o Cloudflare R2
 * Usa /message/download com o messageId e o token da instância
 */
async function downloadAndStoreMedia(
    messageId: string,
    instanceToken: string,
    mediaType: string,
    tenantId: string
): Promise<string> {
    const maxRetries = 6;
    let attempt = 0;

    console.log(`[Media-Debug] Aguardando 5s iniciais para a mídia ${messageId} (Token: ${instanceToken ? 'Ok' : 'VAZIO!'})...`);
    await new Promise(r => setTimeout(r, 5000));

    while (attempt < maxRetries) {
        attempt++;
        try {
            console.log(`[Media-Debug] Tentativa ${attempt}/${maxRetries} para ID: ${messageId}`);

            const downloadUrl = `${UAZAPI_BASE_URL}/message/download`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000);

            const resp = await fetch(downloadUrl, {
                method: 'POST',
                headers: {
                    'token': instanceToken,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                body: JSON.stringify({ id: messageId }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            let data: any = null;
            if (resp.ok) {
                const contentType = resp.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    data = await resp.json();
                }
            } else if (resp.status === 503 || resp.status === 404 || resp.status === 401 || resp.status >= 500) {
                // Tentar via CURL como fallback se o fetch falhar
                console.log(`[Media-Debug] Tentando fallback CURL para ID: ${messageId} (Status: ${resp.status})...`);
                try {
                    const { execSync } = await import('child_process');
                    const cleanToken = String(instanceToken).trim();
                    const cmd = `curl -s -X POST "${downloadUrl}" -H "Content-Type: application/json" -H "token: ${cleanToken}" -d '{"id": "${messageId}"}'`;
                    const result = execSync(cmd).toString().trim();
                    console.log(`[Media-Debug] Resposta Bruta CURL: ${result}`);
                    data = JSON.parse(result);
                    console.log(`[Media-Debug] Fallback CURL parseado com sucesso!`);
                } catch (curlErr: any) {
                    console.warn(`[Media-Debug] Fallback CURL também falhou ou JSON inválido:`, curlErr.message);
                }
            }

            if (data) {
                const base64Data = data.base64 || data.data || data.media;
                const fileURL = data.fileURL || data.url || data.URL;
                
                if (!base64Data && !fileURL) {
                    console.warn(`[Media-Debug] Resposta JSON sem mídia (Tentativa ${attempt}):`, JSON.stringify(data));
                } else {
                    console.log(`[Media-Debug] Mídia detectada no JSON (Fallback CURL ou Fetch)!`);
                    let buffer: Buffer | null = null;
                    let mime = data.mimetype || data.mimeType || 'application/octet-stream';

                    if (base64Data) {
                        const clean = base64Data.replace(/^data:[^;]+;base64,/, '');
                        buffer = Buffer.from(clean, 'base64');
                    } else if (fileURL) {
                        console.log(`[Media-Debug] Baixando binário da URL: ${fileURL.substring(0, 50)}...`);
                        const fileResp = await fetch(fileURL, {
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                        });
                        if (fileResp.ok) {
                            buffer = Buffer.from(await fileResp.arrayBuffer());
                            mime = fileResp.headers.get('content-type') || mime;
                        } else {
                            console.warn(`[Media-Debug] Fetch binário falhou (${fileResp.status}). Tentando CURL...`);
                            try {
                                const { execSync } = await import('child_process');
                                // Usar curl para salvar em um buffer temporário ou ler da stdout
                                // -L segue redirecionamentos, importante para URLs de CDN
                                const binaryCmd = `curl -sL "${fileURL}" -H "User-Agent: Mozilla/5.0"`;
                                buffer = execSync(binaryCmd, { maxBuffer: 50 * 1024 * 1024 }); // Limite de 50MB
                                console.log(`[Media-Debug] ✅ Sucesso no download binário via CURL!`);
                            } catch (curlBinErr: any) {
                                console.error(`[Media-Debug] ❌ Fallback CURL binário falhou:`, curlBinErr.message);
                            }
                        }
                    }

                    if (buffer) {
                        let ext = 'bin';
                        if (mime.includes('ogg')) ext = 'ogg';
                        else if (mime.includes('mpeg')) ext = 'mp3';
                        else if (mime.includes('audio/mp4')) ext = 'm4a';
                        else if (mime.includes('image/jpeg')) ext = 'jpg';
                        else if (mime.includes('video/mp4')) ext = 'mp4';
                        else ext = mime.split('/')[1] || 'bin';

                        const url = await uploadMediaToSupabase(buffer, `media_${messageId}.${ext}`, tenantId, mime);
                        console.log(`[Media-Debug] ✅ Sucesso final (Attempt ${attempt}): ${url}`);
                        return url;
                    }
                }
            }

            const delay = (attempt <= 2) ? 5000 : 10000;
            console.log(`[Media-Debug] Mídia não pronta ou servidor instável. Esperando ${delay/1000}s...`);
            await new Promise(r => setTimeout(r, delay));

        } catch (err: any) {
            console.error(`[Media-Debug] Erro crítico na tentativa ${attempt}:`, err.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    return '';
}

// Cache de tokens por instância para evitar listar todas as instâncias toda vez
const instanceTokenCache = new Map<string, string>();

async function getInstanceToken(instanceName: string): Promise<string> {
    if (instanceTokenCache.has(instanceName)) return instanceTokenCache.get(instanceName)!;

    try {
        const resp = await fetch(`${UAZAPI_BASE_URL}/instance/all`, {
            headers: { 'admintoken': UAZAPI_TOKEN }
        });
        if (!resp.ok) return '';
        const instances = await resp.json();
        if (Array.isArray(instances)) {
            for (const inst of instances) {
                if (inst.name === instanceName && inst.token) {
                    instanceTokenCache.set(instanceName, inst.token);
                    return inst.token;
                }
            }
        }
    } catch (err) {
        console.error('[Media] Erro ao obter token da instância:', err);
    }
    return '';
}

export async function processIncomingMessage(payload: any, eventSource: 'uazapi' | 'notificame' | 'meta') {
    try {
        let senderPhone = '';
        let textBody = '';
        let tenantId = '';
        let senderName = 'Unknown';
        let mediaUrl = '';
        let mediaType = '';
        let messageId = '';
        let instanceNameVar = '';
        let isFromMe = false;
        let isGroup = false;
        let eventType = '';

        // 1. Extração por Fonte (Uazapi, Notificame, Meta)
        if (eventSource === 'uazapi') {
            eventType = payload.EventType || payload.type;
            const instanceName = payload.instanceName || (typeof payload.instance === 'object' ? payload.instance.name : payload.instance);
            
            const msg = payload.message || payload.data || payload;
            
            // Os eventos podem vir como 'messages' (nova) ou 'messages_update' (status/mídia lida)
            if (eventType !== 'messages' && eventType !== 'messages_update') {
                console.log(`[MessageProcessor] Evento ignorado: ${eventType}`);
                return;
            }

            const instanceToken = String(payload.token || (msg.token) || (payload.instance?.token) || '').trim();
            isFromMe = msg.fromMe === true || msg.fromMe === 'true';

            // Identificar ID do Chat (Grupo ou Privado) — essa é a chave primária da conversa
            const rawChat = String(
                msg.chatid || msg.chatId || msg.key?.remoteJid || msg.remoteJid || msg.from || msg.sender_pn || msg.senderpn || msg.sender || ''
            );
            isGroup = rawChat.includes('@g.us');

            // Extrair o texto da mensagem ANTES de aplicar qualquer prefixo
            const msgContent = msg.message || msg.content || {};
            const rawText = msg.text;
            textBody = (typeof rawText === 'string' && rawText.trim() !== '') ? rawText
                        : (msgContent.conversation ? String(msgContent.conversation) : '')
                        || (msgContent.extendedTextMessage?.text ? String(msgContent.extendedTextMessage.text) : '')
                        || (msgContent.imageMessage?.caption ? String(msgContent.imageMessage.caption) : '')
                        || (msgContent.videoMessage?.caption ? String(msgContent.videoMessage.caption) : '')
                        || (msgContent.documentMessage?.caption ? String(msgContent.documentMessage.caption) : '')
                        || (typeof msg.content === 'object' && msg.content?.text ? String(msg.content.text) : '');

            // Lógica de Grupo vs Privado
            if (isGroup) {
                // Para grupos: usar o ID do grupo como senderPhone (chave única da conversa do grupo)
                senderPhone = rawChat.replace(/@g\.us$/i, '');
                const rawGroupName = msg.groupName || msg.chatName || msg.pushNameFrom || '';
                senderName = rawGroupName || senderPhone;

                // Extrair participante (quem enviou dentro do grupo)
                const rawPart = String(msg.participant || msg.key?.participant || msg.sender || '');
                const participantPhone = rawPart.replace(/@s\.whatsapp\.net$/i, '').replace(/@c\.us$/i, '');
                const participantName = msg.pushName || participantPhone;

                // Prefixar o texto com o nome do participante (como o WhatsApp faz)
                if (!isFromMe && textBody) {
                    textBody = `*${participantName}:*\n${textBody}`;
                }
            } else {
                // Para conversas privadas
                if (isFromMe) {
                    // Se eu enviei, a conversa é com o destinatário
                    const rawDest = String(msg.chatid || msg.to || msg.key?.remoteJid || '');
                    senderPhone = rawDest
                        .replace(/@s\.whatsapp\.net$/i, '')
                        .replace(/@c\.us$/i, '')
                        .replace(/@lid$/i, '');
                    
                    // IMPORTANTE: Em mensagens fromMe, o 'msg.pushName' costuma ser o nome do DONO da conta (você).
                    // Não queremos salvar o seu nome como nome do contato.
                    // Tentamos pegar dados do destinatário, caso contrário deixamos o senderPhone.
                    senderName = msg.notifyName || msg.verifiedBizName || msg.contactName || senderPhone;
                } else {
                    senderPhone = rawChat
                        .replace(/@s\.whatsapp\.net$/i, '')
                        .replace(/@c\.us$/i, '')
                        .replace(/@lid$/i, '');
                    // Nome de quem me enviou
                    senderName = msg.pushName || msg.notifyName || msg.senderName || senderPhone;
                }
            }



            // Detecção de Mídia (UAZAPI V2 e Baileys)
            const typeHint = (msg.messageType || msg.type || '').toLowerCase();
            const mimeHint = (msgContent.mimetype || msgContent.mimeType || '').toLowerCase();
            
            if (msgContent.audioMessage || typeHint.includes('audio') || mimeHint.includes('audio')) {
                mediaType = 'audio';
            } else if (msgContent.imageMessage || typeHint.includes('image') || mimeHint.includes('image')) {
                mediaType = 'image';
            } else if (msgContent.videoMessage || typeHint.includes('video') || mimeHint.includes('video')) {
                mediaType = 'video';
            } else if (msgContent.documentMessage || typeHint.includes('document') || mimeHint.includes('application')) {
                mediaType = 'document';
            } else if (msgContent.stickerMessage || typeHint.includes('sticker')) {
                mediaType = 'sticker';
            }

            if (mediaType || typeHint.includes('message') || typeHint.includes('audio') || typeHint.includes('image') || typeHint.includes('video') || typeHint.includes('document')) {
                // Se for mídia ou parecer mídia pelo tipo, capturar messageId para download
                messageId = msg.messageid || msg.id || msg.key?.id || payload.id || (payload.event?.MessageIDs?.[0]) || '';
                instanceNameVar = instanceName || '';
                
                // Forçar mediaType se o hint for forte mas mediaType ainda carregar vazio
                if (!mediaType) {
                    if (typeHint.includes('audio')) mediaType = 'audio';
                    else if (typeHint.includes('image')) mediaType = 'image';
                    else if (typeHint.includes('video')) mediaType = 'video';
                    else if (typeHint.includes('document')) mediaType = 'document';
                    else if (typeHint.includes('sticker')) mediaType = 'sticker';
                }

                // Tentar pegar URL se o UAZAPI já enviou processado (ignorar se for mmg.whatsapp.net)
                const potentialUrl = msg.mediaUrl || msgContent.url || msgContent.URL || '';
                if (potentialUrl && !potentialUrl.includes('mmg.whatsapp.net') && potentialUrl.startsWith('http')) {
                    mediaUrl = potentialUrl;
                }
            }

            tenantId = instanceName || '';
            

            
            // Atrelar o token extraído ao payload para uso posterior se necessário
            (payload as any)._extractedToken = instanceToken;

            console.log(`[MessageProcessor] UAZAPI Event: type=${eventType}, fromMe=${isFromMe}, sender=${senderPhone}, tenantHint=${tenantId}`);

        } else if (eventSource === 'notificame') {
            const msg = payload.message || payload;
            senderPhone = payload.from || msg.from || '';
            const content = msg.contents?.[0];
            if (content?.type === 'text') textBody = content.text || '';
            else if (content?.type === 'file') {
                textBody = `[Arquivo: ${content.file?.name || 'Mídia'}]`;
                mediaUrl = content.file?.url || '';
                mediaType = 'document';
            }
            
            const channelId = payload.channel || msg.channel || payload.from;
            if (channelId) {
                const { data: integration } = await supabase
                    .from('integrations')
                    .select('tenant_id')
                    .eq('provider', 'notificame')
                    .filter('settings->channelId', 'eq', channelId)
                    .single();
                if (integration) tenantId = integration.tenant_id;
            }
        } else {
            // Meta Graph API Original
            const entries = payload.entry || [];
            if (!entries.length) return;
            const changes = entries[0].changes;
            if (!changes || !changes.length) return;
            const value = changes[0].value;
            if (!value.messages || !value.messages.length) return;
            const messageObj = value.messages[0];
            
            senderPhone = messageObj.from;
            senderName = value.contacts?.[0]?.profile?.name || senderPhone;
            textBody = messageObj.text?.body || '';
            
            const recipientPhone = value.metadata?.display_phone_number;
            if (recipientPhone) {
                const { data: metaConn } = await supabase
                    .from('whatsapp_devices')
                    .select('tenant_id')
                    .eq('phone', recipientPhone)
                    .single();
                if (metaConn) tenantId = metaConn.tenant_id;
            }
        }

        // 1.2 FALLBACK TENANT: Se tenantId ainda for o instanceName, tentar validar no banco
        // especialmente importante para mensagens fromMe (enviadas do celular)
        if (eventSource === 'uazapi' && tenantId) {
            const ownerPhone = payload.owner || (payload.message?.owner);
            if (ownerPhone) {
                const cleanOwner = String(ownerPhone).replace(/\D/g, '');
                const { data: device } = await supabase
                    .from('whatsapp_devices')
                    .select('tenant_id')
                    .or(`phone.eq.${cleanOwner},name.eq.${tenantId}`)
                    .limit(1)
                    .single();
                
                if (device) {
                    console.log(`[MessageProcessor] Tenant resolvido via banco: ${device.tenant_id} (era ${tenantId})`);
                    tenantId = device.tenant_id;
                }
            }
        }

        // Se for mídia mas sem textBody definido, usar placeholder
        if (!textBody && mediaType) {
            const labels: Record<string, string> = { image: '[Imagem]', video: '[Vídeo]', audio: '[Áudio]', document: '[Documento]', sticker: '[Figurinha]' };
            textBody = labels[mediaType] || '[Mídia]';
        }

        // Validar: apenas descarta se não houver texto NEM mídia, ou se faltar telefone/tenant
        if ((!textBody && !mediaType) || !senderPhone || !tenantId) {
            console.log(`[MessageProcessor] Dados incompletos ou ignorados: Phone=${senderPhone}, Text=${!!textBody}, Media=${mediaType || 'nenhum'}, Tenant=${tenantId}`);
            return;
        }

        // 1.5 DESDUPLICAÇÃO: O .upsert() abaixo cuidará disso.
        const safeMessageId = messageId ? uuidv5(messageId, UUID_NAMESPACE) : uuidv4();

        // 2. Se há tipo de mídia mas sem URL, baixar da UAZAPI e salvar no Supabase
        if (mediaType && mediaType !== 'sticker' && !mediaUrl && messageId && eventSource === 'uazapi') {
            console.log(`[Media] Iniciando download forçado para ${messageId} (${mediaType})...`);
            const instToken = (payload as any)._extractedToken || '';
            if (instToken) {
                mediaUrl = await downloadAndStoreMedia(messageId, instToken, mediaType, tenantId);
                if (mediaUrl) {
                    console.log(`[Media] ✅ Download concluído com sucesso: ${mediaUrl.substring(0, 50)}...`);
                } else {
                    console.error(`[Media] ❌ Falha catastrófica no download da mídia ${messageId}`);
                }
            } else {
                console.warn(`[Media] Token da instância não encontrado no payload, pulando download.`);
            }
        }

        console.log(`[MessageProcessor] Processando: ${senderPhone} no tenant ${tenantId}.`);

        // ==========================================================
        // 2. Persistir Conversa e Mensagem no Banco de Dados
        // ==========================================================
        
        let conversationId = '';
        
        // Lógica para lidar com o 9º dígito do Brasil (WhatsApp costuma omitir em JIDs)
        const phoneVariants = [senderPhone];
        if (senderPhone.startsWith('55') && (senderPhone.length === 12 || senderPhone.length === 13)) {
            const ddd = senderPhone.substring(2, 4);
            const rest = senderPhone.substring(4);
            if (rest.length === 8) {
                // Se tem 8 dígitos no corpo, adiciona variante com o 9
                phoneVariants.push(`55${ddd}9${rest}`);
            } else if (rest.length === 9 && rest.startsWith('9')) {
                // Se tem 9 dígitos começando com 9, adiciona variante sem o 9
                phoneVariants.push(`55${ddd}${rest.substring(1)}`);
            }
        }

        const { data: existingConvos } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('tenant_id', tenantId)
            .in('contact_phone', phoneVariants)
            .limit(1);

        if (existingConvos && existingConvos.length > 0) {
            conversationId = existingConvos[0]?.id;
            
            await supabase
                .from('chat_conversations')
                .update({ 
                    last_message: textBody,
                    // Atualiza o nome se o senderName for diferente do número (indicando que temos um nome real)
                    // e se NÃO for uma mensagem 'fromMe' onde o nome capturado seja o seu seu próprio (proteção extra)
                    contact_name: (senderName !== senderPhone) ? senderName : undefined,
                    is_group: isGroup,
                    updated_at: new Date().toISOString()
                })
                .eq('id', conversationId);
        } else {
            const { data: newConvo, error: createError } = await supabase
                .from('chat_conversations')
                .insert([{
                    tenant_id: tenantId,
                    contact_name: senderName,
                    contact_phone: senderPhone,
                    last_message: textBody,
                    unread_count: 1,
                    is_group: isGroup,
                    online: true
                }])
                .select('id')
                .single();
            
            if (createError) {
                console.error('[MessageProcessor] Erro ao criar conversa:', createError);
                return;
            }
            if (newConvo) conversationId = newConvo.id;
        }

        if (!conversationId) return;

        // b) Inserir Mensagem
        const messageData = {
            id: safeMessageId,
            conversation_id: conversationId,
            tenant_id: tenantId, // Crucial para RLS e consistência
            text: textBody,
            from_me: isFromMe,
            media_url: mediaUrl || null,
            media_type: mediaType || null,
            created_at: new Date().toISOString()
        };

        console.log(`[MessageProcessor] Upserting message SafeId: ${safeMessageId} for Tenant: ${tenantId}`);

        const { data: newMsg, error: errM } = await supabase
            .from('chat_messages')
            .upsert([messageData], { onConflict: 'id' })
            .select('*')
            .single();

        if (errM) {
            console.error('[MessageProcessor] Erro ao salvar mensagem:', errM);
            return;
        }

        // ==========================================================
        // 3. Emitir WebSocket para o Frontend
        // ==========================================================
        emitToTenant(tenantId, 'new-message', {
            conversationId,
            message: newMsg,
            contactName: senderName,
            contactPhone: senderPhone
        });

        console.log(`[MessageProcessor] Sucesso: Mensagem de ${senderPhone} salva e emitida.`);

        // ==========================================================
        // 4. IA
        // ==========================================================
        try {
            if (textBody && !mediaType && !isFromMe) {
                const aiContext = { tenantId, agent_id: 'default' };
                const aiReply = await getAIResponse(textBody, aiContext);

                if (aiReply && aiReply.trim() !== '') {
                    let jobName = 'send-reply-meta';
                    if (eventSource === 'uazapi') jobName = 'send-reply-uazapi';
                    if (eventSource === 'notificame') jobName = 'send-reply-notificame';

                    await whatsappOutgoingQueue.add(jobName, {
                        to: senderPhone,
                        text: aiReply,
                        tenantId
                    });
                }
            }
        } catch (aiErr) {
            console.error('[MessageProcessor] Erro na geração da IA:', aiErr);
        }

    } catch (err) {
        console.error('[MessageProcessor] Erro crítico no processamento:', err);
    }
}
