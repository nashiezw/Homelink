import { getMainPrisma } from "@/lib/db/main-prisma";

export interface LearnerAnalytics {
  id: string;
  learnerId: string;
  courseId: string | null;
  lastLoginAt: Date | null;
  loginCount: number;
  lessonsCompleted: number;
  totalTimeSpent: number; // minutes
  engagementScore: number;
  riskLevel: string | null;
  date: Date;
}

export async function trackLearnerLogin(learnerId: string, courseId?: string): Promise<void> {
  const prisma = getMainPrisma();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get or create today's analytics record
  const existing = await prisma.learnerAnalytics.findFirst({
    where: {
      learnerId,
      courseId: courseId || null,
      date: today,
    },
  });

  if (existing) {
    await prisma.learnerAnalytics.update({
      where: { id: existing.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: existing.loginCount + 1,
      },
    });
  } else {
    await prisma.learnerAnalytics.create({
      data: {
        learnerId,
        courseId: courseId || null,
        lastLoginAt: new Date(),
        loginCount: 1,
        lessonsCompleted: 0,
        totalTimeSpent: 0,
        engagementScore: 0,
        date: today,
      },
    });
  }
}

export async function trackLessonCompletion(learnerId: string, courseId: string): Promise<void> {
  const prisma = getMainPrisma();
  
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
      data: {
        lessonsCompleted: existing.lessonsCompleted + 1,
      },
    });
  } else {
    await prisma.learnerAnalytics.create({
      data: {
        learnerId,
        courseId,
        lastLoginAt: new Date(),
        loginCount: 0,
        lessonsCompleted: 1,
        totalTimeSpent: 0,
        engagementScore: 0,
        date: today,
      },
    });
  }
}

export async function trackTimeSpent(learnerId: string, courseId: string, minutes: number): Promise<void> {
  const prisma = getMainPrisma();
  
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
      data: {
        totalTimeSpent: existing.totalTimeSpent + minutes,
      },
    });
  } else {
    await prisma.learnerAnalytics.create({
      data: {
        learnerId,
        courseId,
        lastLoginAt: new Date(),
        loginCount: 0,
        lessonsCompleted: 0,
        totalTimeSpent: minutes,
        engagementScore: 0,
        date: today,
      },
    });
  }
}

export async function calculateEngagementScore(learnerId: string, courseId: string): Promise<number> {
  const prisma = getMainPrisma();
  
  // Get analytics for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const analytics = await prisma.learnerAnalytics.findMany({
    where: {
      learnerId,
      courseId,
      date: { gte: thirtyDaysAgo },
    },
  });

  if (analytics.length === 0) return 0;

  // Calculate score based on multiple factors
  const totalLogins = analytics.reduce((sum, a) => sum + a.loginCount, 0);
  const totalLessons = analytics.reduce((sum, a) => sum + a.lessonsCompleted, 0);
  const totalTime = analytics.reduce((sum, a) => sum + a.totalTimeSpent, 0);
  const activeDays = analytics.length;

  // Normalize and weight factors
  const loginScore = Math.min(totalLogins / 30, 1) * 25; // Max 25 points
  const lessonScore = Math.min(totalLessons / 20, 1) * 35; // Max 35 points
  const timeScore = Math.min(totalTime / 600, 1) * 25; // Max 25 points (10 hours)
  const consistencyScore = Math.min(activeDays / 30, 1) * 15; // Max 15 points

  const totalScore = loginScore + lessonScore + timeScore + consistencyScore;
  return Math.round(totalScore);
}

export async function updateEngagementScore(learnerId: string, courseId: string): Promise<void> {
  const prisma = getMainPrisma();
  
  const score = await calculateEngagementScore(learnerId, courseId);
  
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
      data: { engagementScore: score },
    });
  }
}

export async function getLearnerAnalytics(learnerId: string, courseId?: string, days: number = 30): Promise<LearnerAnalytics[]> {
  const prisma = getMainPrisma();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: any = {
    learnerId,
    date: { gte: startDate },
  };

  if (courseId) {
    where.courseId = courseId;
  }

  const analytics = await prisma.learnerAnalytics.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return analytics;
}

export async function getCourseAnalytics(courseId: string, days: number = 30): Promise<{
  totalLearners: number;
  averageEngagementScore: number;
  averageLessonsCompleted: number;
  averageTimeSpent: number;
  atRiskCount: number;
}> {
  const prisma = getMainPrisma();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const analytics = await prisma.learnerAnalytics.findMany({
    where: {
      courseId,
      date: { gte: startDate },
    },
  });

  if (analytics.length === 0) {
    return {
      totalLearners: 0,
      averageEngagementScore: 0,
      averageLessonsCompleted: 0,
      averageTimeSpent: 0,
      atRiskCount: 0,
    };
  }

  const totalLearners = new Set(analytics.map(a => a.learnerId)).size;
  const averageEngagementScore = analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length;
  const averageLessonsCompleted = analytics.reduce((sum, a) => sum + a.lessonsCompleted, 0) / analytics.length;
  const averageTimeSpent = analytics.reduce((sum, a) => sum + a.totalTimeSpent, 0) / analytics.length;
  const atRiskCount = analytics.filter(a => a.riskLevel === "HIGH").length;

  return {
    totalLearners,
    averageEngagementScore: Math.round(averageEngagementScore),
    averageLessonsCompleted: Math.round(averageLessonsCompleted),
    averageTimeSpent: Math.round(averageTimeSpent),
    atRiskCount,
  };
}
