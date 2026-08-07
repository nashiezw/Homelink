import { getMainPrisma } from "@/lib/db/main-prisma";
import { getRuntimePlatformSettings } from "@/lib/settings/runtime";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import { getActiveEmailTemplate } from "@/lib/academy/email-template-repository";
import { getAcademyBranding } from "@/lib/academy/branding-repository";

export async function sendWaitlistNotificationEmail(
  learnerEmail: string,
  learnerName: string,
  courseTitle: string,
  language: string = "en",
) {
  try {
    const settings = getRuntimePlatformSettings();
    const integrations = settings.integrations;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const courseUrl = `${baseUrl}/academy`;

    // Try to get custom email template from database
    const customTemplate = await getActiveEmailTemplate("waitlist_notification", language);
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
        .replace(/\{\{courseUrl\}\}/g, courseUrl)
        .replace(/\{\{primaryColor\}\}/g, branding.primaryColor)
        .replace(/\{\{secondaryColor\}\}/g, branding.secondaryColor)
        .replace(/\{\{logoUrl\}\}/g, branding.logoUrl || "");
    } else {
      // Fallback to default template
      subject = `Spot Available: ${courseTitle}`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Good news! A spot has opened up.</h2>
          <p>Dear ${learnerName},</p>
          <p>A spot has become available for <strong>${courseTitle}</strong>.</p>
          <p>This is on a first-come, first-served basis. Please register as soon as possible to secure your spot.</p>
          <p><a href="${courseUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px;">Register Now</a></p>
          <p>If you are no longer interested, you can ignore this email.</p>
          <p>Thank you,<br>HouseLink Academy Team</p>
        </div>
      `;
    }

    const result = await sendSmtpPlainEmail(integrations, learnerEmail, subject, body);
    
    if (!result.ok) {
      console.error("Failed to send waitlist notification email:", result.message);
      return { success: false, error: result.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending waitlist notification email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function notifyWaitlistForCourse(courseId: string) {
  const prisma = getMainPrisma();
  
  try {
    // Get course capacity info
    const course = await prisma.trainingCourse.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        capacity: true,
      },
    });

    if (!course) {
      console.error(`Course ${courseId} not found`);
      return { success: false, error: "Course not found" };
    }

    // Count current enrollments
    const currentEnrollments = await prisma.academyLearnerApplication.count({
      where: {
        courseId,
        status: "APPROVED",
      },
    });

    // Check if there's capacity
    if (course.capacity && currentEnrollments >= course.capacity) {
      return { success: false, error: "No capacity available" };
    }

    // Get waitlist entries ordered by priority and creation date
    const waitlistEntries = await prisma.courseWaitlist.findMany({
      where: {
        courseId,
        enrolledAt: null, // Not yet enrolled
      },
      include: {
        learner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
    });

    const availableSpots = course.capacity ? course.capacity - currentEnrollments : waitlistEntries.length;
    const toNotify = waitlistEntries.slice(0, availableSpots);

    let notifiedCount = 0;
    const errors: string[] = [];

    for (const entry of toNotify) {
      const emailResult = await sendWaitlistNotificationEmail(
        entry.learner.email,
        entry.learner.name || "Learner",
        course.title,
      );

      // Update notifiedAt timestamp
      await prisma.courseWaitlist.update({
        where: { id: entry.id },
        data: { notifiedAt: new Date() },
      });

      if (emailResult.success) {
        notifiedCount++;
      } else {
        errors.push(`Failed to notify ${entry.learner.email}: ${emailResult.error}`);
      }
    }

    return {
      success: true,
      notifiedCount,
      totalWaitlisted: waitlistEntries.length,
      availableSpots,
      errors,
    };
  } catch (error) {
    console.error("Error notifying waitlist:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function processAllWaitlists() {
  const prisma = getMainPrisma();
  
  try {
    // Get all courses with waitlists
    const coursesWithWaitlists = await prisma.courseWaitlist.findMany({
      where: {
        enrolledAt: null,
      },
      select: {
        courseId: true,
      },
      distinct: ["courseId"],
    });

    const results = [];

    for (const { courseId } of coursesWithWaitlists) {
      const result = await notifyWaitlistForCourse(courseId);
      results.push({ courseId, ...result });
    }

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error("Error processing all waitlists:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function markWaitlistAsEnrolled(waitlistId: string) {
  const prisma = getMainPrisma();
  
  try {
    await prisma.courseWaitlist.update({
      where: { id: waitlistId },
      data: { enrolledAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking waitlist as enrolled:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
