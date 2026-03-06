import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { whatsappOutgoingQueue } from '../queues/whatsapp.js';
import { supabaseAdmin as supabase } from '../config/supabase.js';
import { sendTextMessage, sessions } from '../services/whatsappService.js';

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
        
        const session = sessions.get(tenantId);
        if (!session) {
             return res.status(400).json({ error: 'WhatsApp não conectado neste tenant.' });
        }

        const number = to.replace(/@s\.whatsapp\.net$/i, '').replace(/@lid$/i, '');
        
        // 1. Enviar via UAZAPI
        await sendTextMessage(session.token, number, text);
        console.log(`[Messages Router] Mensagem enviada para ${number} (Tenant: ${tenantId})`);

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
            await supabase.from('chat_messages').insert([{
                conversation_id: conversationId,
                text: text,
                from_me: true
            }]);
        }

        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso.',
            tenantId
        });
    } catch (err: any) {
        console.error('[Messages Router] Erro ao processar envio:', err);
        res.status(500).json({ 
            error: 'Erro no servidor', 
            details: err.message 
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
        const { data: conversations, error } = await supabase
            .from('chat_conversations')
            .select(`
                id,
                contact_name,
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
            lastMessage: c.last_message,
            timestamp: new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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


