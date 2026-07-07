import { getMainPrisma } from "@/lib/db/main-prisma";
import { isFullTrainingManualUrl } from "@/lib/academy/academy-constants";

const lessonInclude = {
  lessonVideos: true,
  lessonDocuments: { include: { document: { include: { category: true } } } },
  lessonResources: true,
  lessonDownloads: true,
} as const;

const courseInclude = {
  category: true,
  modules: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" as const },
            include: lessonInclude,
          },
        },
      },
    },
  },
  quizzes: { where: { active: true }, include: { questions: { include: { answers: true }, orderBy: { sortOrder: "asc" as const } } } },
  assignments: { where: { active: true } },
  finalExams: { where: { active: true } },
} as const;

export async function fetchCourseTree(courseId: string) {
  return getMainPrisma().trainingCourse.findUnique({
    where: { id: courseId },
    include: courseInclude,
  });
}

export function mapLessonForLearner(
  lesson: {
    id: string;
    title: string;
    summary: string | null;
    richText: string;
    transcript?: string | null;
    lessonNotes?: string | null;
    objectives?: string[];
    discussionPrompt?: string | null;
    checklist?: unknown;
    reflectionQuestions?: unknown;
    videoUrl: string | null;
    embeddedVideoUrl: string | null;
    pdfUrl: string | null;
    audioUrl: string | null;
    estimatedMinutes: number;
    completionRequirement: string;
    sortOrder: number;
    lessonVideos: Array<{ id: string; title: string; url: string; provider: string; durationSeconds: number }>;
    lessonDocuments: Array<{ id: string; document: { id: string; title: string; fileType: string; fileUrl: string; category?: { name: string } | null } }>;
    lessonResources: Array<{ id: string; title: string; body: string; type: string; sortOrder: number }>;
    lessonDownloads: Array<{ id: string; title: string; url: string; type: string }>;
  },
  completedIds: Set<string>,
  bookmarkIds: Set<string> = new Set(),
) {
  return {
    id: lesson.id,
    title: lesson.title,
    summary: lesson.summary,
    richText: lesson.richText,
    transcript: lesson.transcript,
    lessonNotes: lesson.lessonNotes,
    objectives: lesson.objectives ?? [],
    discussionPrompt: lesson.discussionPrompt,
    videoUrl: lesson.videoUrl,
    embeddedVideoUrl: lesson.embeddedVideoUrl,
    pdfUrl: lesson.pdfUrl && !isFullTrainingManualUrl(lesson.pdfUrl) ? lesson.pdfUrl : null,
    audioUrl: lesson.audioUrl,
    estimatedMinutes: lesson.estimatedMinutes,
    completionRequirement: lesson.completionRequirement,
    sortOrder: lesson.sortOrder,
    completed: completedIds.has(lesson.id),
    bookmarked: bookmarkIds.has(lesson.id),
    lessonVideos: lesson.lessonVideos.map((v) => ({ id: v.id, title: v.title, url: v.url, provider: v.provider, durationSeconds: v.durationSeconds })),
    lessonDocuments: lesson.lessonDocuments.map((d) => ({
      id: d.document.id,
      title: d.document.title,
      fileType: d.document.fileType,
      category: d.document.category?.name,
      downloadUrl: `/api/v1/academy/documents/${d.document.id}/download`,
    })),
    lessonResources: lesson.lessonResources.map((r) => ({ id: r.id, title: r.title, body: r.body, type: r.type, sortOrder: r.sortOrder })),
    lessonDownloads: lesson.lessonDownloads.map((d) => ({ id: d.id, title: d.title, url: d.url, type: d.type })),
  };
}

export function flattenCourseMaterials(course: NonNullable<Awaited<ReturnType<typeof fetchCourseTree>>>) {
  const materials: Array<{ id: string; title: string; level: "lesson" | "module" | "course"; location: string; fileType: string; downloadUrl: string }> = [];

  for (const courseModule of course.modules) {
    for (const section of courseModule.sections) {
      for (const lesson of section.lessons) {
        if (lesson.pdfUrl && !isFullTrainingManualUrl(lesson.pdfUrl)) {
          materials.push({
            id: `pdf-${lesson.id}`,
            title: `${lesson.title} — Lesson Handout`,
            level: "lesson",
            location: `${courseModule.title} › ${lesson.title}`,
            fileType: "PDF",
            downloadUrl: lesson.pdfUrl,
          });
        }
        const seenUrls = new Set<string>([lesson.pdfUrl].filter(Boolean) as string[]);
        for (const download of lesson.lessonDownloads) {
          if (seenUrls.has(download.url)) continue;
          seenUrls.add(download.url);
          materials.push({ id: download.id, title: download.title, level: "lesson", location: `${courseModule.title} › ${lesson.title}`, fileType: download.type, downloadUrl: download.url });
        }
        for (const doc of lesson.lessonDocuments) {
          materials.push({
            id: doc.document.id,
            title: doc.document.title,
            level: "lesson",
            location: `${courseModule.title} › ${lesson.title}`,
            fileType: doc.document.fileType,
            downloadUrl: `/api/v1/academy/documents/${doc.document.id}/download`,
          });
        }
      }
    }
  }
  return materials;
}

export async function resolveLessonSectionId(input: { sectionId?: string; moduleId?: string; courseId?: string }) {
  const prisma = getMainPrisma();
  if (input.sectionId) return input.sectionId;
  if (input.moduleId) {
    const section = await prisma.trainingSection.findFirst({ where: { moduleId: input.moduleId }, orderBy: { sortOrder: "asc" } });
    if (section) return section.id;
    const created = await prisma.trainingSection.create({ data: { moduleId: input.moduleId, title: "Section 1", sortOrder: 0 } });
    return created.id;
  }
  if (input.courseId) {
    let courseModule = await prisma.trainingModule.findFirst({ where: { courseId: input.courseId }, orderBy: { sortOrder: "asc" } });
    if (!courseModule) {
      courseModule = await prisma.trainingModule.create({ data: { courseId: input.courseId, title: "Module 1", sortOrder: 0 } });
    }
    return resolveLessonSectionId({ moduleId: courseModule.id });
  }
  throw new Error("Provide sectionId, moduleId, or courseId to create a lesson.");
}
