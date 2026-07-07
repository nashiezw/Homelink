import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const { id } = await context.params;
  const body = await request.json();
  const prisma = getMainPrisma();
  
  try {
    const lesson = await prisma.trainingLesson.update({
      where: { id },
      data: {
        title: body.title,
        summary: body.summary,
        richText: body.richText,
        videoUrl: body.videoUrl,
        embeddedVideoUrl: body.embeddedVideoUrl,
        pdfUrl: body.pdfUrl,
        audioUrl: body.audioUrl,
        estimatedMinutes: body.estimatedMinutes,
        completionRequirement: body.completionRequirement,
        sortOrder: body.sortOrder,
        commentsEnabled: body.commentsEnabled,
        bookmarksEnabled: body.bookmarksEnabled,
      }
    });
    return ok(lesson);
  } catch (error) {
    console.error("Failed to update lesson", error);
    return problem(500, "LESSON_UPDATE_FAILED", "Lesson could not be updated.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const { id } = await context.params;
  const prisma = getMainPrisma();
  
  try {
    await prisma.trainingLesson.delete({ where: { id } });
    return ok({ deleted: id });
  } catch (error) {
    console.error("Failed to delete lesson", error);
    return problem(500, "LESSON_DELETE_FAILED", "Lesson could not be deleted.");
  }
}
