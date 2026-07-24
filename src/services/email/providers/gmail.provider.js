import nodemailer from 'nodemailer';
import logger from '../../../shared/logger/logger.js';

export class GmailProvider {
  constructor() {
    this.transporter = null;
  }

  isAvailable() {
    return !!(process.env.GMAIL_USER && process.env.GMAIL_PASS && 
              !process.env.GMAIL_USER.includes('your_gmail_username'));
  }

  async getTransporter() {
    if (this.transporter) return this.transporter;

    logger.info('GmailProvider: Initializing Gmail SMTP transporter...');
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    // Verify SMTP connection
    logger.info('GmailProvider: Verifying SMTP connection...');
    await this.transporter.verify();
    logger.info('GmailProvider: SMTP transporter verified and connected successfully.');
    
    return this.transporter;
  }

  async send({ to, subject, text, html }) {
    if (!this.isAvailable()) {
      throw new Error('Gmail SMTP credentials are not configured.');
    }

    const transporter = await this.getTransporter();
    const fromEmail = process.env.EMAIL_FROM || `"BitylGlow Security" <${process.env.GMAIL_USER}>`;

    logger.info(`GmailProvider: Dispatching mail from "${fromEmail}" to "${to}"`);

    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html
    });

    logger.info(`GmailProvider: Email successfully dispatched. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  }
}
