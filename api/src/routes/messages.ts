import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { whatsappOutgoingQueue } from '../queues/whatsapp.js';
import { supabaseAdmin as supabase } from '../config/supabase.js';
import { sendTextMessage, sendMediaMessage, sendMediaMessageBase64, sessions, getOrRestoreSession } from '../services/whatsappService.js';
import { uploadMediaToSupabase } from '../services/storage/supabaseStorageService.js';
import { normalizePhone, formatTimestampManaus } from '../utils/phoneUtils.js';
import multer from 'multer';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

const UUID_NAMESPACE = '6b86b273-ed4c-4a31-9ead-ce403b544b35';

const upload = multer({
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});
export const messagesRouter = Router();

/**
 * Endpoint para envio de mensagens via API Key (Uso Externo)
 * POST /api/messages/send
 */
messagesRouter.post('/send', authMiddleware, async (req, res) => {
    const { to, text } = req.body;

    if (!to || !text) {
        return res.status(400).json({ 
            error: 'Campos obrigatórios ausentes: "to" e "text".',
            code: 'MISSING_FIELDS'
        });
    }

    try {
        const tenantId = req.tenantId!;
        
        const session = await getOrRestoreSession(tenantId);
        if (!session) {
             return res.status(400).json({ error: 'WhatsApp não conectado neste tenant. Reconecte o dispositivo na aba Dispositivos.' });
        }

        // Normalização automática: remove JID suffixes e garante formato correto
        const number = normalizePhone(to);
        console.log(`[Messages] Enviando texto para: "${number}" (original: "${to}", tenant: ${tenantId})`);
        
        // 1. Enviar via UAZAPI
        const waRes = await sendTextMessage(session.token, number, text);
        const waMessageId = waRes?.message?.id || waRes?.id || waRes?.messageid;
        console.log(`[Messages Router] ✅ Mensagem enviada para ${number}. ID UAZAPI: ${waMessageId}`);

        // 2. Gravar no Banco de Dados
        let conversationId = '';
        const { data: convs } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('contact_phone', number)
            .limit(1);
            
        if (convs && convs.length > 0) {
            conversationId = convs[0]?.id;
            await supabase.from('chat_conversations').update({ 
                last_message: text, 
                updated_at: new Date().toISOString() 
            }).eq('id', conversationId);
        } else {
            const { data: newConvo } = await supabase.from('chat_conversations')
               .insert([{ 
                   tenant_id: tenantId, 
                   contact_name: number, 
                   contact_phone: number,
                   last_message: text, 
                   unread_count: 0, 
                   online: true 
               }])
               .select('id').single();
            if (newConvo) conversationId = newConvo.id;
        }

        if (conversationId) {
            const safeId = waMessageId ? uuidv5(waMessageId, UUID_NAMESPACE) : uuidv4();
            await supabase.from('chat_messages').upsert([{
                id: safeId,
                conversation_id: conversationId,
                text: text,
                from_me: true
            }], { onConflict: 'id' });
        }

        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso.',
            tenantId
        });
    } catch (err: any) {
        console.error('[Messages Router] Erro ao processar envio:', err);
        const msg = (err as any)?.message || String(err);
        res.status(500).json({ 
            error: msg.includes('not on WhatsApp') 
                ? `Número ${(err as any)?.message?.match(/\d+/)?.[0] || ''} não possui WhatsApp. Verifique o número do contato.`
                : msg.includes('disconnected')
                ? 'WhatsApp desconectado. Reconecte na aba Dispositivos.'
                : 'Erro ao enviar mensagem.' 
        });
    }
});

/**
 * POST /api/messages/send-media
 * Recebe o arquivo em Base64 ou Form-Data, e faz o upload e disparo 
 */
messagesRouter.post('/send-media', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { to, caption, isPtt } = req.body;
        const file = req.file;
        const tenantId = req.tenantId!;
        const ptt = isPtt === 'true' || isPtt === true;

        console.log(`[DEBUG_MEDIA] Recebendo arquivo: ${file?.originalname} (${file?.size} bytes) para ${to} no tenant ${tenantId} | PTT: ${ptt}`);

        if (!to || !file) {
            return res.status(400).json({ error: 'Campos "to" e "file" são obrigatórios.' });
        }

        const session = await getOrRestoreSession(tenantId);
        if (!session) {
             return res.status(400).json({ error: 'WhatsApp não conectado neste tenant. Reconecte o dispositivo na aba Dispositivos.' });
        }

        // Normalização automática de telefone
        const number = normalizePhone(to);
        console.log(`[Messages] Enviando mídia para: "${number}" (original: "${to}", tenant: ${tenantId})`);
        
        // 1. Upload Supabase Storage (para armazenamento permanente)
        const mimeType = file.mimetype;
        const mediaUrl = await uploadMediaToSupabase(file.buffer, file.originalname, tenantId, mimeType);

        // Acha qual o tipo de mídia
        let uazapiMediaType = 'document';
        if (ptt) uazapiMediaType = 'audio';
        else if (mimeType.startsWith('image/')) uazapiMediaType = 'image';
        else if (mimeType.startsWith('video/')) uazapiMediaType = 'video';
        else if (mimeType.startsWith('audio/')) uazapiMediaType = 'audio';

        // 2. Envia para UAZAPI como Base64 (evita timeout de download externo de URL)
        const base64Data = file.buffer.toString('base64');
        const waRes = await sendMediaMessageBase64(session.token, number, base64Data, mimeType, file.originalname, caption || '', uazapiMediaType, ptt);
        const waMessageId = waRes?.message?.id || waRes?.id || waRes?.messageid;
        console.log(`[Messages] ✅ Mídia enviada para ${number}. ID UAZAPI: ${waMessageId}`);

        // 3. Salva no banco de dados local da conversa
        let conversationId = '';
        const { data: convs } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('contact_phone', number)
            .limit(1);
            
        if (convs && convs.length > 0) {
            conversationId = convs[0]?.id;
            await supabase.from('chat_conversations').update({ 
                last_message: caption ? `[Mídia] ${caption}` : `[${uazapiMediaType.toUpperCase()}]`, 
                updated_at: new Date().toISOString() 
            }).eq('id', conversationId);
        } else {
            const { data: newConvo } = await supabase.from('chat_conversations')
               .insert([{ 
                   tenant_id: tenantId, 
                   contact_name: number, 
                   contact_phone: number,
                   last_message: caption ? `[Mídia] ${caption}` : `[${uazapiMediaType.toUpperCase()}]`, 
                   unread_count: 0, 
                   online: true 
               }])
               .select('id').single();
            if (newConvo) conversationId = newConvo.id;
        }

        // Salva a mensagem (usando extended text / mediaType)
        if (conversationId) {
            const safeId = waMessageId ? uuidv5(waMessageId, UUID_NAMESPACE) : uuidv4();
            await supabase.from('chat_messages').upsert([{
                id: safeId,
                conversation_id: conversationId,
                text: caption || `[${uazapiMediaType.toUpperCase()}]`,
                media_url: mediaUrl,
                media_type: uazapiMediaType,
                from_me: true
            }], { onConflict: 'id' });
        }

        res.json({ success: true, mediaUrl });
    } catch (err: any) {
        console.error('[Messages] Erro upload mídia:', err);
        const msg = err?.message || String(err);
        res.status(500).json({ 
            error: msg.includes('not on WhatsApp')
                ? `Número não possui WhatsApp. Verifique o contato.`
                : msg.includes('disconnected')
                ? 'WhatsApp desconectado. Reconecte na aba Dispositivos.'
                : 'Erro ao enviar arquivo. Tente novamente.'
        });
    }
});

/**
 * GET /api/messages/conversations
 * Lista todas as conversas do tenant logado.
 */
messagesRouter.get('/conversations', authMiddleware, async (req, res) => {
    try {
        const tenantId = req.tenantId!;

        // Validação: Só retorna conversas se o WhatsApp estiver conectado
        const session = await getOrRestoreSession(tenantId);
        if (!session || session.status.toLowerCase() !== 'connected') {
            console.log(`[Messages Router] Tenant ${tenantId} desconectado. Retornando lista vazia.`);
            return res.json([]);
        }

        const { data: conversations, error } = await supabase
            .from('chat_conversations')
            .select(`
                id,
                contact_name,
                contact_phone,
                last_message,
                unread_count,
                online,
                avatar_url,
                updated_at
            `)
            .eq('tenant_id', tenantId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        
        console.log(`[Messages Router] Encontradas ${conversations?.length || 0} conversas para o tenant ${tenantId}`);
        
        // Formatar para o frontend (ChatConversation)
        const formatted = conversations?.map(c => ({
            id: c.id,
            contactName: c.contact_name,
            contactPhone: c.contact_phone,
            lastMessage: c.last_message,
            timestamp: formatTimestampManaus(c.updated_at),
            unreadCount: c.unread_count,
            online: c.online,
            avatar: c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.contact_name)}&background=002B49&color=fff`,
            messages: []
        })) || [];

        res.json(formatted);
    } catch (err) {
        console.error('[Messages Router] Erro ao listar conversas:', err);
        res.status(500).json({ error: 'Erro ao listar conversas' });
    }
});

/**
 * GET /api/messages/:conversationId
 * Retorna as mensagens de uma conversa específica.
 */
messagesRouter.get('/:conversationId', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const tenantId = req.tenantId!; // Segurança: garantir que só acesse se for dono

        // Validação (opcional: garantir que a conversation pertence ao tenantId)
        const { data: convCheck } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('tenant_id', tenantId)
            .single();

        if (!convCheck) {
            return res.status(404).json({ error: 'Conversa não encontrada ou acesso negado' });
        }

        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const formatted = messages?.map(m => ({
            id: m.id,
            text: m.text,
            timestamp: formatTimestampManaus(m.created_at),
            fromMe: m.from_me,
            mediaUrl: m.media_url || null,
            mediaType: m.media_type || null
        })) || [];

        res.json(formatted);
    } catch (err) {
        console.error('[Messages Router] Erro ao listar mensagens:', err);
        res.status(500).json({ error: 'Erro ao listar mensagens' });
    }
});

/**
 * DELETE /api/messages/:conversationId
 * Exclui uma conversa e todas as suas mensagens.
 */
messagesRouter.delete('/:conversationId', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const tenantId = req.tenantId!;

        // Verificar que a conversa pertence ao tenant (segurança)
        const { data: convCheck } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('tenant_id', tenantId)
            .single();

        if (!convCheck) {
            return res.status(404).json({ error: 'Conversa não encontrada ou acesso negado' });
        }

        // Excluir mensagens primeiro (FK constraint)
        await supabase.from('chat_messages').delete().eq('conversation_id', conversationId);
        
        // Excluir a conversa
        const { error } = await supabase
            .from('chat_conversations')
            .delete()
            .eq('id', conversationId)
            .eq('tenant_id', tenantId);
        
        if (error) throw error;

        console.log(`[Messages Router] Conversa ${conversationId} excluída pelo tenant ${tenantId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[Messages Router] Erro ao excluir conversa:', err);
        res.status(500).json({ error: 'Erro ao excluir conversa' });
    }
});


