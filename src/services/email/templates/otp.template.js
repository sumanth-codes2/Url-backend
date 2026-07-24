export const getOtpTemplate = (otp) => {
  return `
    <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f4f6fa; padding: 40px 20px; color: #1e293b; line-height: 1.6;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        
        <!-- Header Branding -->
        <div style="background: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #ee6512;">
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Bityl<span style="color: #ee6512;">Glow</span></span>
          </div>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 35px 30px;">
          <h2 style="font-size: 20px; font-weight: 800; color: #0c3ebb; margin-top: 0; margin-bottom: 12px;">Password Reset Request</h2>
          <p style="margin-bottom: 20px; font-size: 15px; color: #475569;">We received a request to reset the password for your BitylGlow account. Use the verification code below to authorize your password recovery:</p>
          
          <!-- OTP Accent Block -->
          <div style="background: #e8f0fe; border-left: 4px solid #0c3ebb; padding: 15px 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
            <span style="display: block; font-size: 12px; text-transform: uppercase; font-weight: 700; color: #0c3ebb; letter-spacing: 1.5px; margin-bottom: 5px;">Your Verification OTP</span>
            <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: 5px;">${otp}</span>
          </div>
          
          <!-- Timing & Security Notices -->
          <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 13px; color: #64748b;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>Expiration Time:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #ee6512;"><strong>10 Minutes</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>Security Lock:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">Single-use token</td>
            </tr>
          </table>

          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 15px; font-size: 13px; color: #b45309; display: flex; gap: 8px; margin-top: 20px;">
            <div style="font-weight: 600; margin-right: 6px;">Security Notice:</div>
            <div>If you did not initiate this request, you can safely ignore this email. Your password will remain unchanged.</div>
          </div>
        </div>

        <!-- Footer Legal -->
        <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
          <p style="margin: 0;">&copy; 2026 BitylGlow URL Management Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
};
