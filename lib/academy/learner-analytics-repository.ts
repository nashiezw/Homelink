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

function analyticsDay(date = new Date()) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export async function trackLearnerLogin(learnerId: string, courseId?: string): Promise<void> {
  const prisma = getMainPrisma();
  const date = analyticsDay();
  if (!courseId) {
    const existing = await prisma.learnerAnalytics.findFirst({ where: { learnerId, courseId: null, date } });
    if (existing) {
      await prisma.learnerAnalytics.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
      });
    } else {
      await prisma.learnerAnalytics.create({
        data: { learnerId, courseId: null, date, lastLoginAt: new Date(), loginCount: 1 },
      });
    }
    return;
  }

  await prisma.learnerAnalytics.upsert({
    where: { learnerId_courseId_date: { learnerId, courseId, date } },
    create: { learnerId, courseId, date, lastLoginAt: new Date(), loginCount: 1 },
    update: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
  });
}

export async function trackLessonCompletion(learnerId: string, courseId: string): Promise<void> {
  const prisma = getMainPrisma();
  const date = analyticsDay();
  const engagementScore = await calculateEngagementScore(learnerId, courseId);
  await prisma.learnerAnalytics.upsert({
    where: { learnerId_courseId_date: { learnerId, courseId, date } },
    create: { learnerId, courseId, date, lessonsCompleted: 1, engagementScore },
    update: { lessonsCompleted: { increment: 1 }, engagementScore },
  });
}

export async function trackTimeSpent(learnerId: string, courseId: string, minutes: number): Promise<void> {
  const prisma = getMainPrisma();
  const date = analyticsDay();
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (!safeMinutes) return;
  const engagementScore = await calculateEngagementScore(learnerId, courseId);
  await prisma.learnerAnalytics.upsert({
    where: { learnerId_courseId_date: { learnerId, courseId, date } },
    create: { learnerId, courseId, date, totalTimeSpent: safeMinutes, engagementScore },
    update: { totalTimeSpent: { increment: safeMinutes }, engagementScore },
  });
}

export async function calculateEngagementScore(learnerId: string, courseId: string): Promise<number> {
  const prisma = getMainPrisma();
  
  try {
    // Get lesson progress for the learner in this course
    const lessonProgress = await prisma.lessonProgress.findMany({
      where: {
        agentId: learnerId,
        lesson: {
          section: {
            module: {
              courseId,
            },
          },
        },
      },
    });

    // Get course progress
    const courseProgress = await prisma.courseProgress.findFirst({
      where: {
        agentId: learnerId,
        courseId,
      },
    });

    // Calculate engagement score based on:
    // - Lesson completion rate
    // - Time spent learning
    // - Recent activity
    
    const totalLessons = lessonProgress.length;
    const completedLessons = lessonProgress.filter(lp => lp.completedAt !== null).length;
    const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    
    const totalMinutes = lessonProgress.reduce((sum, lp) => sum + lp.readingSeconds / 60, 0);
    
    // Last activity from course progress
    const lastActivity = courseProgress?.updatedAt || new Date();
    const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate score (0-100)
    let score = 0;
    score += completionRate * 0.4; // 40% weight on completion
    score += Math.min(totalMinutes / 300, 1) * 30; // 30% weight on time (5 hours max)
    score += Math.max(0, 1 - daysSinceActivity / 30) * 30; // 30% weight on recency
    
    return Math.round(score);
  } catch {
    return 0;
  }
}

export async function updateEngagementScore(learnerId: string, courseId: string): Promise<void> {
  const prisma = getMainPrisma();
  const date = analyticsDay();
  const engagementScore = await calculateEngagementScore(learnerId, courseId);
  await prisma.learnerAnalytics.upsert({
    where: { learnerId_courseId_date: { learnerId, courseId, date } },
    create: { learnerId, courseId, date, engagementScore },
    update: { engagementScore },
  });
}

export async function getLearnerAnalytics(learnerId: string, courseId?: string, days: number = 30): Promise<LearnerAnalytics[]> {
  const prisma = getMainPrisma();
  const since = analyticsDay(new Date(Date.now() - Math.max(1, days) * 86400000));
  const rows = await prisma.learnerAnalytics.findMany({
    where: {
      learnerId,
      ...(courseId ? { courseId } : {}),
      date: { gte: since },
    },
    orderBy: { date: "desc" },
  });
  if (rows.length) return rows;

  if (!courseId) return [];

  const [lessonProgress, courseProgress] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: {
        agentId: learnerId,
        lesson: {
          section: {
            module: { courseId },
          },
        },
      },
      orderBy: { lastViewedAt: "desc" },
    }),
    prisma.courseProgress.findUnique({ where: { courseId_agentId: { courseId, agentId: learnerId } } }),
  ]);
  if (!lessonProgress.length && !courseProgress) return [];

  const completedLessons = lessonProgress.filter((row) => row.completedAt).length;
  const totalTimeSpent = Math.round(lessonProgress.reduce((sum, row) => sum + row.readingSeconds, 0) / 60);
  const latestLessonActivity = lessonProgress[0]?.completedAt ?? lessonProgress[0]?.lastViewedAt ?? null;
  const latestActivity = latestLessonActivity && courseProgress?.updatedAt
    ? (latestLessonActivity > courseProgress.updatedAt ? latestLessonActivity : courseProgress.updatedAt)
    : latestLessonActivity ?? courseProgress?.updatedAt ?? new Date();

  return [{
    id: "derived",
    learnerId,
    courseId,
    lastLoginAt: null,
    loginCount: 0,
    lessonsCompleted: completedLessons,
    totalTimeSpent,
    engagementScore: await calculateEngagementScore(learnerId, courseId),
    riskLevel: null,
    date: latestActivity,
  }];
}

export async function getCourseAnalytics(courseId: string, _days: number = 30): Promise<{
  totalLearners: number;
  averageEngagementScore: number;
  averageLessonsCompleted: number;
  averageTimeSpent: number;
  atRiskCount: number;
}> {
  const prisma = getMainPrisma();
  
  try {
    // Get all enrolments for this course
    const enrolments = await prisma.courseEnrolment.findMany({
      where: { courseId },
    });
    
    const totalLearners = enrolments.length;
    
    if (totalLearners === 0) {
      return {
        totalLearners: 0,
        averageEngagementScore: 0,
        averageLessonsCompleted: 0,
        averageTimeSpent: 0,
        atRiskCount: 0,
      };
    }
    
    // Get course progress for all learners in this course
    const courseProgressList = await prisma.courseProgress.findMany({
      where: { courseId },
    });
    
    // Get lesson progress for all learners in this course
    const lessonProgressList = await prisma.lessonProgress.findMany({
      where: {
        lesson: {
          section: {
            module: { courseId },
          },
        },
      },
    });
    
    // Calculate engagement scores for each learner
    const engagementScores: number[] = [];
    const lessonsCompletedPerLearner: number[] = [];
    const timeSpentPerLearner: number[] = [];
    let atRiskCount = 0;
    
    for (const enrolment of enrolments) {
      const learnerId = enrolment.agentId;
      
      // Get lesson progress for this learner
      const learnerLessonProgress = lessonProgressList.filter(lp => lp.agentId === learnerId);
      const completedLessons = learnerLessonProgress.filter(lp => lp.completedAt !== null).length;
      const totalMinutes = learnerLessonProgress.reduce((sum, lp) => sum + lp.readingSeconds / 60, 0);
      
      // Get course progress for this learner
      const courseProgress = courseProgressList.find(cp => cp.agentId === learnerId);
      const lastActivity = courseProgress?.updatedAt || new Date();
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate engagement score
      const totalLessons = learnerLessonProgress.length;
      const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      
      let score = 0;
      score += completionRate * 0.4; // 40% weight on completion
      score += Math.min(totalMinutes / 300, 1) * 30; // 30% weight on time (5 hours max)
      score += Math.max(0, 1 - daysSinceActivity / 30) * 30; // 30% weight on recency
      
      const engagementScore = Math.round(score);
      engagementScores.push(engagementScore);
      lessonsCompletedPerLearner.push(completedLessons);
      timeSpentPerLearner.push(totalMinutes);
      
      // At-risk criteria: engagement score < 40 or no activity in 14 days
      if (engagementScore < 40 || daysSinceActivity > 14) {
        atRiskCount++;
      }
    }
    
    const averageEngagementScore = engagementScores.length > 0 
      ? Math.round(engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length)
      : 0;
    
    const averageLessonsCompleted = lessonsCompletedPerLearner.length > 0
      ? Math.round(lessonsCompletedPerLearner.reduce((sum, count) => sum + count, 0) / lessonsCompletedPerLearner.length)
      : 0;
    
    const averageTimeSpent = timeSpentPerLearner.length > 0
      ? Math.round(timeSpentPerLearner.reduce((sum, time) => sum + time, 0) / timeSpentPerLearner.length)
      : 0;
    
    return {
      totalLearners,
      averageEngagementScore,
      averageLessonsCompleted,
      averageTimeSpent,
      atRiskCount,
    };
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    return {
      totalLearners: 0,
      averageEngagementScore: 0,
      averageLessonsCompleted: 0,
      averageTimeSpent: 0,
      atRiskCount: 0,
    };
  }
}
