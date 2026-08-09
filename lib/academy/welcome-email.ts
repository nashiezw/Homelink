import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import { getMainPrisma } from "@/lib/db/main-prisma";

async function sendEmailWithRetry(
  integrations: any,
  to: string,
  subject: string,
  body: string,
  emailType: string = "email",
  maxRetries = 3,
  initialDelayMs = 1000,
): Promise<{ ok: boolean; message?: string }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await sendSmtpPlainEmail(integrations, to, subject, body);
    if (result.ok) {
      return result;
    }
    
    if (attempt < maxRetries - 1) {
      const delay = initialDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  try {
    const prisma = getMainPrisma();
    await prisma.auditEvent.create({
      data: {
        action: "EMAIL_SEND_FAILED",
        target: to,
        metadata: {
          emailType,
          subject,
          error: `Failed after ${maxRetries} attempts`,
          timestamp: new Date().toISOString(),
          smtpConfigured: Boolean(integrations.smtpHost && integrations.smtpPort && integrations.smtpUser),
        },
      },
    });
  } catch (logError) {
    console.error("Failed to log email error to audit:", logError);
  }
  
  return { ok: false, message: `Failed after ${maxRetries} attempts` };
}

export async function sendWelcomeEmail(userEmail: string, userName: string, _language: string = "en") {
  const settings = await getHydratedRuntimePlatformSettings();
  const platformName = settings.platformName || "HouseLink";
  
  const subject = `Welcome to ${platformName}!`;
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${platformName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .content h2 { color: #10b981; margin-top: 0; }
    .features { background-color: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; }
    .features ul { padding-left: 20px; margin: 0; }
    .features li { margin: 10px 0; }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to ${platformName}!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${userName}</strong>,</p>
      <p>Welcome to <strong>${platformName}</strong>! Your account has been successfully created.</p>
      
      <h2>✨ What You Can Do</h2>
      <div class="features">
        <ul>
          <li>Save and manage your favorite properties</li>
          <li>Submit enquiries directly to property owners</li>
          <li>Track your property searches</li>
          <li>Access your personalized dashboard</li>
        </ul>
      </div>
      
      <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const result = await sendEmailWithRetry(
      settings.integrations,
      userEmail,
      subject,
      htmlBody,
      "welcome_email"
    );
    
    return { success: result.ok, error: result.ok ? undefined : result.message };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
