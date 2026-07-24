import nodemailer from 'nodemailer';
import logger from '../../../shared/logger/logger.js';

export class EtherealProvider {
  constructor() {
    this.transporter = null;
  }

  isAvailable() {
    // Development or fallback development environment helper
    return process.env.NODE_ENV !== 'production' || !process.env.RESEND_API_KEY;
  }

  async getTransporter() {
    if (this.transporter) return this.transporter;

    logger.info('EtherealProvider: Generating mock test account for local SMTP testing...');
    const testAccount = await nodemailer.createTestAccount();
    
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    logger.info('EtherealProvider: Verifying test SMTP connection...');
    await this.transporter.verify();
    logger.info('EtherealProvider: Test SMTP transporter verified successfully.');

    return this.transporter;
  }

  async send({ to, subject, text, html }) {
    const transporter = await this.getTransporter();
    const fromEmail = process.env.EMAIL_FROM || '"BitylGlow Test Security" <security-test@bitylglow.com>';

    logger.info(`EtherealProvider: Dispatching mail from "${fromEmail}" to "${to}"`);

    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info(`EtherealProvider: Dispatch completed successfully. Message ID: ${info.messageId}`);
    if (previewUrl) {
      logger.info(`EtherealProvider: Preview link: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  }
}
