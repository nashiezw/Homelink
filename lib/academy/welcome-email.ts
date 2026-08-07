import { getRuntimePlatformSettings } from "@/lib/settings/runtime";
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
      console.log(`Email send attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
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
  const settings = getRuntimePlatformSettings();
  const platformName = settings.platformName || "HouseLink";
  
  const subject = `Welcome to ${platformName}!`;
  const body = `Dear ${userName},

Welcome to ${platformName}! Your account has been successfully created.

We're excited to have you join our community. With your new account, you can:
- Save and manage your favorite properties
- Submit enquiries directly to property owners
- Track your property searches
- Access your personalized dashboard

If you have any questions or need assistance, please don't hesitate to reach out to our support team.

Best regards,
The ${platformName} Team`;

  try {
    const result = await sendEmailWithRetry(
      settings.integrations,
      userEmail,
      subject,
      body,
      "welcome_email"
    );
    
    return { success: result.ok, error: result.ok ? undefined : result.message };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
