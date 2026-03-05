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

        // 1. Extração por Fonte (Uazapi, Notificame, Meta)
        if (eventSource === 'uazapi') {
            const event = payload.event;
            // Apenas capturar mensagens
            if (event !== 'messages') return;

            const msg = payload.data || payload;
            
            // Ignorar mensagens enviadas por nós mesmos
            if (msg.fromMe) return;

            senderPhone = (msg.sender || msg.chatid || '').replace(/@s\.whatsapp\.net$/i, '');
            textBody = msg.text || msg.message?.conversation || '';
            tenantId = payload.instance || payload.instanceName || '';
            senderName = msg.pushName || msg.senderName || senderPhone;

        } else if (eventSource === 'notificame') {
            const msg = payload.message || payload;
            senderPhone = payload.from || msg.from || '';
            const content = msg.contents?.[0];
            if (content?.type === 'text') textBody = content.text || '';
            
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
            
            // Precisaria buscar o tenant pelo número de telefone destinatário (display_phone_number)
            const recipientPhone = value.metadata?.display_phone_number;
            if (recipientPhone) {
                const { data: metaConn } = await supabase
                    .from('whatsapp_devices') // ou meta_connections
                    .select('tenant_id')
                    .eq('phone', recipientPhone)
                    .single();
                if (metaConn) tenantId = metaConn.tenant_id;
            }
        }

        if (!textBody || !senderPhone || !tenantId) {
            console.log('[MessageProcessor] Descrição incompleta, cancelando processamento.');
            return;
        }

        console.log(`[MessageProcessor] Nova mensagem de ${senderPhone} (Name: ${senderName}) no tenant ${tenantId}. Texto: "${textBody}"`);

        // ==========================================================
        // 2. Persistir Conversa e Mensagem no Banco de Dados
        // ==========================================================
        
        // a) Buscar ou criar a Conversation (Chat_conversations)
        // Para simplificar, buscaremos pela última mensagem entre tenant_id e o contato
        let conversationId = '';
        
        // Verifica se a tabela tem o campo correct 'contact_number' ou se usaremos o 'contact_name' para agrupar
        // Idealmente teríamos uma coluna contact_number, mas na schema existente usaremos a lógica de lookup de nome temporariamente, 
        // Em um sistema real, o ideal é adicionar o telefone na tabela.
        const { data: existingConvos, error: errC } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('contact_name', `%${senderName}%`)
            .order('updated_at', { ascending: false })
            .limit(1);

        if (existingConvos && existingConvos.length > 0) {
            conversationId = existingConvos[0]?.id;
            
            // Atualizar last_message e unread_count
            await supabase
                .from('chat_conversations')
                .update({ 
                    last_message: textBody,
                    updated_at: new Date().toISOString()
                })
                .eq('id', conversationId);
            
            // Opcional: incrementar unread_count (se backend precisar fazer conta)
        } else {
            // Criar nova
            const { data: newConvo, error: createError } = await supabase
                .from('chat_conversations')
                .insert([{
                    tenant_id: tenantId,
                    contact_name: senderName,
                    last_message: textBody,
                    unread_count: 1,
                    online: true
                }])
                .select('id')
                .single();
            
            if (createError) {
                console.error('[MessageProcessor] Erro ao criar conversa:', createError);
                return; // Falhou graciosamente
            }
            if (newConvo) conversationId = newConvo.id;
        }

        if (!conversationId) return;

        // b) Inserir Mensagem (Chat_messages)
        const { data: newMsg, error: errM } = await supabase
            .from('chat_messages')
            .insert([{
                conversation_id: conversationId,
                text: textBody,
                from_me: false
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
            contactName: senderName
        });

        // ==========================================================
        // 4. Inteligência Artificial (Opcional - RAG)
        // ==========================================================
        // Enviar a mensagem para a IA e auto-responder, se habilitado
        try {
            const aiContext = { tenantId, agent_id: 'default' };
            console.log(`[MessageProcessor] Chamando LLM para o tenant ${tenantId}...`);
            const aiReply = await getAIResponse(textBody, aiContext);

            if (aiReply && aiReply.trim() !== '') {
                // Enfileira na fila MOCKADA (se habilitada) ou dispara direto no SenderWorker
                let jobName = 'send-reply-meta';
                if (eventSource === 'uazapi') jobName = 'send-reply-uazapi';
                if (eventSource === 'notificame') jobName = 'send-reply-notificame';

                await whatsappOutgoingQueue.add(
                    jobName,
                    {
                        to: senderPhone,
                        text: aiReply,
                        tenantId
                    }
                );
            }
        } catch (aiErr) {
            console.error('[MessageProcessor] Erro na geração da IA:', aiErr);
        }

    } catch (err) {
        console.error('[MessageProcessor] Erro crítico no processamento:', err);
    }
}
