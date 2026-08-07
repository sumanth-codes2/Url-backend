import logger from '../../shared/logger/logger.js';
import { ResendProvider } from './providers/resend.provider.js';
import { GmailProvider } from './providers/gmail.provider.js';
import { EtherealProvider } from './providers/ethereal.provider.js';
import { getOtpTemplate } from './templates/otp.template.js';

export class EmailService {
  constructor() {
    this.resendProvider = new ResendProvider();
    this.gmailProvider = new GmailProvider();
    this.etherealProvider = new EtherealProvider();
  }

  async sendOtpEmail(toEmail, otp) {
    const subject = 'BitylGlow Password Recovery verification OTP Code';
    const text = `Your BitylGlow password recovery OTP code is: ${otp}. It is valid for 10 minutes. If you did not request this, you can safely ignore this email.`;
    const html = getOtpTemplate(otp);

    const emailPayload = {
      to: toEmail,
      subject,
      text,
      html
    };
    if (this.resendProvider.isAvailable()) {
      logger.info('EmailService: Attempting email dispatch via Resend (Primary)...');
      return await this.resendProvider.send(emailPayload);
    }
    if (this.gmailProvider.isAvailable()) {
      logger.info('EmailService: Attempting email dispatch via Gmail SMTP...');
      return await this.gmailProvider.send(emailPayload);
    }
    if (this.etherealProvider.isAvailable()) {
      logger.info('EmailService: Attempting email dispatch via Ethereal SMTP...');
      return await this.etherealProvider.send(emailPayload);
    }

    throw new Error('Email Service Configuration Error: No email provider is configured. Set GMAIL_USER/GMAIL_PASS or RESEND_API_KEY in env.');
  }
}
