/**
 * NotificaMe Hub API Service
 * Base URL: https://api.notificame.com.br/v1/
 */

const NOTIFICAME_BASE_URL = 'https://api.notificame.com.br/v1';

export async function notificaMeFetch(endpoint: string, method: string, apiToken: string, body?: any) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Api-Token': apiToken
    };

    const options: any = {
        method,
        headers
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${NOTIFICAME_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
        let errorData: any = { message: 'Erro na API NotificaMe' };
        try {
            errorData = await response.json();
        } catch {
            const text = await response.text();
            errorData = { message: text || 'Erro desconhecido' };
        }
        throw new Error(errorData.error?.message || errorData.message || 'Erro na API NotificaMe');
    }

    return response.json();
}

/**
 * Envia mensagem de texto via NotificaMe Hub
 */
export async function sendNotificaMeText(apiToken: string, channelId: string, to: string, text: string) {
    return notificaMeFetch('/channels/whatsapp/messages', 'POST', apiToken, {
        from: channelId,
        to,
        contents: [
            {
                type: 'text',
                text
            }
        ]
    });
}

/**
 * Envia mensagem de mídia via NotificaMe Hub
 */
export async function sendNotificaMeMedia(
    apiToken: string, 
    channelId: string, 
    to: string, 
    mediaUrl: string, 
    caption?: string,
    fileMimeType?: string
) {
    return notificaMeFetch('/channels/whatsapp/messages', 'POST', apiToken, {
        from: channelId,
        to,
        contents: [
            {
                type: 'file',
                fileUrl: mediaUrl,
                fileCaption: caption || '',
                fileMimeType: fileMimeType // audio, image, document, video
            }
        ]
    });
}

/**
 * Registra um webhook para o canal
 */
export async function subscribeNotificaMeWebhook(apiToken: string, channelId: string, webhookUrl: string) {
    return notificaMeFetch('/subscriptions', 'POST', apiToken, {
        criteria: {
            channel: channelId
        },
        webhook: {
            url: webhookUrl
        }
    });
}

/**
 * Lista os canais/dispositivos disponíveis (opcional para validação)
 */
export async function listNotificaMeChannels(apiToken: string) {
    return notificaMeFetch('/channels', 'GET', apiToken);
}
