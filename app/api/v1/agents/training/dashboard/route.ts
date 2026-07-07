import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view your training dashboard.");
  
  const prisma = getMainPrisma();
  
  try {
    const [enrolments, progress, tasks, resources, announcements, certificates] = await Promise.all([
      // Get course enrolments
      prisma.courseEnrolment.findMany({
        where: { agentId: userId },
        include: {
          course: {
            include: {
              modules: {
                include: {
                  sections: {
                    include: {
                      lessons: {
                        include: {
                          progress: {
                            where: { agentId: userId }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { enrolledAt: "desc" },
      }),
      
      // Get overall progress
      prisma.courseProgress.findMany({
        where: { agentId: userId },
      }),
      
      // Get tasks (assignments)
      prisma.assignmentSubmission.findMany({
        where: { agentId: userId },
        include: {
          assignment: true,
        },
        orderBy: { submittedAt: "desc" },
        take: 10,
      }),
      
      // Get resources
      prisma.documentLibrary.findMany({
        where: {
          active: true,
          visible: true,
          permissions: { hasSome: ["AGENT", "ADMIN"] }
        },
        include: { category: true },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 12,
      }),
      
      // Get announcements
      prisma.announcement.findMany({
        where: {
          AND: [
            { OR: [{ audience: "ALL" }, { audience: "AGENTS" }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      
      // Get certificates
      prisma.certificateIssue.findMany({
        where: { agentId: userId },
        include: {
          course: true,
          template: true,
        },
        orderBy: { issuedAt: "desc" },
      }),
    ]);
    
    const lessonProgress = await prisma.lessonProgress.findMany({
      where: { agentId: userId, status: "COMPLETED" },
      select: { lessonId: true, lesson: { select: { section: { select: { module: { select: { courseId: true } } } } } } },
    });
    const completedLessonIds = new Set(lessonProgress.map((row) => row.lessonId));
    
    // Calculate stats
    const totalLessons = enrolments.reduce((sum, enrolment) => {
      return sum + enrolment.course.modules.reduce((moduleSum: number, module: { sections: Array<{ lessons: unknown[] }> }) => {
        return moduleSum + module.sections.reduce((sectionSum: number, section: { lessons: unknown[] }) => {
          return sectionSum + section.lessons.length;
        }, 0);
      }, 0);
    }, 0);
    
    const completedLessons = lessonProgress.length;
    const completedCourses = progress.filter(p => p.status === "COMPLETED").length;
    const totalLearningMinutes = progress.reduce((sum, p) => sum + p.learningMinutes, 0);
    
    const assignedCourses = enrolments.map(enrolment => {
      const courseProgress = progress.find(p => p.courseId === enrolment.courseId);
      
      return {
        id: enrolment.course.id,
        title: enrolment.course.title,
        description: enrolment.course.description,
        progress: courseProgress?.percentComplete || 0,
        status: courseProgress?.status || "NOT_STARTED",
        modules: enrolment.course.modules.map((module: { id: string; title: string; sections: Array<{ lessons: Array<{ id: string; title: string; estimatedMinutes: number }> }> }) => ({
          id: module.id,
          title: module.title,
          lessons: module.sections.flatMap((section) => 
            section.lessons.map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              completed: completedLessonIds.has(lesson.id),
              estimatedMinutes: lesson.estimatedMinutes,
            }))
          ),
        })),
        certificateEnabled: enrolment.course.certificateEnabled,
        certificateIssued: certificates.some(c => c.courseId === enrolment.course.id),
      };
    });
    
    const tasksData = tasks.map(task => ({
      id: task.id,
      title: task.assignment.title,
      dueDate: task.assignment.dueDays ? new Date(task.submittedAt).toISOString() : new Date().toISOString(),
      status: task.status,
      type: "assignment",
    }));
    
    const resourcesData = resources.map(resource => ({
      id: resource.id,
      title: resource.title,
      category: resource.category?.name || "General",
      downloadUrl: `/api/v1/academy/documents/${resource.id}/download`,
    }));
    
    return ok({
      assignedCourses,
      tasks: tasksData,
      resources: resourcesData,
      announcements,
      stats: {
        coursesEnrolled: enrolments.length,
        coursesCompleted: completedCourses,
        totalLessons,
        completedLessons,
        certificates: certificates.length,
        hoursLearned: Math.round(totalLearningMinutes / 60),
      },
    });
  } catch (error) {
    console.error("Failed to load agent training dashboard", error);
    return problem(500, "TRAINING_DASHBOARD_FAILED", "Training dashboard could not be loaded.");
  }
}
