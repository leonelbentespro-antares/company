import axios from 'axios';

/**
 * Serviço para comunicação com a API Oficial do WhatsApp Business (Meta)
 */
export const metaWhatsAppService = {
    /**
     * Envia mensagem de texto simples
     */
    async sendTextMessage(phoneNumberId: string, apiToken: string, to: string, text: string) {
        try {
            const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
            const response = await axios.post(
                url,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: to,
                    type: 'text',
                    text: { body: text }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('[MetaWhatsApp] Error sending text:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'Erro ao enviar mensagem via Meta');
        }
    },

    /**
     * Envia mídia (imagem, vídeo, documento, áudio)
     */
    async sendMediaMessage(
        phoneNumberId: string, 
        apiToken: string, 
        to: string, 
        mediaUrl: string, 
        caption: string = '', 
        mediaType: 'image' | 'video' | 'audio' | 'document' = 'image'
    ) {
        try {
            const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
            
            // A API Oficial da Meta pode enviar mídia por link (link)
            const payload: any = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: mediaType,
            };

            payload[mediaType] = {
                link: mediaUrl
            };

            if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
                payload[mediaType].caption = caption;
            }

            const response = await axios.post(
                url,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('[MetaWhatsApp] Error sending media:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'Erro ao enviar mídia via Meta');
        }
    }
};
