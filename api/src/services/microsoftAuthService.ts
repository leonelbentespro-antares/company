
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'https://lexhub.company/api/integrations/microsoft/callback';

const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'Mail.Read', 'User.Read'];

export const getMicrosoftAuthUrl = (tenantId: string) => {
    const baseUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    const params = new URLSearchParams({
        client_id: CLIENT_ID!,
        response_type: 'code',
        redirect_uri: REDIRECT_URI!,
        response_mode: 'query',
        scope: SCOPES.join(' '),
        state: tenantId,
        prompt: 'consent'
    });
    return `${baseUrl}?${params.toString()}`;
};

export const handleMicrosoftCallback = async (code: string, tenantId: string) => {
    try {
        const tokenRes = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', new URLSearchParams({
            client_id: CLIENT_ID!,
            client_secret: CLIENT_SECRET!,
            code,
            redirect_uri: REDIRECT_URI!,
            grant_type: 'authorization_code'
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in } = tokenRes.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

        const userRes = await axios.get('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const email = userRes.data.mail || userRes.data.userPrincipalName;

        const { error } = await supabase
            .from('cloud_auth_tokens')
            .upsert({
                tenant_id: tenantId,
                provider: 'microsoft',
                account_email: email,
                access_token,
                refresh_token,
                expires_at: expiresAt,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,provider,account_email' });

        if (error) throw error;

        return { success: true, email };
    } catch (error) {
        console.error('Microsoft callback error:', error);
        throw error;
    }
};
