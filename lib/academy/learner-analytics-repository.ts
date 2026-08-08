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

// Stub functions since learnerAnalytics model doesn't exist in Prisma schema
// These should be implemented using actual data models when available

export async function trackLearnerLogin(learnerId: string, courseId?: string): Promise<void> {
  // TODO: Implement using actual data models
  console.log(`Track login for learner ${learnerId} in course ${courseId}`);
}

export async function trackLessonCompletion(learnerId: string, courseId: string): Promise<void> {
  // TODO: Implement using actual data models
  console.log(`Track lesson completion for learner ${learnerId} in course ${courseId}`);
}

export async function trackTimeSpent(learnerId: string, courseId: string, minutes: number): Promise<void> {
  // TODO: Implement using actual data models
  console.log(`Track time spent for learner ${learnerId} in course ${courseId}: ${minutes} minutes`);
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
  // TODO: Implement using actual data models
  console.log(`Update engagement score for learner ${learnerId} in course ${courseId}`);
}

export async function getLearnerAnalytics(learnerId: string, courseId?: string, _days: number = 30): Promise<LearnerAnalytics[]> {
  // TODO: Implement using actual data models
  // Return empty array for now since learnerAnalytics model doesn't exist
  return [];
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

