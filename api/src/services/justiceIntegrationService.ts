import axios from 'axios';
import { supabaseAdmin as supabase } from '../config/supabase.js';

/**
 * Serviço responsável pela integração com PJe (Processo Judicial Eletrônico) 
 * e PDPJ (Plataforma Digital do Poder Judiciário).
 */
export class JusticeIntegrationService {
    private static PDPJ_SSO_URL = 'https://sso.pdpj.jus.br/auth/realms/pdpj/protocol/openid-connect/token';
    private static DATAJUD_URL = 'https://api-publica.datajud.cnj.jus.br/api_publica';

    /**
     * Obtém ou renova o token OAuth2 para um Tenant.
     */
    static async getAccessToken(tenantId: string): Promise<string | null> {
        const { data: integration } = await supabase
            .from('integrations')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('provider', 'pdpj')
            .single();

        if (!integration || !integration.settings.enabled) return null;

        const { accessToken, refreshToken, expiresAt, clientId, clientSecret } = integration.settings;

        // Verificar se o token expirou (margem de 5 minutos)
        if (expiresAt && new Date(expiresAt).getTime() - 300000 < Date.now()) {
            if (!refreshToken) return accessToken || null;

            console.log(`[Justice Service] Renovando token para tenant: ${tenantId}`);
            try {
                const params = new URLSearchParams();
                params.append('grant_type', 'refresh_token');
                params.append('refresh_token', refreshToken);
                params.append('client_id', clientId || '');
                if (clientSecret) params.append('client_secret', clientSecret);

                const response = await axios.post(this.PDPJ_SSO_URL, params);
                const newTokens = response.data;

                const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

                await supabase
                    .from('integrations')
                    .update({
                        settings: {
                            ...integration.settings,
                            accessToken: newTokens.access_token,
                            refreshToken: newTokens.refresh_token || refreshToken,
                            expiresAt: newExpiresAt
                        }
                    })
                    .eq('id', integration.id);

                return newTokens.access_token;
            } catch (error) {
                console.error('[Justice Service] Refresh Token Error:', error);
                return accessToken || null;
            }
        }

        return accessToken || null;
    }

    /**
     * Consulta metadados de um processo via Datajud.
     * @param cnjNumber Número do processo formatado ou apenas números
     * @param apiKey Chave de API do Datajud cadastrada pelo escritório
     */
    static async consultDatajud(cnjNumber: string, apiKey: string) {
        try {
            const cleanNumber = cnjNumber.replace(/\D/g, '');
            console.log(`[Justice Service] Consultando Datajud: ${cleanNumber}`);

            const response = await axios.post(`${this.DATAJUD_URL}/consultar`, {
                numeroProcesso: cleanNumber
            }, {
                headers: { 
                    'Authorization': `ApiKey ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('[Justice Service] Datajud Error:', error);
            throw error;
        }
    }

    /**
     * Sincroniza um processo local com o Datajud
     */
    static async syncProcessWithDatajud(tenantId: string, processId: string, cnjNumber: string) {
        const { data: integration } = await supabase
            .from('integrations')
            .select('settings')
            .eq('tenant_id', tenantId)
            .eq('provider', 'pdpj')
            .single();

        const apiKey = integration?.settings?.apiKey;
        if (!apiKey) throw new Error("API Key do Datajud não configurada nas integrações PDPJ.");

        const data = await this.consultDatajud(cnjNumber, apiKey);
        
        // Mapeamento básico de movimentação
        const lastMovement = data.result?.[0]?.movimentacoes?.[0];
        const movementDesc = lastMovement?.descricao || 'Sem novas movimentações';
        const lastDate = lastMovement?.dataHora || new Date().toISOString();

        await supabase
            .from('processes')
            .update({
                last_movement: lastDate.split('T')[0],
                // Poderíamos atualizar mais metadados aqui no futuro
            })
            .eq('id', processId);

        return {
            lastMovement: movementDesc,
            date: lastDate,
            allData: data
        };
    }

    /**
     * Envelopa a resposta seguindo o padrão PJe/PDPJ.
     */
    static wrapResponse(status: 'ok' | 'error' | 'in-progress', code: number, result: any, messages: string[] = []) {
        return {
            status,
            code: code.toString(),
            messages,
            result
        };
    }
}
