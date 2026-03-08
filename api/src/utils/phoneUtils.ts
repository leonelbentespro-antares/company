/**
 * ============================================================
 * LEXHUB SAAS — PHONE NUMBER UTILITIES
 * Normalização automática de números de telefone para WhatsApp
 * ============================================================
 */

/**
 * Remove sufixos JID do WhatsApp e normaliza o número para envio.
 * Também detecta números brasileiros sem o código de país e adiciona +55.
 *
 * Exemplos:
 *   46209955790872@s.whatsapp.net → 46209955790872
 *   188068195729546@lid           → 188068195729546
 *   116866764792056:14            → 116866764792056
 *   92981800888                   → 5592981800888  (adiciona DDI do Brasil)
 *   (92) 9 8180-0888              → 5592981800888  (remove formatação)
 */
export function normalizePhone(rawPhone: string): string {
    if (!rawPhone) return '';

    // 1. Remove formatação comum (parênteses, traços, espaços, +)
    let phone = rawPhone
        .replace(/[().\-\s]/g, '')   // remove ( ) . - espaços
        .replace(/^\+/, '');          // remove + inicial

    // 2. Remove sufixos JID do WhatsApp
    phone = phone
        .replace(/@s\.whatsapp\.net$/i, '')
        .replace(/@c\.us$/i, '')
        .replace(/@lid$/i, '')
        .replace(/@g\.us$/i, '')
        .replace(/:[0-9]+$/, '');     // Remove :14 de JIDs de grupo

    // 3. Se o número parecer um número brasileiro sem o código de país (55)
    // Números do Amazonas/Brasil: 9 dígitos com DDD de 2 dígitos → 11 dígitos totais
    // Se tiver 11 dígitos começando com DDD válido 11-99, adiciona 55
    if (/^[1-9]{2}9?[0-9]{7,8}$/.test(phone) && phone.length <= 11) {
        phone = '55' + phone;
    }

    return phone;
}

/**
 * Formata um timestamp ISO para o horário de Manaus (America/Manaus, UTC-4).
 */
export function formatTimestampManaus(isoDate: string): string {
    try {
        return new Date(isoDate).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Manaus'
        });
    } catch {
        return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

/**
 * Formata uma data completa no fuso de Manaus.
 */
export function formatDateManaus(isoDate: string): string {
    try {
        return new Date(isoDate).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'America/Manaus'
        });
    } catch {
        return new Date(isoDate).toLocaleDateString('pt-BR');
    }
}
