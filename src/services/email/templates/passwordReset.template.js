export const getPasswordResetTemplate = (username) => {
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
          <h2 style="font-size: 20px; font-weight: 800; color: #0c3ebb; margin-top: 0; margin-bottom: 12px;">Password Reset Successful</h2>
          <p style="margin-bottom: 20px; font-size: 15px; color: #475569;">Hello ${username},</p>
          <p style="margin-bottom: 20px; font-size: 15px; color: #475569;">Your BitylGlow account password was changed successfully. You can now log in using your new credentials.</p>
        </div>

        <!-- Footer Legal -->
        <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
          <p style="margin: 0;">&copy; 2026 BitylGlow URL Management Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
};
