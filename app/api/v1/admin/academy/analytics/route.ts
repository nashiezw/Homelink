import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const prisma = getMainPrisma();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30"; // days
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
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
      
      // Registrations
      prisma.academyLearnerApplication.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Completions
      prisma.courseProgress.count({
        where: {
          status: "COMPLETED",
          updatedAt: { gte: startDate }
        }
      }),
      
      // Certificates
      prisma.certificateIssue.count({
        where: { issuedAt: { gte: startDate } }
      }),
      
      // Active learners (last 7 days)
      prisma.lessonProgress.groupBy({
        by: ["agentId"],
        where: { lastViewedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        _count: true,
      }),
      
      // Course stats
      prisma.trainingCourse.findMany({
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
      
      // Popular courses (by enrolments)
      prisma.courseEnrolment.groupBy({
        by: ["courseId"],
        _count: true,
        orderBy: { _count: { courseId: "desc" } },
        take: 5,
      }),
      
      // Completion rates by course
      prisma.$queryRaw`
        SELECT 
          c.title,
          COUNT(DISTINCT ce."agentId") as enrolled,
          COUNT(DISTINCT CASE WHEN cp.status = 'COMPLETED' THEN cp."agentId" END) as completed,
          ROUND(
            COUNT(DISTINCT CASE WHEN cp.status = 'COMPLETED' THEN cp."agentId" END) * 100.0 / 
            NULLIF(COUNT(DISTINCT ce."agentId"), 0),
            1
          ) as completion_rate
        FROM training_courses c
        LEFT JOIN course_enrolments ce ON c.id = ce."courseId"
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
    ]);
    
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
      courses: courseStats.map(course => ({
        id: course.id,
        title: course.title,
        enrolments: course._count.enrolments,
        inProgress: course._count.progress,
        certificates: course._count.certificateIssues,
      })),
      popularCourses: popularCourses,
      completionRates,
      dailyActivity,
    });
  } catch (error) {
    console.error("Failed to load analytics", error);
    return problem(500, "ANALYTICS_LOAD_FAILED", "Analytics could not be loaded.");
  }
}
