import { getMainPrisma } from "@/lib/db/main-prisma";
import { calculateEngagementScore, getLearnerAnalytics } from "./learner-analytics-repository";

export interface AtRiskLearner {
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  courseId: string;
  courseTitle: string;
  engagementScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskFactors: string[];
  lastActivity: Date;
  daysSinceLastActivity: number;
}

export async function identifyAtRiskLearners(courseId?: string): Promise<AtRiskLearner[]> {
  const prisma = getMainPrisma();
  
  // Get all active enrollments
  const enrollments = await prisma.academyLearnerApplication.findMany({
    where: {
      status: "APPROVED",
      ...(courseId && { courseId }),
    },
    include: {
      learner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const atRiskLearners: AtRiskLearner[] = [];

  for (const enrollment of enrollments) {
    const analytics = await getLearnerAnalytics(enrollment.learnerId, enrollment.courseId, 30);
    const engagementScore = await calculateEngagementScore(enrollment.learnerId, enrollment.courseId);
    
    const lastActivity = analytics.length > 0 ? analytics[0].date : enrollment.createdAt;
    const daysSinceLastActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    const riskFactors: string[] = [];
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    // Risk factor 1: Low engagement score
    if (engagementScore < 30) {
      riskFactors.push("Low engagement score");
      riskLevel = "HIGH";
    } else if (engagementScore < 50) {
      riskFactors.push("Moderate engagement score");
      riskLevel = "MEDIUM";
    }

    // Risk factor 2: No recent activity
    if (daysSinceLastActivity > 14) {
      riskFactors.push("No activity in 14+ days");
      riskLevel = "HIGH";
    } else if (daysSinceLastActivity > 7) {
      riskFactors.push("No activity in 7+ days");
      riskLevel = riskLevel === "HIGH" ? "HIGH" : "MEDIUM";
    }

    // Risk factor 3: Low lesson completion rate
    const totalLessons = analytics.reduce((sum: number, a: any) => sum + a.lessonsCompleted, 0);
    if (totalLessons < 2 && daysSinceLastActivity > 3) {
      riskFactors.push("Low lesson completion");
      riskLevel = riskLevel === "HIGH" ? "HIGH" : "MEDIUM";
    }

    // Risk factor 4: Low time spent
    const totalTime = analytics.reduce((sum: number, a: any) => sum + a.totalTimeSpent, 0);
    if (totalTime < 60 && daysSinceLastActivity > 3) {
      riskFactors.push("Low time spent learning");
      riskLevel = riskLevel === "HIGH" ? "HIGH" : "MEDIUM";
    }

    // Only include if there are risk factors
    if (riskFactors.length > 0) {
      atRiskLearners.push({
        learnerId: enrollment.learner.id,
        learnerName: enrollment.learner.name,
        learnerEmail: enrollment.learner.email,
        courseId: enrollment.course.id,
        courseTitle: enrollment.course.title,
        engagementScore,
        riskLevel,
        riskFactors,
        lastActivity,
        daysSinceLastActivity,
      });
    }
  }

  // Sort by risk level (HIGH first) and days since last activity
  const riskPriority = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  atRiskLearners.sort((a, b) => {
    if (riskPriority[a.riskLevel] !== riskPriority[b.riskLevel]) {
      return riskPriority[a.riskLevel] - riskPriority[b.riskLevel];
    }
    return b.daysSinceLastActivity - a.daysSinceLastActivity;
  });

  return atRiskLearners;
}

export async function updateRiskLevel(learnerId: string, courseId: string): Promise<void> {
  const prisma = getMainPrisma();
  
  const engagementScore = await calculateEngagementScore(learnerId, courseId);
  const analytics = await getLearnerAnalytics(learnerId, courseId, 30);
  
  const lastActivity = analytics.length > 0 ? analytics[0].date : new Date();
  const daysSinceLastActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | null = null;
  
  if (engagementScore < 30 || daysSinceLastActivity > 14) {
    riskLevel = "HIGH";
  } else if (engagementScore < 50 || daysSinceLastActivity > 7) {
    riskLevel = "MEDIUM";
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.learnerAnalytics.findUnique({
    where: {
      learnerId_courseId_date: {
        learnerId,
        courseId,
        date: today,
      },
    },
  });

  if (existing) {
    await prisma.learnerAnalytics.update({
      where: { id: existing.id },
      data: { riskLevel },
    });
  }
}

export async function sendAtRiskAlert(learnerId: string, courseId: string): Promise<void> {
  // This would integrate with an email notification system
  // For now, we'll just log the alert
  const prisma = getMainPrisma();
  
  const learner = await prisma.user.findUnique({
    where: { id: learnerId },
    select: { name: true, email: true },
  });

  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
    select: { title: true },
  });

  console.log(`AT-RISK ALERT: ${learner?.name} (${learner?.email}) for course ${course?.title}`);
  console.log(`Recommendation: Send intervention email or schedule check-in call`);
}
