import { ACADEMY_PROGRAMME_COURSES } from "@/lib/academy/academy-programme";
import { academyFileDownloadUrl } from "@/lib/academy/academy-files";

export type LessonHandoutSeed = {
  slug: string;
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  title: string;
  summary: string;
  richText: string;
  objectives: string[];
  estimatedMinutes: number;
  resourceTitles: string[];
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
}

export function lessonHandoutSlug(courseId: string, lessonTitle: string) {
  return slugify(`${courseId}-${lessonTitle}`).slice(0, 96);
}

/** Canonical storage path in the database. */
export function lessonHandoutStoragePath(courseId: string, lessonTitle: string) {
  return `/uploads/academy/lessons/${lessonHandoutSlug(courseId, lessonTitle)}.pdf`;
}

/** Client-facing download URL (API route — works on Vercel and standalone). */
export function lessonHandoutUrl(courseId: string, lessonTitle: string) {
  return academyFileDownloadUrl(`lessons/${lessonHandoutSlug(courseId, lessonTitle)}.pdf`);
}

/** All staged lessons — used to generate branded lesson handout PDFs. */
export function buildLessonHandoutManifest(
  modules: Array<{
    title: string;
    stage: string;
    lessons: Array<{
      title: string;
      summary: string;
      richText: string;
      objectives: string[];
      estimatedMinutes: number;
      resourceTitles?: string[];
    }>;
  }>,
) {
  const items: LessonHandoutSeed[] = [];
  for (const programmeCourse of ACADEMY_PROGRAMME_COURSES) {
    const courseModules = modules.filter((entry) => programmeCourse.moduleStages.includes(entry.stage as never));
    for (const courseModule of courseModules) {
      for (const lesson of courseModule.lessons) {
        items.push({
          slug: lessonHandoutSlug(programmeCourse.id, lesson.title),
          courseId: programmeCourse.id,
          courseTitle: programmeCourse.title,
          moduleTitle: courseModule.title,
          title: lesson.title,
          summary: lesson.summary,
          richText: lesson.richText,
          objectives: lesson.objectives,
          estimatedMinutes: lesson.estimatedMinutes,
          resourceTitles: lesson.resourceTitles ?? [],
        });
      }
    }
  }
  return items;
}
