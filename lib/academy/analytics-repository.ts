import { getMainPrisma } from "@/lib/db/main-prisma";

// Simple in-memory cache for analytics queries
const analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = analyticsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  analyticsCache.set(key, { data, timestamp: Date.now() });
}

function _clearCache(pattern?: string): void {
  if (pattern) {
    for (const key of analyticsCache.keys()) {
      if (key.includes(pattern)) {
        analyticsCache.delete(key);
      }
    }
  } else {
    analyticsCache.clear();
  }
}

export interface StudentProgressAnalytics {
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrolledCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  averageCompletionRate: number;
  totalLearningMinutes: number;
  lastActivityDate: Date | null;
  enrollmentDate: Date | null;
  courses: CourseProgressDetail[];
  resourceDownloadRate: number;
}

export interface CourseProgressDetail {
  courseId: string;
  courseTitle: string;
  enrollmentDate: Date;
  status: string;
  completionPercentage: number;
  learningMinutes: number;
  averageScore: number;
  completedAt: Date | null;
  lastActivityDate: Date | null;
  modulesCompleted: number;
  totalModules: number;
  lessonsCompleted: number;
  totalLessons: number;
  currentLesson: string | null;
  timeSpentPerLesson: number;
  estimatedCompletionDate: Date | null;
}

export interface CourseWideAnalytics {
  courseId: string;
  courseTitle: string;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  enrollmentRate: number;
  completionRate: number;
  averageCompletionTime: number; // in days
  averageScore: number;
  averageLearningMinutes: number;
  dropOffPoints: DropOffPoint[];
  peakUsageTimes: PeakUsageTime[];
  cohortComparison: CohortComparison[];
}

export interface DropOffPoint {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  dropOffCount: number;
  dropOffPercentage: number;
  averageTimeBeforeDropOff: number; // in minutes
}

export interface PeakUsageTime {
  hour: number;
  dayOfWeek: string;
  activityCount: number;
  percentage: number;
}

export interface CohortComparison {
  cohortName: string;
  enrollmentPeriod: string;
  totalEnrollments: number;
  completionRate: number;
  averageCompletionTime: number;
  averageScore: number;
}

export interface AssessmentPerformanceAnalytics {
  courseId: string;
  courseTitle: string;
  quizzes: QuizAnalytics[];
  assignments: AssignmentAnalytics[];
  exams: ExamAnalytics[];
}

export interface QuizAnalytics {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  passRate: number;
  averageScore: number;
  averageTimeToComplete: number; // in minutes
  mostFailedQuestions: QuestionPerformance[];
  scoreDistribution: ScoreDistribution[];
}

export interface AssignmentAnalytics {
  assignmentId: string;
  assignmentTitle: string;
  totalSubmissions: number;
  submissionRate: number;
  averageGrade: number;
  onTimeSubmissionRate: number;
  commonFeedbackThemes: string[];
  averageTimeToSubmit: number; // in days
}

export interface ExamAnalytics {
  examId: string;
  examTitle: string;
  totalAttempts: number;
  passRate: number;
  averageScore: number;
  averageTimeToComplete: number;
  retakeRate: number;
  scoreDistribution: ScoreDistribution[];
}

export interface QuestionPerformance {
  questionId: string;
  questionPrompt: string;
  failRate: number;
  averageTimeToAnswer: number;
  correctAnswerRate: number;
}

export interface ScoreDistribution {
  scoreRange: string;
  count: number;
  percentage: number;
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  riskType: "INACTIVE" | "STRUGGLING" | "STUCK" | "BEHIND_SCHEDULE";
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  riskDescription: string;
  lastActivityDate: Date | null;
  daysSinceLastActivity: number | null;
  consecutiveFailures: number;
  currentLesson: string | null;
  timeOnCurrentLesson: number;
  progressPercentage: number;
  expectedProgress: number;
  interventionRecommended: boolean;
  interventionActions: string[];
}

export interface StudentActivityLog {
  studentId: string;
  studentName: string;
  activities: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  activityType: string;
  description: string;
  timestamp: Date;
  details: Record<string, unknown>;
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
}

export interface ComparativeAnalytics {
  courseId: string;
  courseTitle: string;
  currentPeriod: AnalyticsPeriod;
  previousPeriod: AnalyticsPeriod;
  trendAnalysis: TrendAnalysis;
}

export interface AnalyticsPeriod {
  startDate: Date;
  endDate: Date;
  totalEnrollments: number;
  completionRate: number;
  averageScore: number;
  averageCompletionTime: number;
  engagementMetrics: EngagementMetrics;
}

export interface TrendAnalysis {
  enrollmentTrend: "INCREASING" | "DECREASING" | "STABLE";
  completionTrend: "INCREASING" | "DECREASING" | "STABLE";
  scoreTrend: "IMPROVING" | "DECLINING" | "STABLE";
  engagementTrend: "INCREASING" | "DECREASING" | "STABLE";
  keyInsights: string[];
  recommendations: string[];
}

export interface EngagementMetrics {
  averageSessionDuration: number;
  averageSessionsPerWeek: number;
  averageLessonsPerSession: number;
  videoCompletionRate: number;
  resourceDownloadRate: number;
  discussionParticipationRate: number;
}

export interface SessionData {
  sessionId: string;
  studentId: string;
  courseId?: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes: number;
  lessonsViewed: number;
  lessonsCompleted: number;
}

export interface CompletionPrediction {
  studentId: string;
  courseId: string;
  predictedCompletionProbability: number;
  estimatedCompletionDate: Date | null;
  riskFactors: string[];
  recommendations: string[];
}

// Session tracking functions
export async function startSession(studentId: string, courseId?: string): Promise<string> {
  const sessionId = `${studentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // In a real implementation, this would store to a Session model in the database
  // For now, we'll use in-memory tracking
  const sessionData: SessionData = {
    sessionId,
    studentId,
    courseId,
    startTime: new Date(),
    durationMinutes: 0,
    lessonsViewed: 0,
    lessonsCompleted: 0
  };
  
  // Store in cache for tracking
  setCache(`session-${sessionId}`, sessionData);
  
  return sessionId;
}

export async function endSession(sessionId: string): Promise<void> {
  const session = getCached<SessionData>(`session-${sessionId}`);
  if (session) {
    session.endTime = new Date();
    session.durationMinutes = (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60);
    setCache(`session-${sessionId}`, session);
    
    // Clear session cache after a delay
    setTimeout(() => _clearCache(`session-${sessionId}`), 60000);
  }
}

export async function trackSessionActivity(sessionId: string, lessonViewed: boolean = false, lessonCompleted: boolean = false): Promise<void> {
  const session = getCached<SessionData>(`session-${sessionId}`);
  if (session) {
    if (lessonViewed) session.lessonsViewed++;
    if (lessonCompleted) session.lessonsCompleted++;
    setCache(`session-${sessionId}`, session);
  }
}

export async function getSessionMetrics(studentId: string, days: number = 30): Promise<{
  totalSessions: number;
  averageSessionDuration: number;
  totalLessonsViewed: number;
  totalLessonsCompleted: number;
}> {
  const prisma = getMainPrisma();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Calculate from lesson progress as proxy for session data
  const lessonProgress = await prisma.lessonProgress.findMany({
    where: {
      agentId: studentId,
      lastViewedAt: { gte: startDate }
    }
  });
  
  if (lessonProgress.length === 0) {
    return {
      totalSessions: 0,
      averageSessionDuration: 0,
      totalLessonsViewed: 0,
      totalLessonsCompleted: 0
    };
  }
  
  // Group by day to estimate sessions
  const sessionsByDay = new Map<string, { count: number; duration: number; viewed: number; completed: number }>();
  
  lessonProgress.forEach(lp => {
    const dayKey = lp.lastViewedAt.toDateString();
    const existing = sessionsByDay.get(dayKey) || { count: 0, duration: 0, viewed: 0, completed: 0 };
    existing.count++;
    existing.duration += lp.readingSeconds / 60;
    existing.viewed++;
    if (lp.status === "COMPLETED") existing.completed++;
    sessionsByDay.set(dayKey, existing);
  });
  
  const sessions = Array.from(sessionsByDay.values());
  const totalSessions = sessions.length;
  const averageSessionDuration = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length 
    : 0;
  const totalLessonsViewed = sessions.reduce((sum, s) => sum + s.viewed, 0);
  const totalLessonsCompleted = sessions.reduce((sum, s) => sum + s.completed, 0);
  
  return {
    totalSessions,
    averageSessionDuration,
    totalLessonsViewed,
    totalLessonsCompleted
  };
}

export interface StudentQuizAnalytics {
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizAttempts: QuizAttemptDetail[];
  examAttempts: ExamAttemptDetail[];
  assignmentSubmissions: AssignmentSubmissionDetail[];
  overallStats: {
    totalQuizzesAttempted: number;
    averageQuizScore: number;
    quizPassRate: number;
    totalExamsAttempted: number;
    averageExamScore: number;
    examPassRate: number;
    totalAssignmentsSubmitted: number;
    averageAssignmentGrade: number;
    onTimeSubmissionRate: number;
  };
}

export interface QuizAttemptDetail {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  score: number;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  timeSpentMinutes: number;
  answers: any;
  passed: boolean;
  attemptNumber: number;
}

export interface ExamAttemptDetail {
  attemptId: string;
  examId: string;
  examTitle: string;
  courseId: string;
  courseTitle: string;
  score: number;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  timeSpentMinutes: number;
  passed: boolean;
  attemptNumber: number;
}

export interface AssignmentSubmissionDetail {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  grade: number | null;
  status: string;
  submittedAt: Date;
  gradedAt: Date | null;
  onTime: boolean;
  reviewerNote: string | null;
  attemptNumber: number;
}

export async function getStudentQuizAnalytics(studentId: string): Promise<StudentQuizAnalytics> {
  const cacheKey = `student-quiz-analytics-${studentId}`;
  const cached = getCached<StudentQuizAnalytics>(cacheKey);
  if (cached) return cached;

  const prisma = getMainPrisma();

  const [student, quizAttempts, examAttempts, assignmentSubmissions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true }
    }),
    prisma.quizAttempt.findMany({
      where: { agentId: studentId },
      include: {
        quiz: {
          include: {
            course: {
              select: { id: true, title: true }
            }
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    }),
    prisma.examAttempt.findMany({
      where: { agentId: studentId },
      include: {
        exam: {
          include: {
            course: {
              select: { id: true, title: true }
            }
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    }),
    prisma.assignmentSubmission.findMany({
      where: { agentId: studentId },
      include: {
        assignment: {
          include: {
            course: {
              select: { id: true, title: true }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })
  ]);

  if (!student) {
    throw new Error(`Student not found: ${studentId}`);
  }

  // Process quiz attempts with attempt numbers
  const quizAttemptsByQuiz = new Map<string, typeof quizAttempts>();
  quizAttempts.forEach(attempt => {
    const existing = quizAttemptsByQuiz.get(attempt.quizId) || [];
    existing.push(attempt);
    quizAttemptsByQuiz.set(attempt.quizId, existing);
  });

  const quizAttemptDetails: QuizAttemptDetail[] = [];
  quizAttemptsByQuiz.forEach((attempts, _quizId) => {
    attempts.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    attempts.forEach((attempt, index) => {
      const timeSpent = attempt.submittedAt 
        ? (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / (1000 * 60)
        : 0;
      
      quizAttemptDetails.push({
        attemptId: attempt.id,
        quizId: attempt.quizId,
        quizTitle: attempt.quiz.title,
        courseId: attempt.quiz.courseId || '',
        courseTitle: attempt.quiz.course?.title || '',
        score: Number(attempt.score),
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        timeSpentMinutes: Math.round(timeSpent),
        answers: attempt.answers,
        passed: Number(attempt.score) >= (attempt.quiz.passingPercentage || 70),
        attemptNumber: index + 1
      });
    });
  });

  // Process exam attempts with attempt numbers
  const examAttemptsByExam = new Map<string, typeof examAttempts>();
  examAttempts.forEach(attempt => {
    const existing = examAttemptsByExam.get(attempt.examId) || [];
    existing.push(attempt);
    examAttemptsByExam.set(attempt.examId, existing);
  });

  const examAttemptDetails: ExamAttemptDetail[] = [];
  examAttemptsByExam.forEach((attempts, _examId) => {
    attempts.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    attempts.forEach((attempt, index) => {
      const timeSpent = attempt.submittedAt 
        ? (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / (1000 * 60)
        : 0;
      
      examAttemptDetails.push({
        attemptId: attempt.id,
        examId: attempt.examId,
        examTitle: attempt.exam.title,
        courseId: attempt.exam.courseId,
        courseTitle: attempt.exam.course.title,
        score: Number(attempt.score),
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        timeSpentMinutes: Math.round(timeSpent),
        passed: Number(attempt.score) >= attempt.exam.passingScore,
        attemptNumber: index + 1
      });
    });
  });

  // Process assignment submissions with attempt numbers
  const assignmentSubmissionsByAssignment = new Map<string, typeof assignmentSubmissions>();
  assignmentSubmissions.forEach(submission => {
    const existing = assignmentSubmissionsByAssignment.get(submission.assignmentId) || [];
    existing.push(submission);
    assignmentSubmissionsByAssignment.set(submission.assignmentId, existing);
  });

  const assignmentSubmissionDetails: AssignmentSubmissionDetail[] = [];
  assignmentSubmissionsByAssignment.forEach((submissions, _assignmentId) => {
    submissions.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
    submissions.forEach((submission, index) => {
      assignmentSubmissionDetails.push({
        submissionId: submission.id,
        assignmentId: submission.assignmentId,
        assignmentTitle: submission.assignment.title,
        courseId: submission.assignment.courseId || '',
        courseTitle: submission.assignment.course?.title || '',
        grade: submission.grade ? Number(submission.grade) : null,
        status: submission.status,
        submittedAt: submission.submittedAt,
        gradedAt: submission.reviewedAt, // Using reviewedAt as proxy for gradedAt
        onTime: true, // Would need deadline info to determine this
        reviewerNote: submission.reviewerNote,
        attemptNumber: index + 1
      });
    });
  });

  // Calculate overall statistics
  const passedQuizzes = quizAttemptDetails.filter(q => q.passed);
  const passedExams = examAttemptDetails.filter(e => e.passed);
  const gradedAssignments = assignmentSubmissionDetails.filter(a => a.grade !== null);

  const overallStats = {
    totalQuizzesAttempted: quizAttemptDetails.length,
    averageQuizScore: quizAttemptDetails.length > 0 
      ? quizAttemptDetails.reduce((sum, q) => sum + q.score, 0) / quizAttemptDetails.length 
      : 0,
    quizPassRate: quizAttemptDetails.length > 0 
      ? (passedQuizzes.length / quizAttemptDetails.length) * 100 
      : 0,
    totalExamsAttempted: examAttemptDetails.length,
    averageExamScore: examAttemptDetails.length > 0 
      ? examAttemptDetails.reduce((sum, e) => sum + e.score, 0) / examAttemptDetails.length 
      : 0,
    examPassRate: examAttemptDetails.length > 0 
      ? (passedExams.length / examAttemptDetails.length) * 100 
      : 0,
    totalAssignmentsSubmitted: assignmentSubmissionDetails.length,
    averageAssignmentGrade: gradedAssignments.length > 0 
      ? gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments.length 
      : 0,
    onTimeSubmissionRate: assignmentSubmissionDetails.length > 0 
      ? (assignmentSubmissionDetails.filter(a => a.onTime).length / assignmentSubmissionDetails.length) * 100 
      : 0
  };

  const result: StudentQuizAnalytics = {
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    quizAttempts: quizAttemptDetails,
    examAttempts: examAttemptDetails,
    assignmentSubmissions: assignmentSubmissionDetails,
    overallStats
  };

  setCache(cacheKey, result);
  return result;
}

export async function getStudentProgressAnalytics(studentId: string): Promise<StudentProgressAnalytics> {
  const cacheKey = `student-progress-${studentId}`;
  const cached = getCached<StudentProgressAnalytics>(cacheKey);
  if (cached) return cached;

  const prisma = getMainPrisma();

  const [student, enrollments, progress, lessonProgress, libraryDownloads] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true }
    }),
    prisma.courseEnrolment.findMany({
      where: { agentId: studentId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                sections: {
                  include: {
                    lessons: true
                  }
                }
              }
            }
          }
        }
      }
    }),
    prisma.courseProgress.findMany({
      where: { agentId: studentId },
      include: { course: true }
    }),
    prisma.lessonProgress.findMany({
      where: { agentId: studentId },
      include: { lesson: { include: { section: { include: { module: true } } } } }
    }),
    // Fetch library download data for resource download rate calculation
    prisma.libraryDownloadAccess.findMany({
      where: { userId: studentId },
      select: { downloadCount: true, createdAt: true }
    })
  ]);

  if (!student) {
    throw new Error("Student not found");
  }

  const coursesProgress = enrollments.map(enrolment => {
    const courseProgress = progress.find(p => p.courseId === enrolment.courseId);
    const courseLessons = enrolment.course.modules.flatMap(m => 
      m.sections.flatMap(s => s.lessons)
    );
    const completedLessons = lessonProgress.filter(lp => 
      lp.lesson.section.module.courseId === enrolment.courseId && lp.status === "COMPLETED"
    );

    const totalLessons = courseLessons.length;
    const modulesCompleted = enrolment.course.modules.filter(m => {
      const moduleLessons = m.sections.flatMap(s => s.lessons);
      const completedModuleLessons = completedLessons.filter(cl => 
        moduleLessons.some(ml => ml.id === cl.lessonId)
      );
      return completedModuleLessons.length === moduleLessons.length;
    }).length;

    const totalModules = enrolment.course.modules.length;
    const currentLesson = lessonProgress
      .filter(lp => lp.lesson.section.module.courseId === enrolment.courseId && lp.status !== "COMPLETED")
      .sort((a, b) => b.lastViewedAt.getTime() - a.lastViewedAt.getTime())[0];

    const totalLearningMinutes = completedLessons.reduce((sum, lp) => 
      sum + Math.floor(lp.readingSeconds / 60), 0
    );

    const averageTimePerLesson = totalLessons > 0 ? totalLearningMinutes / totalLessons : 0;

    // Estimate completion date based on current pace
    const estimatedCompletionDate = courseProgress?.percentComplete && courseProgress.percentComplete > 0
      ? new Date(Date.now() + ((100 - courseProgress.percentComplete) / courseProgress.percentComplete) * 
          (Date.now() - enrolment.enrolledAt.getTime()))
      : null;

    return {
      courseId: enrolment.course.id,
      courseTitle: enrolment.course.title,
      enrollmentDate: enrolment.enrolledAt,
      status: courseProgress?.status || "NOT_STARTED",
      completionPercentage: courseProgress?.percentComplete || 0,
      learningMinutes: courseProgress?.learningMinutes || 0,
      averageScore: Number(courseProgress?.averageScore || 0),
      completedAt: courseProgress?.completedAt || null,
      lastActivityDate: currentLesson?.lastViewedAt || enrolment.enrolledAt,
      modulesCompleted,
      totalModules,
      lessonsCompleted: completedLessons.length,
      totalLessons,
      currentLesson: currentLesson?.lesson.title || null,
      timeSpentPerLesson: averageTimePerLesson,
      estimatedCompletionDate
    };
  });

  const totalCourses = coursesProgress.length;
  const completedCourses = coursesProgress.filter(c => c.status === "COMPLETED").length;
  const inProgressCourses = coursesProgress.filter(c => c.status === "IN_PROGRESS").length;
  const averageCompletionRate = totalCourses > 0 
    ? coursesProgress.reduce((sum, c) => sum + c.completionPercentage, 0) / totalCourses 
    : 0;
  const totalLearningMinutes = coursesProgress.reduce((sum, c) => sum + c.learningMinutes, 0);
  const lastActivityDate = coursesProgress.length > 0
    ? coursesProgress.reduce((latest, c) => 
        c.lastActivityDate && c.lastActivityDate > latest ? c.lastActivityDate : latest, 
        new Date(0)
      )
    : null;
  const enrollmentDate = coursesProgress.length > 0
    ? coursesProgress.reduce((earliest, c) => 
        c.enrollmentDate < earliest ? c.enrollmentDate : earliest, 
        new Date()
      )
    : null;

  // Calculate resource download rate from library download data
  const _totalDownloads = libraryDownloads.reduce((sum, ld) => sum + ld.downloadCount, 0);
  const resourceDownloadRate = libraryDownloads.length > 0 
    ? (libraryDownloads.filter(ld => ld.downloadCount > 0).length / libraryDownloads.length) * 100 
    : 0;

  const result = {
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    enrolledCourses: totalCourses,
    completedCourses,
    inProgressCourses,
    averageCompletionRate,
    totalLearningMinutes,
    lastActivityDate,
    enrollmentDate,
    courses: coursesProgress,
    resourceDownloadRate
  };
  
  setCache(cacheKey, result);
  return result;
}

export async function getCourseWideAnalytics(courseId: string): Promise<CourseWideAnalytics> {
  const cacheKey = `course-wide-${courseId}`;
  const cached = getCached<CourseWideAnalytics>(cacheKey);
  if (cached) return cached;

  const prisma = getMainPrisma();

  const [course, enrollments, progress, lessonProgress] = await Promise.all([
    prisma.trainingCourse.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            sections: {
              include: {
                lessons: true
              }
            }
          }
        }
      }
    }),
    prisma.courseEnrolment.findMany({
      where: { courseId },
      include: { course: true }
    }),
    prisma.courseProgress.findMany({
      where: { courseId }
    }),
    prisma.lessonProgress.findMany({
      where: { 
        lesson: { 
          section: { 
            module: { courseId } 
          } 
        } 
      },
      include: { 
        lesson: { 
          include: { 
            section: { 
              include: { 
                module: true 
              } 
            } 
          } 
        } 
      }
    })
  ]);

  if (!course) {
    throw new Error("Course not found");
  }

  const totalEnrollments = enrollments.length;
  const activeEnrollments = enrollments.filter(e => e.status === "ACTIVE").length;
  const completedEnrollments = progress.filter(p => p.status === "COMPLETED").length;
  const enrollmentRate = totalEnrollments > 0 ? (activeEnrollments / totalEnrollments) * 100 : 0;
  const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

  const completedProgress = progress.filter(p => p.completedAt);
  const averageCompletionTime = completedProgress.length > 0
    ? completedProgress.reduce((sum, p) => {
        if (p.completedAt) {
          const enrollment = enrollments.find(e => e.courseId === courseId);
          if (enrollment) {
            return sum + (p.completedAt.getTime() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
          }
        }
        return sum;
      }, 0) / completedProgress.length
    : 0;

  const averageScore = progress.length > 0
    ? progress.reduce((sum, p) => sum + Number(p.averageScore), 0) / progress.length
    : 0;

  const averageLearningMinutes = progress.length > 0
    ? progress.reduce((sum, p) => sum + p.learningMinutes, 0) / progress.length
    : 0;

  // Calculate drop-off points
  const lessonCompletionCounts = new Map<string, { completed: number; total: number }>();
  course.modules.forEach(module => {
    module.sections.forEach(section => {
      section.lessons.forEach(lesson => {
        const lessonProgressForLesson = lessonProgress.filter(lp => lp.lessonId === lesson.id);
        const completed = lessonProgressForLesson.filter(lp => lp.status === "COMPLETED").length;
        lessonCompletionCounts.set(lesson.id, { completed, total: lessonProgressForLesson.length });
      });
    });
  });

  const dropOffPoints: DropOffPoint[] = [];
  lessonCompletionCounts.forEach((counts, lessonId) => {
    if (counts.total > 0) {
      const dropOffPercentage = ((counts.total - counts.completed) / counts.total) * 100;
      if (dropOffPercentage > 30) { // Only include lessons with >30% drop-off
        const lesson = course.modules
          .flatMap(m => m.sections.flatMap(s => s.lessons))
          .find(l => l.id === lessonId);
        if (lesson) {
          const moduleData = course.modules
            .find(m => m.sections.some(s => s.lessons.some(l => l.id === lessonId)));
          const lessonProgressForLesson = lessonProgress.filter(lp => lp.lessonId === lessonId);
          const averageTimeBeforeDropOff = lessonProgressForLesson.length > 0
            ? lessonProgressForLesson.reduce((sum, lp) => sum + lp.readingSeconds, 0) / lessonProgressForLesson.length / 60
            : 0;

          dropOffPoints.push({
            lessonId,
            lessonTitle: lesson.title,
            moduleId: moduleData?.id || "",
            moduleTitle: moduleData?.title || "",
            dropOffCount: counts.total - counts.completed,
            dropOffPercentage,
            averageTimeBeforeDropOff
          });
        }
      }
    }
  });

  // Calculate peak usage times
  const activityByTime = new Map<string, number>();
  lessonProgress.forEach(lp => {
    const hour = lp.lastViewedAt.getHours();
    const day = lp.lastViewedAt.toLocaleDateString('en-US', { weekday: 'long' });
    const key = `${day}-${hour}`;
    activityByTime.set(key, (activityByTime.get(key) || 0) + 1);
  });

  const totalActivities = lessonProgress.length;
  const peakUsageTimes: PeakUsageTime[] = Array.from(activityByTime.entries())
    .map(([key, count]) => {
      const [day, hour] = key.split('-');
      return {
        hour: parseInt(hour),
        dayOfWeek: day,
        activityCount: count,
        percentage: (count / totalActivities) * 100
      };
    })
    .sort((a, b) => b.activityCount - a.activityCount)
    .slice(0, 10);

  // Cohort comparison (by month)
  const cohortMap = new Map<string, { enrollments: number; completions: number; totalScore: number; totalTime: number }>();
  enrollments.forEach(enrollment => {
    const month = enrollment.enrolledAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    const cohort = cohortMap.get(month) || { enrollments: 0, completions: 0, totalScore: 0, totalTime: 0 };
    cohort.enrollments++;
    const courseProgress = progress.find(p => p.courseId === courseId && p.agentId === enrollment.agentId);
    if (courseProgress?.status === "COMPLETED") {
      cohort.completions++;
      cohort.totalScore += Number(courseProgress.averageScore);
      if (courseProgress.completedAt) {
        cohort.totalTime += (courseProgress.completedAt.getTime() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
      }
    }
    cohortMap.set(month, cohort);
  });

  const cohortComparison: CohortComparison[] = Array.from(cohortMap.entries()).map(([month, data]) => ({
    cohortName: month,
    enrollmentPeriod: month,
    totalEnrollments: data.enrollments,
    completionRate: data.enrollments > 0 ? (data.completions / data.enrollments) * 100 : 0,
    averageCompletionTime: data.completions > 0 ? data.totalTime / data.completions : 0,
    averageScore: data.completions > 0 ? data.totalScore / data.completions : 0
  }));

  const result = {
    courseId: course.id,
    courseTitle: course.title,
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    enrollmentRate,
    completionRate,
    averageCompletionTime,
    averageScore,
    averageLearningMinutes,
    dropOffPoints,
    peakUsageTimes,
    cohortComparison
  };
  
  setCache(cacheKey, result);
  return result;
}

export async function getAssessmentPerformanceAnalytics(courseId: string): Promise<AssessmentPerformanceAnalytics> {
  const cacheKey = `assessment-performance-${courseId}`;
  const cached = getCached<AssessmentPerformanceAnalytics>(cacheKey);
  if (cached) return cached;

  const prisma = getMainPrisma();

  const [course, quizzes, assignments, exams, quizAttempts, assignmentSubmissions, examAttempts, courseEnrollments] = await Promise.all([
    prisma.trainingCourse.findUnique({ where: { id: courseId } }),
    prisma.quiz.findMany({ where: { courseId }, include: { questions: true } }),
    prisma.assignment.findMany({ where: { courseId } }),
    prisma.finalExam.findMany({ where: { courseId } }),
    prisma.quizAttempt.findMany({
      where: { quiz: { courseId } },
      include: { quiz: { include: { questions: true } } }
    }),
    prisma.assignmentSubmission.findMany({
      where: { assignment: { courseId } },
      include: { assignment: true }
    }),
    prisma.examAttempt.findMany({
      where: { exam: { courseId } },
      include: { exam: true }
    }),
    prisma.courseEnrolment.findMany({
      where: { courseId }
    })
  ]);

  if (!course) {
    throw new Error("Course not found");
  }

  // Quiz analytics
  const quizAnalytics: QuizAnalytics[] = quizzes.map(quiz => {
    const quizAttemptsForQuiz = quizAttempts.filter(qa => qa.quizId === quiz.id);
    const passedAttempts = quizAttemptsForQuiz.filter(qa => qa.status === "PASSED");
    const passRate = quizAttemptsForQuiz.length > 0 ? (passedAttempts.length / quizAttemptsForQuiz.length) * 100 : 0;
    const averageScore = quizAttemptsForQuiz.length > 0
      ? quizAttemptsForQuiz.reduce((sum, qa) => sum + Number(qa.score), 0) / quizAttemptsForQuiz.length
      : 0;
    const averageTimeToComplete = quizAttemptsForQuiz.length > 0
      ? quizAttemptsForQuiz.reduce((sum, qa) => {
          if (qa.submittedAt) {
            return sum + (qa.submittedAt.getTime() - qa.startedAt.getTime()) / (1000 * 60);
          }
          return sum;
        }, 0) / quizAttemptsForQuiz.length
      : 0;

    // Question performance analysis
    const questionPerformance: QuestionPerformance[] = quiz.questions.map(question => {
      const questionFailures = quizAttemptsForQuiz.filter(qa => {
        const answers = qa.answers as Array<{ questionId: string; answer: string }>;
        const questionAnswer = answers.find(a => a.questionId === question.id);
        return !questionAnswer || questionAnswer.answer !== question.correctAnswer;
      });
      const failRate = quizAttemptsForQuiz.length > 0 ? (questionFailures.length / quizAttemptsForQuiz.length) * 100 : 0;
      
      return {
        questionId: question.id,
        questionPrompt: question.prompt,
        failRate,
        averageTimeToAnswer: 0, // Would need detailed timing data
        correctAnswerRate: 100 - failRate
      };
    }).sort((a, b) => b.failRate - a.failRate).slice(0, 5);

    // Score distribution
    const scoreRanges = ["0-20", "21-40", "41-60", "61-80", "81-100"];
    const scoreDistribution: ScoreDistribution[] = scoreRanges.map(range => {
      const [min, max] = range.split('-').map(Number);
      const count = quizAttemptsForQuiz.filter(qa => {
        const score = Number(qa.score);
        return score >= min && score <= max;
      }).length;
      return {
        scoreRange: range,
        count,
        percentage: quizAttemptsForQuiz.length > 0 ? (count / quizAttemptsForQuiz.length) * 100 : 0
      };
    });

    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      totalAttempts: quizAttemptsForQuiz.length,
      passRate,
      averageScore,
      averageTimeToComplete,
      mostFailedQuestions: questionPerformance,
      scoreDistribution
    };
  });

  // Assignment analytics
  const assignmentAnalytics: AssignmentAnalytics[] = assignments.map(assignment => {
    const submissions = assignmentSubmissions.filter(as => as.assignmentId === assignment.id);
    const gradedSubmissions = submissions.filter(s => s.grade !== null);
    const averageGrade = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + Number(s.grade), 0) / gradedSubmissions.length
      : 0;
    
    // Calculate on-time submissions based on assignment dueDays
    const onTimeSubmissions = assignment.dueDays !== null && assignment.dueDays > 0
      ? submissions.filter(s => {
          const enrollment = courseEnrollments.find((e: any) => e.agentId === s.agentId && e.courseId === assignment.courseId);
          if (enrollment && assignment.dueDays) {
            const dueDate = new Date(enrollment.enrolledAt.getTime() + assignment.dueDays * 24 * 60 * 60 * 1000);
            return s.submittedAt <= dueDate;
          }
          return true; // If no enrollment found, consider it on-time
        }).length
      : submissions.length;
    const onTimeSubmissionRate = submissions.length > 0 ? (onTimeSubmissions / submissions.length) * 100 : 0;

    // Calculate average time to submit (from enrollment to submission)
    const averageTimeToSubmit = submissions.length > 0
      ? submissions.reduce((sum, s) => {
          const enrollment = courseEnrollments.find((e: any) => e.agentId === s.agentId && e.courseId === assignment.courseId);
          if (enrollment) {
            const days = (s.submittedAt.getTime() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }
          return sum + 0;
        }, 0) / submissions.length
      : 0;

    // Extract common feedback themes from graded submissions
    const commonFeedbackThemes = gradedSubmissions.length > 0 
      ? ["Needs improvement in structure", "Good content quality", "Add more examples"] // Simplified - could use NLP for real analysis
      : [];

    return {
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      totalSubmissions: submissions.length,
      submissionRate: courseEnrollments.length > 0 ? (submissions.length / courseEnrollments.length) * 100 : 0,
      averageGrade,
      onTimeSubmissionRate,
      commonFeedbackThemes,
      averageTimeToSubmit
    };
  });

  // Exam analytics
  const examAnalytics: ExamAnalytics[] = exams.map(exam => {
    const examAttemptsForExam = examAttempts.filter(ea => ea.examId === exam.id);
    const passedAttempts = examAttemptsForExam.filter(ea => ea.status === "PASSED");
    const passRate = examAttemptsForExam.length > 0 ? (passedAttempts.length / examAttemptsForExam.length) * 100 : 0;
    const averageScore = examAttemptsForExam.length > 0
      ? examAttemptsForExam.reduce((sum, ea) => sum + Number(ea.score), 0) / examAttemptsForExam.length
      : 0;
    const averageTimeToComplete = examAttemptsForExam.length > 0
      ? examAttemptsForExam.reduce((sum, ea) => {
          if (ea.submittedAt) {
            return sum + (ea.submittedAt.getTime() - ea.startedAt.getTime()) / (1000 * 60);
          }
          return sum;
        }, 0) / examAttemptsForExam.length
      : 0;
    
    // Calculate retake rate (students who took exam more than once)
    const studentAttemptCounts = new Map<string, number>();
    examAttemptsForExam.forEach(ea => {
      studentAttemptCounts.set(ea.agentId, (studentAttemptCounts.get(ea.agentId) || 0) + 1);
    });
    const studentsWithRetakes = Array.from(studentAttemptCounts.values()).filter(count => count > 1).length;
    const retakeRate = studentAttemptCounts.size > 0 ? (studentsWithRetakes / studentAttemptCounts.size) * 100 : 0;

    // Score distribution
    const scoreRanges = ["0-20", "21-40", "41-60", "61-80", "81-100"];
    const scoreDistribution: ScoreDistribution[] = scoreRanges.map(range => {
      const [min, max] = range.split('-').map(Number);
      const count = examAttemptsForExam.filter(ea => {
        const score = Number(ea.score);
        return score >= min && score <= max;
      }).length;
      return {
        scoreRange: range,
        count,
        percentage: examAttemptsForExam.length > 0 ? (count / examAttemptsForExam.length) * 100 : 0
      };
    });

    return {
      examId: exam.id,
      examTitle: exam.title,
      totalAttempts: examAttemptsForExam.length,
      passRate,
      averageScore,
      averageTimeToComplete,
      retakeRate,
      scoreDistribution
    };
  });

  const result = {
    courseId: course.id,
    courseTitle: course.title,
    quizzes: quizAnalytics,
    assignments: assignmentAnalytics,
    exams: examAnalytics
  };
  
  setCache(cacheKey, result);
  return result;
}

export async function getAtRiskStudents(courseId?: string): Promise<AtRiskStudent[]> {
  const cacheKey = `at-risk-${courseId || 'all'}`;
  const cached = getCached<AtRiskStudent[]>(cacheKey);
  if (cached) return cached;

  const prisma = getMainPrisma();

  const whereClause = courseId 
    ? { courseId }
    : {};

  const [enrollments, progress, lessonProgress, quizAttempts] = await Promise.all([
    prisma.courseEnrolment.findMany({
      where: whereClause,
      include: { course: true }
    }),
    prisma.courseProgress.findMany({
      where: courseId ? { courseId } : {}
    }),
    prisma.lessonProgress.findMany({
      where: courseId 
        ? { lesson: { section: { module: { courseId } } } }
        : {},
      include: { 
        lesson: { 
          include: { 
            section: { 
              include: { 
                module: true 
              } 
            } 
          } 
        } 
      }
    }),
    prisma.quizAttempt.findMany({
      where: courseId ? { quiz: { courseId } } : {},
      include: { quiz: true }
    })
  ]);

  // Fetch user data for names and emails separately
  const userIds = enrollments.map(e => e.agentId);
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds }
    },
    select: { id: true, name: true, email: true }
  });

  const atRiskStudents: AtRiskStudent[] = [];

  const now = new Date();
  const inactiveThresholdDays = 14;
  const stuckThresholdDays = 7;
  const consecutiveFailureThreshold = 3;

  // Create a map for quick user lookup
  const userMap = new Map(users.map(u => [u.id, u]));

  for (const enrollment of enrollments) {
    const user = userMap.get(enrollment.agentId);
    const courseProgress = progress.find(p => p.courseId === enrollment.courseId && p.agentId === enrollment.agentId);
    const studentLessonProgress = lessonProgress.filter(lp => lp.agentId === enrollment.agentId);
    const studentQuizAttempts = quizAttempts.filter(qa => qa.agentId === enrollment.agentId);

    // Check for inactive students
    const lastActivity = studentLessonProgress.length > 0
      ? studentLessonProgress.reduce((latest, lp) => 
          lp.lastViewedAt > latest ? lp.lastViewedAt : latest, 
          new Date(0)
        )
      : enrollment.enrolledAt;

    const daysSinceLastActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastActivity > inactiveThresholdDays && courseProgress?.status !== "COMPLETED") {
      atRiskStudents.push({
        studentId: enrollment.agentId,
        studentName: user?.name || "",
        studentEmail: user?.email || "",
        courseId: enrollment.courseId,
        courseTitle: enrollment.course.title,
        riskType: "INACTIVE",
        riskLevel: daysSinceLastActivity > 30 ? "HIGH" : "MEDIUM",
        riskDescription: `No activity for ${daysSinceLastActivity} days`,
        lastActivityDate: lastActivity,
        daysSinceLastActivity,
        consecutiveFailures: 0,
        currentLesson: null,
        timeOnCurrentLesson: 0,
        progressPercentage: courseProgress?.percentComplete || 0,
        expectedProgress: 0,
        interventionRecommended: true,
        interventionActions: ["Send reminder email", "Schedule check-in call"]
      });
      continue;
    }

    // Check for stuck students
    const currentLesson = studentLessonProgress
      .filter(lp => lp.status !== "COMPLETED")
      .sort((a, b) => b.lastViewedAt.getTime() - a.lastViewedAt.getTime())[0];

    if (currentLesson) {
      const daysOnCurrentLesson = Math.floor((now.getTime() - currentLesson.lastViewedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOnCurrentLesson > stuckThresholdDays) {
        atRiskStudents.push({
          studentId: enrollment.agentId,
          studentName: user?.name || "",
          studentEmail: user?.email || "",
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.title,
          riskType: "STUCK",
          riskLevel: daysOnCurrentLesson > 14 ? "HIGH" : "MEDIUM",
          riskDescription: `Stuck on same lesson for ${daysOnCurrentLesson} days`,
          lastActivityDate: currentLesson.lastViewedAt,
          daysSinceLastActivity: daysOnCurrentLesson,
          consecutiveFailures: 0,
          currentLesson: currentLesson.lesson.title,
          timeOnCurrentLesson: Math.floor(currentLesson.readingSeconds / 60),
          progressPercentage: courseProgress?.percentComplete || 0,
          expectedProgress: 0,
          interventionRecommended: true,
          interventionActions: ["Provide additional resources", "Offer tutoring session"]
        });
        continue;
      }
    }

    // Check for struggling students (consecutive quiz failures)
    const failedQuizzes = studentQuizAttempts.filter(qa => qa.status === "FAILED" || Number(qa.score) < 70);
    if (failedQuizzes.length >= consecutiveFailureThreshold) {
      atRiskStudents.push({
        studentId: enrollment.agentId,
        studentName: user?.name || "",
        studentEmail: user?.email || "",
        courseId: enrollment.courseId,
        courseTitle: enrollment.course.title,
        riskType: "STRUGGLING",
        riskLevel: failedQuizzes.length > 5 ? "HIGH" : "MEDIUM",
        riskDescription: `Failed ${failedQuizzes.length} consecutive assessments`,
        lastActivityDate: lastActivity,
        daysSinceLastActivity,
        consecutiveFailures: failedQuizzes.length,
        currentLesson: currentLesson?.lesson.title || null,
        timeOnCurrentLesson: currentLesson ? Math.floor(currentLesson.readingSeconds / 60) : 0,
        progressPercentage: courseProgress?.percentComplete || 0,
        expectedProgress: 0,
        interventionRecommended: true,
        interventionActions: ["Schedule academic counseling", "Review study materials"]
      });
    }

    // Check for students behind schedule
    if (courseProgress) {
      const enrollmentAge = Math.floor((now.getTime() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24));
      const expectedProgress = Math.min(100, (enrollmentAge / 90) * 100); // Assume 90-day expected completion
      if (courseProgress.percentComplete < expectedProgress - 20 && courseProgress.status !== "COMPLETED") {
        atRiskStudents.push({
          studentId: enrollment.agentId,
          studentName: user?.name || "",
          studentEmail: user?.email || "",
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.title,
          riskType: "BEHIND_SCHEDULE",
          riskLevel: (expectedProgress - courseProgress.percentComplete) > 40 ? "HIGH" : "MEDIUM",
          riskDescription: `Behind schedule: ${courseProgress.percentComplete}% complete vs expected ${expectedProgress}%`,
          lastActivityDate: lastActivity,
          daysSinceLastActivity,
          consecutiveFailures: 0,
          currentLesson: currentLesson?.lesson.title || null,
          timeOnCurrentLesson: currentLesson ? Math.floor(currentLesson.readingSeconds / 60) : 0,
          progressPercentage: courseProgress.percentComplete,
          expectedProgress,
          interventionRecommended: true,
          interventionActions: ["Create personalized study plan", "Adjust deadlines"]
        });
      }
    }
  }

  setCache(cacheKey, atRiskStudents);
  return atRiskStudents;
}

export async function getComparativeAnalytics(courseId: string, currentPeriodDays: number = 30): Promise<ComparativeAnalytics> {
  const cacheKey = `comparative-${courseId}-${currentPeriodDays}`;
  const cached = getCached<ComparativeAnalytics>(cacheKey);
  if (cached) return cached;

  const prisma = getMainPrisma();

  const now = new Date();
  const currentPeriodStart = new Date();
  currentPeriodStart.setDate(now.getDate() - currentPeriodDays);
  
  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - currentPeriodDays);
  const previousPeriodEnd = new Date(currentPeriodStart);

  const [course, currentEnrollments, previousEnrollments, currentProgress, previousProgress, currentLessonProgress, previousLessonProgress] = await Promise.all([
    prisma.trainingCourse.findUnique({ where: { id: courseId } }),
    prisma.courseEnrolment.findMany({
      where: {
        courseId,
        enrolledAt: { gte: currentPeriodStart, lte: now }
      }
    }),
    prisma.courseEnrolment.findMany({
      where: {
        courseId,
        enrolledAt: { gte: previousPeriodStart, lte: previousPeriodEnd }
      }
    }),
    prisma.courseProgress.findMany({
      where: {
        courseId,
        updatedAt: { gte: currentPeriodStart }
      }
    }),
    prisma.courseProgress.findMany({
      where: {
        courseId,
        updatedAt: { gte: previousPeriodStart, lte: previousPeriodEnd }
      }
    }),
    prisma.lessonProgress.findMany({
      where: {
        lesson: { section: { module: { courseId } } },
        lastViewedAt: { gte: currentPeriodStart }
      }
    }),
    prisma.lessonProgress.findMany({
      where: {
        lesson: { section: { module: { courseId } } },
        lastViewedAt: { gte: previousPeriodStart, lte: previousPeriodEnd }
      }
    })
  ]);

  if (!course) {
    throw new Error("Course not found");
  }

  // Calculate current period metrics
  const currentCompleted = currentProgress.filter(p => p.status === "COMPLETED");
  const currentCompletionRate = currentProgress.length > 0 
    ? (currentCompleted.length / currentProgress.length) * 100 
    : 0;
  const currentAverageScore = currentProgress.length > 0
    ? currentProgress.reduce((sum, p) => sum + Number(p.averageScore), 0) / currentProgress.length
    : 0;
  const currentAverageCompletionTime = currentCompleted.length > 0
    ? currentCompleted.reduce((sum, p) => {
        if (p.completedAt) {
          const enrollment = currentEnrollments.find(e => e.agentId === p.agentId);
          if (enrollment) {
            return sum + (p.completedAt.getTime() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
          }
        }
        return sum;
      }, 0) / currentCompleted.length
    : 0;

  // Calculate previous period metrics
  const previousCompleted = previousProgress.filter(p => p.status === "COMPLETED");
  const previousCompletionRate = previousProgress.length > 0 
    ? (previousCompleted.length / previousProgress.length) * 100 
    : 0;
  const previousAverageScore = previousProgress.length > 0
    ? previousProgress.reduce((sum, p) => sum + Number(p.averageScore), 0) / previousProgress.length
    : 0;
  const previousAverageCompletionTime = previousCompleted.length > 0
    ? previousCompleted.reduce((sum, p) => {
        if (p.completedAt) {
          const enrollment = previousEnrollments.find(e => e.agentId === p.agentId);
          if (enrollment) {
            return sum + (p.completedAt.getTime() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
          }
        }
        return sum;
      }, 0) / previousCompleted.length
    : 0;

  // Calculate engagement metrics from lesson progress data
  const calculateEngagementMetrics = (lessonProgressData: any[], _studentId?: string, _courseId?: string) => {
    if (lessonProgressData.length === 0) {
      return {
        averageSessionDuration: 0,
        averageSessionsPerWeek: 0,
        averageLessonsPerSession: 0,
        videoCompletionRate: 0,
        resourceDownloadRate: 0,
        discussionParticipationRate: 0
      };
    }

    // Calculate average session duration (readingSeconds converted to minutes)
    const averageSessionDuration = lessonProgressData.length > 0
      ? lessonProgressData.reduce((sum, lp) => sum + lp.readingSeconds / 60, 0) / lessonProgressData.length
      : 0;

    // Calculate sessions per week (unique days with activity)
    const uniqueDays = new Set(lessonProgressData.map(lp => lp.lastViewedAt.toDateString())).size;
    const averageSessionsPerWeek = uniqueDays > 0 ? (uniqueDays / (currentPeriodDays / 7)) : 0;

    // Average lessons per session (simplified as total lessons / unique days)
    const averageLessonsPerSession = uniqueDays > 0 ? lessonProgressData.length / uniqueDays : 0;

    // Video completion rate (lessons marked as completed)
    const completedLessons = lessonProgressData.filter(lp => lp.status === "COMPLETED").length;
    const videoCompletionRate = lessonProgressData.length > 0 ? (completedLessons / lessonProgressData.length) * 100 : 0;

    // Resource download rate - calculate from actual download data if studentId provided
    let resourceDownloadRate = 0;
    if (_studentId) {
      // This would need to be calculated from LibraryDownloadAccess data
      // For now, use lesson completion as a proxy
      resourceDownloadRate = videoCompletionRate;
    }

    // Discussion participation rate - would need discussion/comment model
    const discussionParticipationRate = 0;

    return {
      averageSessionDuration,
      averageSessionsPerWeek,
      averageLessonsPerSession,
      videoCompletionRate,
      resourceDownloadRate,
      discussionParticipationRate
    };
  };

  const currentEngagement: EngagementMetrics = calculateEngagementMetrics(currentLessonProgress);
  const previousEngagement: EngagementMetrics = calculateEngagementMetrics(previousLessonProgress);

  // Determine trends
  const enrollmentTrend: "INCREASING" | "DECREASING" | "STABLE" = 
    currentEnrollments.length > previousEnrollments.length ? "INCREASING" : 
    currentEnrollments.length < previousEnrollments.length ? "DECREASING" : "STABLE";
  const completionTrend: "INCREASING" | "DECREASING" | "STABLE" = 
    currentCompletionRate > previousCompletionRate ? "INCREASING" : 
    currentCompletionRate < previousCompletionRate ? "DECREASING" : "STABLE";
  const scoreTrend: "IMPROVING" | "DECLINING" | "STABLE" = 
    currentAverageScore > previousAverageScore ? "IMPROVING" : 
    currentAverageScore < previousAverageScore ? "DECLINING" : "STABLE";
  const engagementTrend: "INCREASING" | "DECREASING" | "STABLE" = 
    currentEngagement.averageSessionsPerWeek > previousEngagement.averageSessionsPerWeek ? "INCREASING" : 
    currentEngagement.averageSessionsPerWeek < previousEngagement.averageSessionsPerWeek ? "DECREASING" : "STABLE";

  // Generate insights and recommendations
  const keyInsights: string[] = [];
  const recommendations: string[] = [];

  if (enrollmentTrend === "INCREASING") {
    keyInsights.push(`Enrollment increased by ${((currentEnrollments.length - previousEnrollments.length) / Math.max(previousEnrollments.length, 1) * 100).toFixed(1)}% compared to previous period`);
  } else {
    keyInsights.push(`Enrollment decreased by ${((previousEnrollments.length - currentEnrollments.length) / Math.max(previousEnrollments.length, 1) * 100).toFixed(1)}% compared to previous period`);
    recommendations.push("Review marketing efforts and course promotion strategies");
  }

  if (completionTrend === "INCREASING") {
    keyInsights.push(`Completion rate improved by ${(currentCompletionRate - previousCompletionRate).toFixed(1)} percentage points`);
  } else {
    keyInsights.push(`Completion rate declined by ${(previousCompletionRate - currentCompletionRate).toFixed(1)} percentage points`);
    recommendations.push("Identify and address barriers to course completion");
  }

  if (scoreTrend === "IMPROVING") {
    keyInsights.push(`Average assessment scores improved by ${(currentAverageScore - previousAverageScore).toFixed(1)}%`);
  } else {
    keyInsights.push(`Average assessment scores declined by ${(previousAverageScore - currentAverageScore).toFixed(1)}%`);
    recommendations.push("Review assessment difficulty and provide additional learning resources");
  }

  if (currentCompletionRate < 50) {
    recommendations.push("Implement progress tracking and milestone celebrations");
  }

  if (currentAverageCompletionTime > 90) {
    recommendations.push("Consider breaking down complex modules into smaller chunks");
  }

  const result = {
    courseId: course.id,
    courseTitle: course.title,
    currentPeriod: {
      startDate: currentPeriodStart,
      endDate: now,
      totalEnrollments: currentEnrollments.length,
      completionRate: currentCompletionRate,
      averageScore: currentAverageScore,
      averageCompletionTime: currentAverageCompletionTime,
      engagementMetrics: currentEngagement
    },
    previousPeriod: {
      startDate: previousPeriodStart,
      endDate: previousPeriodEnd,
      totalEnrollments: previousEnrollments.length,
      completionRate: previousCompletionRate,
      averageScore: previousAverageScore,
      averageCompletionTime: previousAverageCompletionTime,
      engagementMetrics: previousEngagement
    },
    trendAnalysis: {
      enrollmentTrend,
      completionTrend,
      scoreTrend,
      engagementTrend,
      keyInsights,
      recommendations
    }
  };
  
  setCache(cacheKey, result);
  return result;
}

export async function predictCourseCompletion(studentId: string, courseId: string): Promise<CompletionPrediction> {
  const cacheKey = `prediction-${studentId}-${courseId}`;
  const cached = getCached<CompletionPrediction>(cacheKey);
  if (cached) return cached;

  const prisma = getMainPrisma();

  const [enrollment, progress, lessonProgress, quizAttempts] = await Promise.all([
    prisma.courseEnrolment.findFirst({
      where: { agentId: studentId, courseId },
      include: { course: true }
    }),
    prisma.courseProgress.findFirst({
      where: { agentId: studentId, courseId }
    }),
    prisma.lessonProgress.findMany({
      where: { 
        agentId: studentId,
        lesson: { section: { module: { courseId } } }
      }
    }),
    prisma.quizAttempt.findMany({
      where: { 
        agentId: studentId,
        quiz: { courseId }
      }
    })
  ]);

  if (!enrollment) {
    throw new Error("Student not enrolled in this course");
  }

  const riskFactors: string[] = [];
  const recommendations: string[] = [];
  let completionProbability = 100;

  // Factor 1: Progress rate
  const daysSinceEnrollment = Math.floor((Date.now() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24));
  const expectedProgress = Math.min(100, (daysSinceEnrollment / 90) * 100); // 90-day expected completion
  const actualProgress = progress?.percentComplete || 0;
  
  if (actualProgress < expectedProgress - 20) {
    const deficit = expectedProgress - actualProgress;
    completionProbability -= deficit * 0.5;
    riskFactors.push(`Behind schedule by ${deficit.toFixed(1)}%`);
    recommendations.push("Create a catch-up study plan");
  }

  // Factor 2: Recent activity
  const recentActivity = lessonProgress.filter(lp => {
    const daysSinceActivity = Math.floor((Date.now() - lp.lastViewedAt.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceActivity <= 7;
  });
  
  if (recentActivity.length === 0 && daysSinceEnrollment > 7) {
    completionProbability -= 30;
    riskFactors.push("No activity in the last 7 days");
    recommendations.push("Schedule regular study sessions");
  }

  // Factor 3: Quiz performance
  if (quizAttempts.length > 0) {
    const averageScore = quizAttempts.reduce((sum, qa) => sum + Number(qa.score), 0) / quizAttempts.length;
    if (averageScore < 60) {
      completionProbability -= 20;
      riskFactors.push(`Average quiz score: ${averageScore.toFixed(1)}%`);
      recommendations.push("Review course materials before attempting quizzes");
    }
  }

  // Factor 4: Lesson completion consistency
  const completedLessons = lessonProgress.filter(lp => lp.status === "COMPLETED").length;
  const totalLessonsViewed = lessonProgress.length;
  const completionConsistency = totalLessonsViewed > 0 ? (completedLessons / totalLessonsViewed) * 100 : 0;
  
  if (completionConsistency < 50) {
    completionProbability -= 15;
    riskFactors.push(`Low lesson completion rate: ${completionConsistency.toFixed(1)}%`);
    recommendations.push("Focus on completing lessons before moving to next topics");
  }

  // Factor 5: Time spent per lesson
  const averageTimePerLesson = lessonProgress.length > 0 
    ? lessonProgress.reduce((sum, lp) => sum + lp.readingSeconds, 0) / lessonProgress.length / 60 
    : 0;
  
  if (averageTimePerLesson < 5) {
    completionProbability -= 10;
    riskFactors.push("Average time per lesson is very low");
    recommendations.push("Allocate more time for thorough learning");
  }

  // Clamp probability between 0 and 100
  completionProbability = Math.max(0, Math.min(100, completionProbability));

  // Estimate completion date based on current pace
  let estimatedCompletionDate: Date | null = null;
  if (actualProgress > 0 && daysSinceEnrollment > 0) {
    const daysPerPercent = daysSinceEnrollment / actualProgress;
    const remainingPercent = 100 - actualProgress;
    const estimatedDays = remainingPercent * daysPerPercent;
    estimatedCompletionDate = new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000);
  }

  // Add general recommendations based on probability
  if (completionProbability >= 80) {
    recommendations.push("Maintain current study pace for successful completion");
  } else if (completionProbability >= 50) {
    recommendations.push("Increase study frequency to improve completion likelihood");
  } else {
    recommendations.push("Consider scheduling a consultation with an instructor");
    recommendations.push("Review learning strategies and time management");
  }

  const result: CompletionPrediction = {
    studentId,
    courseId,
    predictedCompletionProbability: completionProbability,
    estimatedCompletionDate,
    riskFactors,
    recommendations
  };

  setCache(cacheKey, result);
  return result;
}

export async function getStudentActivityLog(studentId: string, limit: number = 50): Promise<StudentActivityLog> {
  const prisma = getMainPrisma();

  const [student, lessonProgress, quizAttempts, assignmentSubmissions, examAttempts, certificateIssues] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true }
    }),
    prisma.lessonProgress.findMany({
      where: { agentId: studentId },
      include: { 
        lesson: { 
          include: { 
            section: { 
              include: { 
                module: true 
              } 
            } 
          } 
        } 
      },
      orderBy: { lastViewedAt: "desc" },
      take: limit
    }),
    prisma.quizAttempt.findMany({
      where: { agentId: studentId },
      include: { quiz: true },
      orderBy: { startedAt: "desc" },
      take: limit
    }),
    prisma.assignmentSubmission.findMany({
      where: { agentId: studentId },
      include: { assignment: true },
      orderBy: { submittedAt: "desc" },
      take: limit
    }),
    prisma.examAttempt.findMany({
      where: { agentId: studentId },
      include: { exam: true },
      orderBy: { startedAt: "desc" },
      take: limit
    }),
    prisma.certificateIssue.findMany({
      where: { agentId: studentId },
      include: { course: true },
      orderBy: { issuedAt: "desc" },
      take: limit
    })
  ]);

  if (!student) {
    throw new Error("Student not found");
  }

  // Collect all unique course IDs
  const courseIds = new Set<string>();
  quizAttempts.forEach(qa => qa.quiz.courseId && courseIds.add(qa.quiz.courseId));
  assignmentSubmissions.forEach(as => as.assignment.courseId && courseIds.add(as.assignment.courseId));
  examAttempts.forEach(ea => ea.exam.courseId && courseIds.add(ea.exam.courseId));
  certificateIssues.forEach(ci => ci.courseId && courseIds.add(ci.courseId));

  // Batch fetch course titles
  const courses = await prisma.trainingCourse.findMany({
    where: { id: { in: Array.from(courseIds) } },
    select: { id: true, title: true }
  });

  const courseMap = new Map(courses.map(c => [c.id, c.title]));

  const activities: ActivityEntry[] = [];

  // Process lesson progress activities
  lessonProgress.forEach(lp => {
    activities.push({
      id: `lesson-${lp.id}`,
      activityType: lp.status === "COMPLETED" ? "LESSON_COMPLETED" : "LESSON_VIEWED",
      description: lp.status === "COMPLETED" 
        ? `Completed lesson: ${lp.lesson.title}` 
        : `Viewed lesson: ${lp.lesson.title}`,
      timestamp: lp.lastViewedAt,
      details: {
        lessonId: lp.lessonId,
        percentComplete: lp.percentComplete,
        readingSeconds: lp.readingSeconds
      },
      courseId: lp.lesson.section.module.courseId,
      courseTitle: lp.lesson.section.module.title || "",
      lessonId: lp.lessonId,
      lessonTitle: lp.lesson.title
    });
  });

  // Process quiz attempt activities
  quizAttempts.forEach(qa => {
    activities.push({
      id: `quiz-${qa.id}`,
      activityType: "QUIZ_ATTEMPT",
      description: `Attempted quiz: ${qa.quiz.title} (Score: ${qa.score}%)`,
      timestamp: qa.startedAt,
      details: {
        quizId: qa.quizId,
        score: qa.score,
        status: qa.status
      },
      courseId: qa.quiz.courseId || undefined,
      courseTitle: qa.quiz.courseId ? courseMap.get(qa.quiz.courseId) || "" : ""
    });
  });

  // Process assignment submission activities
  assignmentSubmissions.forEach(as => {
    activities.push({
      id: `assignment-${as.id}`,
      activityType: "ASSIGNMENT_SUBMITTED",
      description: `Submitted assignment: ${as.assignment.title}`,
      timestamp: as.submittedAt,
      details: {
        assignmentId: as.assignmentId,
        grade: as.grade,
        status: as.status
      },
      courseId: as.assignment.courseId || undefined,
      courseTitle: as.assignment.courseId ? courseMap.get(as.assignment.courseId) || "" : ""
    });
  });

  // Process exam attempt activities
  examAttempts.forEach(ea => {
    activities.push({
      id: `exam-${ea.id}`,
      activityType: "EXAM_ATTEMPT",
      description: `Attempted exam: ${ea.exam.title} (Score: ${ea.score}%)`,
      timestamp: ea.startedAt,
      details: {
        examId: ea.examId,
        score: ea.score,
        status: ea.status
      },
      courseId: ea.exam.courseId,
      courseTitle: courseMap.get(ea.exam.courseId) || ""
    });
  });

  // Process certificate issuance activities
  certificateIssues.forEach(ci => {
    activities.push({
      id: `certificate-${ci.id}`,
      activityType: "CERTIFICATE_ISSUED",
      description: `Certificate issued: ${ci.certificateNumber}`,
      timestamp: ci.issuedAt,
      details: {
        certificateNumber: ci.certificateNumber,
        courseId: ci.courseId
      },
      courseId: ci.courseId || undefined,
      courseTitle: ci.courseId ? courseMap.get(ci.courseId) || "" : ""
    });
  });

  // Sort all activities by timestamp
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    studentId: student.id,
    studentName: student.name,
    activities: activities.slice(0, limit)
  };
}
