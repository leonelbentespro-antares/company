
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const CLIENT_ID = process.env.META_CLIENT_ID;
const CLIENT_SECRET = process.env.META_CLIENT_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'https://lexhub.company/api/integrations/meta/callback';

// Scopes comuns para gerenciar páginas e anúncios
const SCOPES = [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'ads_management'
];

export const getMetaAuthUrl = (tenantId: string) => {
    const baseUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
    const params = new URLSearchParams({
        client_id: CLIENT_ID!,
        redirect_uri: REDIRECT_URI!,
        state: tenantId,
        scope: SCOPES.join(','),
        response_type: 'code'
    });
    return `${baseUrl}?${params.toString()}`;
};

export const handleMetaCallback = async (code: string, tenantId: string) => {
    try {
        const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: {
                client_id: CLIENT_ID!,
                client_secret: CLIENT_SECRET!,
                redirect_uri: REDIRECT_URI!,
                code
            }
        });

        const { access_token, expires_in } = tokenRes.data;
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

        // Buscar info do usuário Meta
        const userRes = await axios.get('https://graph.facebook.com/me', {
            params: {
                fields: 'id,name,email',
                access_token
            }
        });
        const email = userRes.data.email || `meta_${userRes.data.id}@facebook.com`;

        const { error } = await supabase
            .from('cloud_auth_tokens')
            .upsert({
                tenant_id: tenantId,
                provider: 'meta',
                account_email: email,
                access_token,
                expires_at: expiresAt,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,provider,account_email' });

        if (error) throw error;

        return { success: true, email };
    } catch (error) {
        console.error('Meta callback error:', error);
        throw error;
    }
};
