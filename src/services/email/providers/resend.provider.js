import { Resend } from 'resend';
import logger from '../../../shared/logger/logger.js';

export class ResendProvider {
  constructor() {
    this.resend = null;
    if (process.env.RESEND_API_KEY) {
      logger.info('EmailService: Initializing Resend primary provider...');
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  isAvailable() {
    return !!this.resend;
  }

  async send({ to, subject, text, html }) {
    if (!this.isAvailable()) {
      throw new Error('Resend API Key is not configured.');
    }

    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    logger.info(`ResendProvider: Sending email from "${fromEmail}" to "${to}"`);

    const result = await this.resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text,
      html
    });

    if (result.error) {
      logger.error('ResendProvider send error details:', result.error);
      throw new Error(result.error.message || 'Resend provider failed to send email');
    }

    const msgId = result.data?.id || 'resend-sent';
    logger.info(`ResendProvider: Email delivered successfully. Message ID: ${msgId}`);
    return { success: true, messageId: msgId };
  }
}
