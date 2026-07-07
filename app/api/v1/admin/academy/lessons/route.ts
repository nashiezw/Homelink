import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const prisma = getMainPrisma();
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const moduleId = searchParams.get("moduleId");
  
  try {
    const lessons = await prisma.trainingLesson.findMany({
      where: courseId || moduleId ? {
        section: moduleId 
          ? { moduleId }
          : { module: { courseId: courseId || undefined } }
      } : undefined,
      include: {
        section: {
          include: {
            module: {
              include: { course: true }
            }
          }
        },
        lessonVideos: true,
        lessonDocuments: { include: { document: true } },
        lessonResources: true,
        lessonDownloads: true,
      },
      orderBy: [{ section: { module: { sortOrder: "asc" } } }, { section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });
    
    return ok(lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      richText: lesson.richText,
      videoUrl: lesson.videoUrl,
      embeddedVideoUrl: lesson.embeddedVideoUrl,
      pdfUrl: lesson.pdfUrl,
      audioUrl: lesson.audioUrl,
      estimatedMinutes: lesson.estimatedMinutes,
      completionRequirement: lesson.completionRequirement,
      sortOrder: lesson.sortOrder,
      commentsEnabled: lesson.commentsEnabled,
      bookmarksEnabled: lesson.bookmarksEnabled,
      section: lesson.section,
      videos: lesson.lessonVideos,
      documents: lesson.lessonDocuments,
      resources: lesson.lessonResources,
      downloads: lesson.lessonDownloads,
      updatedAt: lesson.updatedAt,
    })));
  } catch (error) {
    console.error("Failed to load lessons", error);
    return problem(500, "LESSONS_LOAD_FAILED", "Lessons could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  try {
    const body = await request.json();
    const prisma = getMainPrisma();
    
    // If sectionId is provided, add to existing section
    // If moduleId is provided, create new section in that module
    // If courseId is provided, create new module and section
    
    let sectionId = body.sectionId;
    if (!sectionId && body.moduleId) {
      const section = await prisma.trainingSection.create({
        data: {
          moduleId: body.moduleId,
          title: body.sectionTitle || "Default Section",
          sortOrder: 0,
        }
      });
      sectionId = section.id;
    } else if (!sectionId && body.courseId) {
      const trainingModule = await prisma.trainingModule.create({
        data: {
          courseId: body.courseId,
          title: body.moduleTitle || "Default Module",
          sortOrder: 0,
        }
      });
      const section = await prisma.trainingSection.create({
        data: {
          moduleId: trainingModule.id,
          title: body.sectionTitle || "Default Section",
          sortOrder: 0,
        }
      });
      sectionId = section.id;
    }
    
    if (!sectionId) {
      return problem(400, "SECTION_REQUIRED", "Provide sectionId, moduleId, or courseId.");
    }
    
    const lesson = await prisma.trainingLesson.create({
      data: {
        sectionId,
        title: body.title,
        summary: body.summary || null,
        richText: body.richText || "",
        videoUrl: body.videoUrl || null,
        embeddedVideoUrl: body.embeddedVideoUrl || null,
        pdfUrl: body.pdfUrl || null,
        audioUrl: body.audioUrl || null,
        estimatedMinutes: body.estimatedMinutes || 30,
        completionRequirement: body.completionRequirement || "VIEW",
        sortOrder: body.sortOrder || 0,
      }
    });
    
    return ok(lesson);
  } catch (error) {
    console.error("Failed to create lesson", error);
    return problem(500, "LESSON_CREATE_FAILED", "Lesson could not be created.");
  }
}
