
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const API_KEY = process.env.TRELLO_API_KEY;
// Trello usa um fluxo de autorização simplificado que retorna o token diretamente ou via callback
const REDIRECT_URI = process.env.TRELLO_REDIRECT_URI;

export const getTrelloAuthUrl = (tenantId: string) => {
    const baseUrl = 'https://trello.com/1/authorize';
    const params = new URLSearchParams({
        callback_method: 'fragment', // O Trello retorna o token na URL fragment
        return_url: REDIRECT_URI!,
        expiration: 'never',
        name: 'LexHub Integration',
        scope: 'read,write,account',
        response_type: 'token',
        key: API_KEY!
    });
    // Adicionamos o tenantId no return_url para persistência
    const finalUrl = `${baseUrl}?${params.toString()}`;
    return finalUrl;
};

// Como o Trello via Client-Side costuma retornar no fragment, o callback no backend 
// precisa lidar com o token enviado pelo frontend ou um fluxo de server-side.
// Para simplificar e manter o padrão, usaremos o fluxo de API Token que o usuário gera.
export const handleTrelloToken = async (token: string, tenantId: string) => {
    try {
        // Validar o token e pegar info do usuário
        const userRes = await axios.get(`https://api.trello.com/1/members/me?key=${API_KEY}&token=${token}`);
        const email = userRes.data.email || `trello_${userRes.data.username}@trello.com`;

        const { error } = await supabase
            .from('cloud_auth_tokens')
            .upsert({
                tenant_id: tenantId,
                provider: 'trello',
                account_email: email,
                access_token: token,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,provider,account_email' });

        if (error) throw error;

        return { success: true, email };
    } catch (error) {
        console.error('Trello token validation error:', error);
        throw error;
    }
};
