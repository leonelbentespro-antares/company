
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const CLIENT_ID = process.env.DROPBOX_CLIENT_ID;
const CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET;
const REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI;

export const getDropboxAuthUrl = (tenantId: string) => {
    const baseUrl = 'https://www.dropbox.com/oauth2/authorize';
    const params = new URLSearchParams({
        client_id: CLIENT_ID!,
        response_type: 'code',
        redirect_uri: REDIRECT_URI!,
        state: tenantId,
        token_access_type: 'offline' // Para receber refresh_token
    });
    return `${baseUrl}?${params.toString()}`;
};

export const handleDropboxCallback = async (code: string, tenantId: string) => {
    try {
        const tokenRes = await axios.post('https://api.dropbox.com/oauth2/token', new URLSearchParams({
            client_id: CLIENT_ID!,
            client_secret: CLIENT_SECRET!,
            code,
            redirect_uri: REDIRECT_URI!,
            grant_type: 'authorization_code'
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in, account_id } = tokenRes.data;
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

        // Buscar info da conta para pegar o e-mail
        const userRes = await axios.post('https://api.dropboxapi.com/2/users/get_current_account', null, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const email = userRes.data.email;

        const { error } = await supabase
            .from('cloud_auth_tokens')
            .upsert({
                tenant_id: tenantId,
                provider: 'dropbox',
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
        console.error('Dropbox callback error:', error);
        throw error;
    }
};
