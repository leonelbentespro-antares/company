import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

export const emailService = {
  /**
   * Envia um email usando o Resend.
   * Se o domínio não estiver verificado no Resend, use 'onboarding@resend.dev' como default.
   */
  async sendEmail(options: EmailOptions) {
    try {
      if (!resendApiKey) {
        console.warn('RESEND_API_KEY não configurada. Email não enviado.');
        return { error: 'RESEND_API_KEY missing' };
      }

      const { data, error } = await resend.emails.send({
        from: options.from || 'LexHub <onboarding@resend.dev>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      if (error) {
        console.error('Erro ao enviar email via Resend:', error);
        return { error };
      }

      return { data };
    } catch (err) {
      console.error('Erro crítico no serviço de email:', err);
      return { error: err };
    }
  }
};
