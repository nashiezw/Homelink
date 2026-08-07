import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";
import { renderRegistrationEmail, renderVerificationEmail, type EmailTemplateData, type VerificationEmailData } from "@/lib/academy/email-templates";
import { getPostgresPaymentSettings } from "@/lib/admin/postgres-admin-config";
import { getActiveEmailTemplate } from "@/lib/academy/email-template-repository";
import { getAcademyBranding } from "@/lib/academy/branding-repository";
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
    
    // If this is not the last attempt, wait before retrying
    if (attempt < maxRetries - 1) {
      const delay = initialDelayMs * Math.pow(2, attempt); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      console.log(`Email send attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
    }
  }
  
  // All retries failed - log to audit for admin visibility
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

export async function sendRegistrationConfirmationEmail(
  learnerEmail: string,
  learnerName: string,
  courseTitle: string,
  amount: number,
  currency: string,
  paymentMethodId: string,
  registrationId: string,
  language: string = "en",
) {
  try {
    const settings = await getHydratedRuntimePlatformSettings();
    const integrations = settings.integrations;
    
    // Build payment instructions from platform payment settings
    const paymentSettings = await getPostgresPaymentSettings();
    let paymentInstructions = "";
    
    if (paymentSettings?.manualMethods && paymentSettings.manualMethods.length > 0) {
      const method = paymentSettings.manualMethods.find((m: { id: string }) => m.id === paymentMethodId);
      if (method) {
        paymentInstructions = `Payment Method: ${method.label}\n\n`;
        if (method.instructions) {
          paymentInstructions += `${method.instructions}\n\n`;
        }
        if (method.accountName || method.accountNumber || method.bankName || method.branch || method.phoneNumber) {
          paymentInstructions += "Bank/Account Details:\n";
          if (method.accountName) paymentInstructions += `- Account Name: ${method.accountName}\n`;
          if (method.bankName) paymentInstructions += `- Bank: ${method.bankName}\n`;
          if (method.accountNumber) paymentInstructions += `- Account Number: ${method.accountNumber}\n`;
          if (method.branch) paymentInstructions += `- Branch: ${method.branch}\n`;
          if (method.phoneNumber) paymentInstructions += `- Phone Number: ${method.phoneNumber}\n`;
        }
      }
    }
    
    if (!paymentInstructions && paymentSettings?.bankDetails) {
      // Fallback to platform bank details
      paymentInstructions = "Official HouseLink Bank Account:\n";
      Object.entries(paymentSettings.bankDetails).forEach(([key, value]) => {
        if (value) {
          const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()).trim();
          paymentInstructions += `- ${label}: ${value}\n`;
        }
      });
    }
    
    if (!paymentInstructions) {
      paymentInstructions = "Please contact support for payment details.";
    }
    
    paymentInstructions += `\nReference: ${registrationId}`;

    // Try to get custom email template from database
    const customTemplate = await getActiveEmailTemplate("registration_confirmation", language);
    let subject: string;
    let body: string;

    if (customTemplate) {
      // Use custom template with branding
      const branding = await getAcademyBranding();
      subject = customTemplate.subject.replace(/\{\{courseTitle\}\}/g, courseTitle);
      
      // Replace template variables
      body = customTemplate.htmlContent
        .replace(/\{\{learnerName\}\}/g, learnerName)
        .replace(/\{\{courseTitle\}\}/g, courseTitle)
        .replace(/\{\{amount\}\}/g, amount.toString())
        .replace(/\{\{currency\}\}/g, currency)
        .replace(/\{\{registrationId\}\}/g, registrationId)
        .replace(/\{\{paymentInstructions\}\}/g, paymentInstructions.replace(/\n/g, "<br>"))
        .replace(/\{\{primaryColor\}\}/g, branding.primaryColor)
        .replace(/\{\{secondaryColor\}\}/g, branding.secondaryColor)
        .replace(/\{\{logoUrl\}\}/g, branding.logoUrl || "");
    } else {
      // Fallback to default template
      const templateData: EmailTemplateData = {
        learnerName,
        courseTitle,
        amount,
        currency,
        registrationId,
        paymentInstructions,
      };

      subject = `Registration Confirmation: ${courseTitle}`;
      body = renderRegistrationEmail(templateData);
    }

    const result = await sendEmailWithRetry(integrations, learnerEmail, subject, body, "registration_confirmation");
    
    if (!result.ok) {
      console.error("Failed to send registration email:", result.message);
      return { success: false, error: result.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending registration email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function sendEmailVerificationEmail(
  userEmail: string,
  userName: string,
  verificationToken: string,
  language: string = "en",
) {
  try {
    const settings = await getHydratedRuntimePlatformSettings();
    const integrations = settings.integrations;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/academy/verify-email?token=${verificationToken}`;

    // Try to get custom email template from database
    const customTemplate = await getActiveEmailTemplate("email_verification", language);
    let subject: string;
    let body: string;

    if (customTemplate) {
      // Use custom template with branding
      const branding = await getAcademyBranding();
      subject = customTemplate.subject;
      
      // Replace template variables
      body = customTemplate.htmlContent
        .replace(/\{\{userName\}\}/g, userName)
        .replace(/\{\{verificationLink\}\}/g, verificationLink)
        .replace(/\{\{primaryColor\}\}/g, branding.primaryColor)
        .replace(/\{\{secondaryColor\}\}/g, branding.secondaryColor)
        .replace(/\{\{logoUrl\}\}/g, branding.logoUrl || "");
    } else {
      // Fallback to default template
      const templateData: VerificationEmailData = {
        userName,
        verificationLink,
      };

      subject = "Verify Your Email - HouseLink Academy";
      body = renderVerificationEmail(templateData);
    }

    const result = await sendEmailWithRetry(integrations, userEmail, subject, body, "email_verification");
    
    if (!result.ok) {
      console.error("Failed to send verification email:", result.message);
      return { success: false, error: result.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
