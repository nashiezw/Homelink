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
  predictCourseCompletion
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
      const studentAnalytics = await getStudentProgressAnalytics(studentId);
      return ok(studentAnalytics);
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
      
      // Popular courses (by ACTIVE enrolments)
      prisma.courseEnrolment.groupBy({
        by: ["courseId"],
        where: { status: "ACTIVE" },
        _count: true,
        orderBy: { _count: { courseId: "desc" } },
        take: 5,
      }),
      
      // Completion rates by course - fixed query
      prisma.$queryRaw`
        SELECT 
          c.id as "courseId",
          c.title,
          COUNT(DISTINCT ce."agentId") as enrolled,
          COUNT(DISTINCT CASE WHEN cp.status = 'COMPLETED' THEN cp."agentId" END) as completed,
          ROUND(
            COUNT(DISTINCT CASE WHEN cp.status = 'COMPLETED' THEN cp."agentId" END) * 100.0 / 
            NULLIF(COUNT(DISTINCT ce."agentId"), 0),
            1
          ) as completion_rate
        FROM training_courses c
        LEFT JOIN course_enrolments ce ON c.id = ce."courseId" AND ce.status = 'ACTIVE'
        LEFT JOIN course_progress cp ON c.id = cp."courseId" AND ce."agentId" = cp."agentId"
        WHERE c.status = 'PUBLISHED'
        GROUP BY c.id, c.title
        ORDER BY completion_rate DESC NULLS LAST
      `,
      
      // Daily activity
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as actions
        FROM audit_logs
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
      
      // Average score across all course progress
      prisma.courseProgress.aggregate({
        where: {
          averageScore: { gt: 0 },
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
        return {
          ...pc,
          courseTitle: course?.title || pc.courseId
        };
      })
    );
    
    return ok({
      revenue: {
        total: Number(totalRevenue._sum.amount || 0),
        count: totalRevenue._count,
        period,
      },
      registrations: totalRegistrations,
      completions: totalCompletions,
      certificates: totalCertificates,
      activeLearners: activeLearners.length,
      averageScore: Number(averageScore._avg.averageScore || 0),
      courses: courseStats.map(course => ({
        id: course.id,
        title: course.title,
        enrolments: course._count.enrolments,
        inProgress: course._count.progress,
        certificates: course._count.certificateIssues,
      })),
      popularCourses: popularCoursesWithTitles,
      completionRates,
      dailyActivity,
      atRiskLearners,
      userMap: Object.fromEntries(userMap),
    });
  } catch (error) {
    console.error("Failed to load analytics", error);
    return problem(500, "ANALYTICS_LOAD_FAILED", "Analytics could not be loaded.");
  }
}
