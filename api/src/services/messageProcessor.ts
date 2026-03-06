import { supabaseAdmin as supabase } from '../config/supabase.js';
import { emitToTenant } from '../socket/index.js';
import { getAIResponse } from './aiService.js';
import { whatsappOutgoingQueue } from '../queues/whatsapp.js';

export async function processIncomingMessage(payload: any, eventSource: 'uazapi' | 'notificame' | 'meta') {
    try {
        let senderPhone = '';
        let textBody = '';
        let tenantId = '';
        let senderName = 'Unknown';
        let mediaUrl = '';
        let mediaType = '';

        // 1. Extração por Fonte (Uazapi, Notificame, Meta)
        if (eventSource === 'uazapi') {
            const eventType = payload.EventType || payload.type;
            const instanceName = payload.instanceName || (typeof payload.instance === 'object' ? payload.instance.name : payload.instance);
            
            if (eventType !== 'messages') {
                console.log(`[MessageProcessor] Evento ignorado: ${eventType}`);
                return;
            }

            const msg = payload.message || payload.data || payload;
            if (msg.fromMe === true || msg.fromMe === 'true') return;

            senderPhone = (msg.sender || msg.chatid || '').replace(/@s\.whatsapp\.net$/i, '');
            
            // Texto da mensagem
            textBody = msg.text || msg.message?.conversation || (typeof msg.content === 'object' ? msg.content.text : '');
            
            // Se for mídia (UAZAPI V2)
            if (!textBody && msg.message) {
                if (msg.message.audioMessage) {
                    textBody = '[Áudio]';
                    mediaType = 'audio';
                } else if (msg.message.imageMessage) {
                    textBody = '[Imagem]';
                    mediaType = 'image';
                } else if (msg.message.videoMessage) {
                    textBody = '[Vídeo]';
                    mediaType = 'video';
                } else if (msg.message.documentMessage) {
                    textBody = '[Documento]';
                    mediaType = 'document';
                } else if (msg.message.stickerMessage) {
                    textBody = '[Figurinha]';
                    mediaType = 'sticker';
                }
                
                // Tentar pegar URL se o UAZAPI já enviou processado
                const messageKeys = Object.keys(msg.message);
                const firstKey = messageKeys[0];
                mediaUrl = msg.mediaUrl || (firstKey ? (msg.message as any)[firstKey]?.url : '') || '';
            }

            tenantId = instanceName || '';
            senderName = msg.pushName || msg.senderName || senderPhone;

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

        if (!textBody || !senderPhone || !tenantId) {
            console.log(`[MessageProcessor] Dados incompletos: Phone=${senderPhone}, Text=${!!textBody}, Tenant=${tenantId}`);
            return;
        }

        console.log(`[MessageProcessor] Processando: ${senderPhone} no tenant ${tenantId}.`);

        // ==========================================================
        // 2. Persistir Conversa e Mensagem no Banco de Dados
        // ==========================================================
        
        let conversationId = '';
        
        const { data: existingConvos } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('contact_phone', senderPhone)
            .limit(1);

        if (existingConvos && existingConvos.length > 0) {
            conversationId = existingConvos[0]?.id;
            
            await supabase
                .from('chat_conversations')
                .update({ 
                    last_message: textBody,
                    contact_name: senderName !== senderPhone ? senderName : undefined,
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
        const { data: newMsg, error: errM } = await supabase
            .from('chat_messages')
            .insert([{
                conversation_id: conversationId,
                text: textBody,
                from_me: false,
                media_url: mediaUrl || null,
                media_type: mediaType || null
            }])
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
            if (textBody && !mediaType) {
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
