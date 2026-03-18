import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { whatsappOutgoingQueue } from '../queues/whatsapp.js';
import { supabaseAdmin as supabase } from '../config/supabase.js';
import { sendTextMessage, sendMediaMessage, sendMediaMessageBase64, sessions, getOrRestoreSession } from '../services/whatsappService.js';
import { metaWhatsAppService } from '../services/metaWhatsAppService.js';
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
        
        // 1. Buscar dispositivo conectado neste tenant
        const { data: devices } = await supabase
            .from('whatsapp_devices')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('status', 'connected')
            .order('created_at', { ascending: false })
            .limit(1);

        const activeDevice = devices?.[0];
        if (!activeDevice) {
            return res.status(400).json({ error: 'WhatsApp não conectado neste tenant. Reconecte o dispositivo na aba Dispositivos.' });
        }

        // Normalização automática
        const number = normalizePhone(to);
        let waMessageId = '';

        if (activeDevice.type === 'official' && activeDevice.phone_number_id && activeDevice.api_token) {
            // ENVIO VIA META
            console.log(`[Messages] Enviando via META para: ${number}`);
            const metaRes = await metaWhatsAppService.sendTextMessage(
                activeDevice.phone_number_id,
                activeDevice.api_token,
                number,
                text
            );
            // Na Meta, o ID vem em messages[0].id
            waMessageId = metaRes.messages?.[0]?.id;
        } else {
            // ENVIO VIA UAZAPI (LEGACY/QR)
            const session = await getOrRestoreSession(tenantId);
            if (!session) {
                return res.status(400).json({ error: 'Sessão WhatsApp (QR) expirada. Reconecte o dispositivo.' });
            }
            console.log(`[Messages] Enviando via UAZAPI para: ${number}`);
            const waRes = await sendTextMessage(session.token, number, text);
            
            // UAZAPI V2 Debug: Log da resposta para garantir extração correta
            console.log(`[Messages Router] Resposta da UAZAPI:`, JSON.stringify(waRes));
            
            // Tenta extrair o ID de diversas formas comuns na UAZAPI V2
            waMessageId = waRes?.message?.id || waRes?.id || waRes?.messageid || waRes?.data?.id || waRes?.key?.id;
        }

        console.log(`[Messages Router] ✅ Mensagem enviada para ${number}. ID Provedor Extraído: ${waMessageId}`);

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

        /**
         * EVITANDO DUPLICAÇÃO:
         * Se conseguimos o waMessageId do provedor, geramos o UUIDv5 determinístico (mesmo usado no Webhook).
         * Se NÃO conseguimos (fallback), NÃO salvamos no banco agora. 
         * O front-end já fez o update otimista e o Webhook irá processar a mensagem real em instantes 
         * com o ID correto, evitando "órfãos" com ID aleatório.
         */
        if (conversationId && waMessageId) {
            const safeId = uuidv5(waMessageId, UUID_NAMESPACE);
            console.log(`[Messages Router] Persistindo mensagem com SafeId: ${safeId}`);
            
            await supabase.from('chat_messages').upsert([{
                id: safeId,
                conversation_id: conversationId,
                tenant_id: tenantId, // Importante para RLS e consistência
                text: text,
                from_me: true,
                created_at: new Date().toISOString()
            }], { onConflict: 'id' });
        } else if (conversationId) {
            console.warn(`[Messages Router] waMessageId não obtido. Ignorando persistência imediata para evitar duplicação.`);
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
        const userId = req.userId;
        const { view, type, targetUserId } = req.query; // 'all', 'mine', 'unassigned' and 'external', 'internal'

        // 1. Buscar o papel do usuário no tenant
        const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('role')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .single();

        const userRole = tenantUser?.role || 'member';

        // Validação: Só retorna conversas se o WhatsApp estiver conectado ou aberto (apenas para tipo external)
        const session = await getOrRestoreSession(tenantId);
        const status = session?.status?.toLowerCase();
        
        // Se for tipo external, exige sessão. Se for internal, não exige.
        if ((!type || type === 'external') && (!session || (status !== 'connected' && status !== 'open'))) {
            console.log(`[Messages Router] Tenant ${tenantId} desconectado (status: ${status}). Retornando lista vazia para conversas externas.`);
            return res.json([]);
        }

        let query = supabase
            .from('chat_conversations')
            .select(`
                id,
                contact_name,
                contact_phone,
                last_message,
                unread_count,
                online,
                avatar_url,
                updated_at,
                assigned_to,
                internal_type,
                is_group
            `)
            .eq('tenant_id', tenantId);

        if (type) {
            query = query.eq('internal_type', type);
        } else {
            query = query.eq('internal_type', 'external');
        }

        // Lógica de Filtro por Role e View
        if (userRole === 'admin') {
            if (targetUserId) {
                // Modo Supervisão: Filtra conversas atribuídas ao usuário alvo
                query = query.eq('assigned_to', targetUserId);
            } else if (view === 'mine') {
                query = query.eq('assigned_to', userId);
            } else if (view === 'unassigned') {
                query = query.is('assigned_to', null);
            }
            // else view === 'all' (default para admin) -> não aplica filtro extra de assigned_to
        } else {
            // Se for Lawyer/Member, por padrão só vê as suas se o filtro mine estiver ativo
            if (view === 'mine') {
                query = query.eq('assigned_to', userId);
            }
        }

        const { data: conversations, error } = await query
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
            assignedTo: c.assigned_to,
            internalType: c.internal_type,
            isGroup: c.is_group,
            messages: []
        })) || [];

        res.json(formatted);
    } catch (err) {
        console.error('[Messages Router] Erro ao listar conversas:', err);
        res.status(500).json({ error: 'Erro ao listar conversas' });
    }
});

/**
 * POST /api/messages/conversations/:id/assign
 * Atribui uma conversa a um usuário da equipe.
 */
messagesRouter.post('/conversations/:id/assign', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedTo } = req.body; // UUID do usuário ou null
        const tenantId = req.tenantId!;

        const { error } = await supabase
            .from('chat_conversations')
            .update({ assigned_to: assignedTo })
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err: any) {
        console.error('[Messages] Erro ao atribuir conversa:', err);
        res.status(500).json({ error: 'Erro ao atribuir conversa.' });
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


