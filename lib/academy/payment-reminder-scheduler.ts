import { getMainPrisma } from "@/lib/db/main-prisma";
import { getRuntimePlatformSettings } from "@/lib/settings/runtime";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import { getActiveEmailTemplate } from "@/lib/academy/email-template-repository";
import { getAcademyBranding } from "@/lib/academy/branding-repository";
import { getPostgresPaymentSettings } from "@/lib/admin/postgres-admin-config";

export async function sendPaymentReminderEmail(
  learnerEmail: string,
  learnerName: string,
  courseTitle: string,
  amount: number,
  currency: string,
  registrationId: string,
  reminderDay: number,
  language: string = "en",
) {
  try {
    const settings = getRuntimePlatformSettings();
    const integrations = settings.integrations;
    
    // Build payment instructions from platform payment settings
    const paymentSettings = await getPostgresPaymentSettings();
    let paymentInstructions = "";
    
    if (paymentSettings?.manualMethods && paymentSettings.manualMethods.length > 0) {
      paymentInstructions = "Available Payment Methods:\n\n";
      paymentSettings.manualMethods.forEach((method: { label: string; instructions?: string; accountName?: string; bankName?: string; accountNumber?: string; branch?: string; phoneNumber?: string }) => {
        paymentInstructions += `${method.label}\n`;
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
      });
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
    const customTemplate = await getActiveEmailTemplate("payment_reminder", language);
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
        .replace(/\{\{reminderDay\}\}/g, reminderDay.toString())
        .replace(/\{\{paymentInstructions\}\}/g, paymentInstructions.replace(/\n/g, "<br>"))
        .replace(/\{\{primaryColor\}\}/g, branding.primaryColor)
        .replace(/\{\{secondaryColor\}\}/g, branding.secondaryColor)
        .replace(/\{\{logoUrl\}\}/g, branding.logoUrl || "");
    } else {
      // Fallback to default template
      subject = `Payment Reminder: ${courseTitle}`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Reminder</h2>
          <p>Dear ${learnerName},</p>
          <p>This is a friendly reminder that your payment for <strong>${courseTitle}</strong> is still pending.</p>
          <p><strong>Amount Due:</strong> ${currency} ${amount}</p>
          <p><strong>Reference:</strong> ${registrationId}</p>
          <h3>Payment Instructions:</h3>
          <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">${paymentInstructions}</pre>
          <p>Please complete your payment as soon as possible to secure your enrollment.</p>
          <p>If you have already made the payment, please disregard this message.</p>
          <p>Thank you,<br>HouseLink Academy Team</p>
        </div>
      `;
    }

    const result = await sendSmtpPlainEmail(integrations, learnerEmail, subject, body);
    
    if (!result.ok) {
      console.error("Failed to send payment reminder email:", result.message);
      return { success: false, error: result.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending payment reminder email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function processPaymentReminders() {
  const prisma = getMainPrisma();
  
  try {
    // Get all pending payment registrations
    const pendingRegistrations = await prisma.academyLearnerApplication.findMany({
      where: {
        status: "PENDING_PAYMENT",
      },
      include: {
        learner: {
          select: {
            email: true,
            name: true,
          },
        },
        course: {
          select: {
            title: true,
          },
        },
        payment: {
          select: {
            amount: true,
            currency: true,
          },
        },
      },
    });

    const reminderDays = [3, 7, 14]; // Configurable reminder schedule
    const now = new Date();

    for (const registration of pendingRegistrations) {
      const daysSinceRegistration = Math.floor(
        (now.getTime() - registration.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we need to send a reminder for this day
      if (reminderDays.includes(daysSinceRegistration)) {
        // Check if reminder already sent for this day
        const existingReminder = await prisma.paymentReminder.findFirst({
          where: {
            registrationId: registration.id,
            reminderDay: daysSinceRegistration,
          },
        });

        if (!existingReminder) {
          // Send reminder email
          const emailResult = await sendPaymentReminderEmail(
            registration.learner.email,
            registration.learner.name || "Learner",
            registration.course.title,
            registration.payment ? Number(registration.payment.amount) : 0,
            registration.payment?.currency || "USD",
            registration.id,
            daysSinceRegistration,
          );

          // Create reminder record
          await prisma.paymentReminder.create({
            data: {
              registrationId: registration.id,
              reminderDay: daysSinceRegistration,
              sentAt: new Date(),
              delivered: emailResult.success,
            },
          });

          console.log(`Payment reminder sent for registration ${registration.id} (day ${daysSinceRegistration})`);
        }
      }
    }

    console.log(`Processed ${pendingRegistrations.length} pending payment registrations`);
    return { success: true, processed: pendingRegistrations.length };
  } catch (error) {
    console.error("Error processing payment reminders:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function markReminderAsConverted(reminderId: string) {
  const prisma = getMainPrisma();
  
  try {
    await prisma.paymentReminder.update({
      where: { id: reminderId },
      data: {
        converted: true,
        convertedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking reminder as converted:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getReminderAnalytics() {
  const prisma = getMainPrisma();
  
  try {
    const totalReminders = await prisma.paymentReminder.count();
    const deliveredReminders = await prisma.paymentReminder.count({
      where: { delivered: true },
    });
    const convertedReminders = await prisma.paymentReminder.count({
      where: { converted: true },
    });

    const conversionRate = totalReminders > 0 
      ? (convertedReminders / totalReminders) * 100 
      : 0;

    const remindersByDay = await prisma.paymentReminder.groupBy({
      by: ['reminderDay'],
      _count: true,
    });

    return {
      total: totalReminders,
      delivered: deliveredReminders,
      converted: convertedReminders,
      conversionRate: Math.round(conversionRate * 100) / 100,
      byDay: remindersByDay.map((r: { reminderDay: number; _count: number }) => ({
        day: r.reminderDay,
        count: r._count,
      })),
    };
  } catch (error) {
    console.error("Error getting reminder analytics:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
