import { getRuntimePlatformSettings } from "@/lib/settings/runtime";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";

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
    const result = await sendSmtpPlainEmail(
      settings.integrations,
      userEmail,
      subject,
      body
    );
    
    return { success: result.ok, error: result.ok ? undefined : result.message };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
