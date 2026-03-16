import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { emailService } from '../services/emailService.js';
import { supabaseAdmin } from '../config/supabase.js';

export const teamRouter = Router();

/**
 * Envia um e-mail de convite para a equipe
 * POST /api/team/invite
 */
teamRouter.post('/invite', async (req: Request, res: Response) => {
    try {
        const { email, tenant_id, role } = req.body;

        if (!email || !tenant_id) {
            return res.status(400).json({ error: 'E-mail e tenant_id são obrigatórios.' });
        }

        // Busca o nome do escritório
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('name')
            .eq('id', tenant_id)
            .single();

        if (tenantError) {
            console.error('[Team API] Erro ao buscar tenant:', tenantError);
        }

        const tenantName = tenant?.name || 'LexHub Workspace';
        const baseUrl = process.env.VITE_APP_URL || 'https://lexhub.company';

        // Envia o e-mail via Resend
        const { data, error } = await emailService.sendEmail({
            from: 'LexHub <noreply@lexhub.company>',
            to: email,
            subject: `Você foi convidado para o time ${tenantName} no LexHub`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 10px;">
                    <h2 style="color: #1e293b;">Olá! 👋</h2>
                    <p style="font-size: 16px; color: #475569;">
                        Você foi convidado para se juntar ao escritório <strong>${tenantName}</strong> no LexHub como <strong>${role === 'admin' ? 'Administrador' : 'Colaborador'}</strong>.
                    </p>
                    <p style="font-size: 16px; color: #475569;">
                        Para aceitar o convite e começar a trabalhar, clique no botão abaixo para criar sua conta ou fazer login:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}/auth" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Acessar LexHub
                        </a>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #94a3b8;">
                        Se você não esperava este convite, pode ignorar este email.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('[Team API] Erro ao enviar email via Resend:', error);
            return res.status(500).json({ error: 'Falha no envio do e-mail. Tente novamente mais tarde.' });
        }

        console.log(`✅ [Team API] Convite enviado p/ ${email}. Resend ID:`, data);
        res.status(200).json({ message: 'Convite enviado com sucesso!' });

    } catch (err) {
        console.error('[Team API] Erro crítico ao processar envio de convite:', err);
        res.status(500).json({ error: 'Erro interno do servidor ao gerar convite.' });
    }
});

/**
 * GET /api/team/members
 * Lista todos os membros do time no tenant logado.
 */
teamRouter.get('/members', authMiddleware, async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId!;

        const { data, error } = await supabaseAdmin
            .from('tenant_users')
            .select(`
                user_id,
                role,
                profiles:user_id (
                    id,
                    name,
                    email,
                    avatar_url
                )
            `)
            .eq('tenant_id', tenantId);

        if (error) throw error;

        const members = data?.map((m: any) => ({
            id: m.user_id,
            name: (m.profiles as any)?.name || (m.profiles as any)?.email || 'Membro',
            role: m.role,
            avatar: (m.profiles as any)?.avatar_url
        })) || [];

        res.json(members);
    } catch (err) {
        console.error('[Team API] Erro ao listar membros:', err);
        res.status(500).json({ error: 'Erro ao listar membros da equipe.' });
    }
});
