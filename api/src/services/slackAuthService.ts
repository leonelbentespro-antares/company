
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const CLIENT_ID = process.env.SLACK_CLIENT_ID;
const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const REDIRECT_URI = process.env.SLACK_REDIRECT_URI;

export const getSlackAuthUrl = (tenantId: string) => {
    const baseUrl = 'https://slack.com/oauth/v2/authorize';
    const params = new URLSearchParams({
        client_id: CLIENT_ID!,
        scope: 'channels:read,chat:write,incoming-webhook',
        user_scope: 'identity.basic,identity.email',
        redirect_uri: REDIRECT_URI!,
        state: tenantId
      });
    return `${baseUrl}?${params.toString()}`;
};

export const handleSlackCallback = async (code: string, tenantId: string) => {
    try {
        const tokenRes = await axios.post('https://slack.com/api/oauth.v2.access', new URLSearchParams({
            client_id: CLIENT_ID!,
            client_secret: CLIENT_SECRET!,
            code,
            redirect_uri: REDIRECT_URI!
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (!tokenRes.data.ok) throw new Error('Slack OAuth error: ' + tokenRes.data.error);

        const { access_token, authed_user, team } = tokenRes.data;
        const email = authed_user?.email || `slack_user_${authed_user.id}@${team.id}.slack.com`;

        const { error } = await supabase
            .from('cloud_auth_tokens')
            .upsert({
                tenant_id: tenantId,
                provider: 'slack',
                account_email: email,
                access_token,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,provider,account_email' });

        if (error) throw error;

        return { success: true, email };
    } catch (error) {
        console.error('Slack callback error:', error);
        throw error;
    }
};
