import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { identifyAtRiskLearners } from "@/lib/academy/at-risk-learner-identification";
import {
  getStudentProgressAnalytics,
  getCourseWideAnalytics,
  getAssessmentPerformanceAnalytics,
  getAtRiskStudents,
  getStudentActivityLog,
  getComparativeAnalytics,
  predictCourseCompletion,
  getStudentQuizAnalytics
} from "@/lib/academy/analytics-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const prisma = getMainPrisma();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30"; // days
  const type = searchParams.get("type") || "overview"; // overview, student, course, assessment, at-risk, activity, comparative
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    const courseId = searchParams.get("courseId");
    const studentId = searchParams.get("studentId");
    const includeAtRisk = searchParams.get("includeAtRisk") === "true";
    
    // Handle different analytics types
    if (type === "student" && studentId) {
      try {
        const studentAnalytics = await getStudentProgressAnalytics(studentId);
        return ok(studentAnalytics);
      } catch (error) {
        console.error(`[Analytics] Error loading student progress analytics for ${studentId}:`, error);
        return problem(500, "STUDENT_ANALYTICS_FAILED", `Failed to load student analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (type === "student-quiz" && studentId) {
      try {
        const studentQuizAnalytics = await getStudentQuizAnalytics(studentId);
        return ok(studentQuizAnalytics);
      } catch (error) {
        console.error(`[Analytics] Error loading student quiz analytics for ${studentId}:`, error);
        return problem(500, "STUDENT_QUIZ_ANALYTICS_FAILED", `Failed to load student quiz analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (type === "student-search") {
      const searchQuery = searchParams.get("q") || "";
      const students = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { email: { contains: searchQuery, mode: "insensitive" } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        take: 20
      });
      return ok(students);
    }
    
    if (type === "course" && courseId) {
      const courseAnalytics = await getCourseWideAnalytics(courseId);
      return ok(courseAnalytics);
    }
    
    if (type === "assessment" && courseId) {
      const assessmentAnalytics = await getAssessmentPerformanceAnalytics(courseId);
      return ok(assessmentAnalytics);
    }
    
    if (type === "at-risk") {
      const atRiskStudents = await getAtRiskStudents(courseId || undefined);
      return ok(atRiskStudents);
    }
    
    if (type === "activity" && studentId) {
      const limit = parseInt(searchParams.get("limit") || "50");
      const activityLog = await getStudentActivityLog(studentId, limit);
      return ok(activityLog);
    }
    
    if (type === "comparative" && courseId) {
      const comparativeAnalytics = await getComparativeAnalytics(courseId, parseInt(period));
      return ok(comparativeAnalytics);
    }
    
    if (type === "predictions" && courseId) {
      // Get all enrolled students and predict completion for each
      const enrollments = await prisma.courseEnrolment.findMany({
        where: { courseId },
        select: { agentId: true }
      });
      
      const predictions = await Promise.all(
        enrollments.map(enrollment => 
          predictCourseCompletion(enrollment.agentId, courseId)
        )
      );
      
      return ok({ courseId, predictions });
    }
    
    // Default overview analytics
    const [
      totalRevenue,
      totalRegistrations,
      totalCompletions,
      totalCertificates,
      activeLearners,
      courseStats,
      popularCourses,
      completionRates,
      dailyActivity,
      atRiskLearners,
      users,
      averageScore,
    ] = await Promise.all([
      // Revenue
      prisma.payment.aggregate({
        where: {
          plan: "academy_course",
          status: "PAID",
          createdAt: { gte: startDate }
        },
        _sum: { amount: true },
        _count: true,
      }),
      
      // Registrations (approved enrolments)
      prisma.courseEnrolment.count({
        where: { 
          enrolledAt: { gte: startDate },
          status: "ACTIVE"
        }
      }),
      
      // Completions
      prisma.courseProgress.count({
        where: {
          status: "COMPLETED",
          completedAt: { gte: startDate }
        }
      }),
      
      // Certificates
      prisma.certificateIssue.count({
        where: { issuedAt: { gte: startDate } }
      }),
      
      // Active learners (last 7 days - based on lesson progress)
      prisma.lessonProgress.groupBy({
        by: ["agentId"],
        where: { lastViewedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        _count: true,
      }),
      
      // Course stats with enrolments and progress
      prisma.trainingCourse.findMany({
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          _count: {
            select: {
              enrolments: true,
              progress: true,
              certificateIssues: true,
            }
          }
        }
      }),
      
      // Popular courses (by ACTIVE enrolments - no date filter to show all-time popularity)
      prisma.courseEnrolment.groupBy({
        by: ["courseId"],
        where: { status: "ACTIVE" },
        _count: true,
        orderBy: { _count: { courseId: "desc" } },
        take: 5,
      }),
      
      // Completion rates by course - include IN_PROGRESS learners with their actual progress
      prisma.$queryRaw`
        WITH lesson_totals AS (
          SELECT
            tm."courseId",
            COUNT(tl.id) AS total_lessons
          FROM "training_modules" tm
          JOIN "training_sections" ts ON ts."moduleId" = tm.id
          JOIN "training_lessons" tl ON tl."sectionId" = ts.id
          GROUP BY tm."courseId"
        ),
        lesson_progress_by_learner AS (
          SELECT
            tm."courseId",
            lp."agentId",
            COUNT(DISTINCT CASE WHEN lp.status = 'COMPLETED' THEN lp."lessonId" END) AS completed_lessons
          FROM "lesson_progress" lp
          JOIN "training_lessons" tl ON tl.id = lp."lessonId"
          JOIN "training_sections" ts ON ts.id = tl."sectionId"
          JOIN "training_modules" tm ON tm.id = ts."moduleId"
          GROUP BY tm."courseId", lp."agentId"
        )
        SELECT 
          c.id as "courseId",
          c.title,
          COUNT(DISTINCT ce."agentId") as enrolled,
          COUNT(DISTINCT CASE
            WHEN cp.status = 'COMPLETED'
              OR (
                COALESCE(lt.total_lessons, 0) > 0
                AND COALESCE(lpl.completed_lessons, 0) >= lt.total_lessons
              )
            THEN ce."agentId"
          END) as completed,
          ROUND(AVG(COALESCE(
            cp."percentComplete",
            CASE
              WHEN COALESCE(lt.total_lessons, 0) > 0
              THEN LEAST(100, COALESCE(lpl.completed_lessons, 0) * 100.0 / lt.total_lessons)
              ELSE 0
            END
          )), 1) as avg_progress,
          ROUND(
            COUNT(DISTINCT CASE
              WHEN cp.status = 'COMPLETED'
                OR (
                  COALESCE(lt.total_lessons, 0) > 0
                  AND COALESCE(lpl.completed_lessons, 0) >= lt.total_lessons
                )
              THEN ce."agentId"
            END) * 100.0 /
            NULLIF(COUNT(DISTINCT ce."agentId"), 0),
            1
          ) as completion_rate
        FROM "training_courses" c
        LEFT JOIN "course_enrolments" ce ON c.id = ce."courseId" AND ce.status = 'ACTIVE'
        LEFT JOIN "course_progress" cp ON c.id = cp."courseId" AND ce."agentId" = cp."agentId"
        LEFT JOIN lesson_totals lt ON lt."courseId" = c.id
        LEFT JOIN lesson_progress_by_learner lpl ON lpl."courseId" = c.id AND lpl."agentId" = ce."agentId"
        WHERE c.status = 'PUBLISHED'
        GROUP BY c.id, c.title
        ORDER BY completion_rate DESC NULLS LAST
      `,
      
      // Daily activity
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as actions
        FROM "AuditEvent"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 30
      `,
      
      // At-risk learners
      includeAtRisk ? identifyAtRiskLearners(courseId || undefined) : Promise.resolve([]),
      
      // Fetch all users for name mapping
      prisma.user.findMany({
        select: { id: true, name: true, email: true }
      }),
      
      // Average score across all course progress - include zero scores
      prisma.courseProgress.aggregate({
        where: {
          updatedAt: { gte: startDate }
        },
        _avg: { averageScore: true }
      }),
    ]);
    
    // Create user ID to name map
    const userMap = new Map(users.map(u => [u.id, { name: u.name, email: u.email }]));
    
    // Map popular courses to include course titles
    const popularCoursesWithTitles = await Promise.all(
      popularCourses.map(async (pc: any) => {
        const course = await prisma.trainingCourse.findUnique({
          where: { id: pc.courseId },
          select: { title: true }
        });
        const enrolmentCount = typeof pc._count === "number" ? pc._count : Number(pc._count?._all ?? pc._count?.courseId ?? 0);
        return {
          courseId: pc.courseId,
          courseTitle: course?.title || pc.courseId,
          _count: enrolmentCount
        };
      })
    );
    
    // Convert BigInt values to numbers in completion rates
    const completionRatesFixed = (completionRates as any[]).map((cr: any) => ({
      courseId: cr.courseId,
      title: cr.title,
      enrolled: Number(cr.enrolled),
      completed: Number(cr.completed),
      avg_progress: Number(cr.avg_progress ?? 0),
      completion_rate: Number(cr.completion_rate ?? 0)
    }));
    
    // Convert BigInt values in daily activity (COUNT(*) returns BigInt)
    const dailyActivityFixed = (dailyActivity as any[]).map((da: any) => ({
      date: da.date,
      actions: Number(da.actions)
    }));
    
    // Normalise at-risk learners so all analytics widgets can safely consume the
    // same shape, while preserving the legacy learner* fields used elsewhere.
    const atRiskLearnersFixed = (atRiskLearners as any[]).map((learner: any) => {
      const riskFactors = Array.isArray(learner.riskFactors) ? learner.riskFactors : [];
      const daysSinceLastActivity = learner.daysSinceLastActivity == null ? null : Number(learner.daysSinceLastActivity);
      const riskType =
        riskFactors.some((factor: string) => factor.toLowerCase().includes("activity")) ? "INACTIVE" :
        riskFactors.some((factor: string) => factor.toLowerCase().includes("completion")) ? "BEHIND_SCHEDULE" :
        riskFactors.some((factor: string) => factor.toLowerCase().includes("score")) ? "STRUGGLING" :
        "INACTIVE";
      const learnerId = learner.learnerId ?? learner.studentId ?? "";
      const learnerName = learner.learnerName ?? learner.studentName ?? "";
      const learnerEmail = learner.learnerEmail ?? learner.studentEmail ?? "";
      return {
        ...learner,
        learnerId,
        learnerName,
        learnerEmail,
        studentId: learner.studentId ?? learnerId,
        studentName: learner.studentName ?? learnerName,
        studentEmail: learner.studentEmail ?? learnerEmail,
        riskType,
        riskLevel: learner.riskLevel ?? "MEDIUM",
        riskDescription: learner.riskDescription ?? (riskFactors.length ? riskFactors.join(", ") : "Learner may need support"),
        lastActivityDate: learner.lastActivityDate ?? learner.lastActivity ?? null,
        daysSinceLastActivity,
        consecutiveFailures: Number(learner.consecutiveFailures ?? 0),
        currentLesson: learner.currentLesson ?? null,
        timeOnCurrentLesson: Number(learner.timeOnCurrentLesson ?? 0),
        progressPercentage: Number(learner.progressPercentage ?? 0),
        expectedProgress: Number(learner.expectedProgress ?? 0),
        interventionRecommended: Boolean(learner.interventionRecommended ?? riskFactors.length > 0),
        interventionActions: learner.interventionActions ?? ["Send reminder email", "Schedule check-in call"],
        riskScore: Number(learner.engagementScore ?? learner.riskScore ?? 0),
        ...(learner.totalEnrollments !== undefined && { totalEnrollments: Number(learner.totalEnrollments) }),
        ...(learner.totalProgress !== undefined && { totalProgress: Number(learner.totalProgress) }),
      };
    });
    
    return ok({
      revenue: {
        total: Number(totalRevenue._sum.amount || 0),
        count: Number(totalRevenue._count),
        period,
      },
      registrations: Number(totalRegistrations),
      completions: Number(totalCompletions),
      certificates: Number(totalCertificates),
      activeLearners: Number(activeLearners.length),
      averageScore: Number(averageScore._avg.averageScore || 0),
      courses: courseStats.map(course => ({
        id: course.id,
        title: course.title,
        enrolments: Number(course._count.enrolments),
        inProgress: Number(course._count.progress),
        certificates: Number(course._count.certificateIssues),
      })),
      popularCourses: popularCoursesWithTitles,
      completionRates: completionRatesFixed,
      dailyActivity: dailyActivityFixed,
      atRiskLearners: atRiskLearnersFixed,
      userMap: Object.fromEntries(userMap),
    });
  } catch (error) {
    console.error("Failed to load analytics", error);
    return problem(500, "ANALYTICS_LOAD_FAILED", "Analytics could not be loaded.");
  }
}
