import { Prisma } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";
import { getMainPrisma } from "@/lib/db/main-prisma";

const COURSE_ID = "academy-course-official-real-estate-agent-training";
const DATA_PATH = path.join(process.cwd(), "lib", "academy", "data", "houselink-agent-course.json");

type ManualLesson = {
  title: string;
  summary: string;
  richText: string;
  transcript?: string | null;
  lessonNotes?: string | null;
  objectives: string[];
  checklist?: string[] | null;
  reflectionQuestions?: string[] | null;
  discussionPrompt?: string | null;
  estimatedMinutes: number;
  resources?: Array<{ title: string; body: string; type: string }>;
  downloads?: Array<{ title: string; url: string; type: string }>;
};

type ManualModule = {
  title: string;
  description: string;
  objectives: string[];
  estimatedMinutes: number;
  lessons: ManualLesson[];
};

type ManualCourseData = {
  course: {
    id: string;
    title: string;
    subtitle?: string;
    slug: string;
    shortDescription?: string;
    description: string;
    instructor?: string;
    coInstructors?: string[];
    learningOutcomes?: string[];
    targetAudience?: string;
    estimatedHours?: number;
    language?: string;
    tags?: string[];
  };
  modules: ManualModule[];
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
}

function isLowQualityLesson(lesson: ManualLesson) {
  const dots = (lesson.summary.match(/\.{4,}/g) ?? []).length;
  return dots >= 2 || lesson.richText.includes("Personal Goal Planner") && lesson.title === "Why This Manual Was Developed";
}

function normalizeModuleTitle(title: string) {
  const map: Record<string, string> = {
    INTRODUCTION: "Introduction to the HouseLink Zimbabwe Standard",
    "Chapter 1": "Chapter 1: Foundations of Real Estate",
    "Chapter 2": "Chapter 2: Prospecting, Listings and Property Marketing",
    "Chapter 3": "Chapter 3: Working with Clients",
    "Chapter 4": "Chapter 4: Documentation, Legal Awareness and Compliance",
    "Chapter 5": "Chapter 5: Becoming a Top-Performing Agent",
  };
  for (const [key, value] of Object.entries(map)) {
    if (title.toUpperCase().startsWith(key.toUpperCase())) return value;
  }
  if (title.toUpperCase().includes("RESOURCE")) return "Professional Agent Resource Kit";
  return title.replace(/\s+/g, " ").trim();
}

function consolidateModules(modules: ManualModule[]): ManualModule[] {
  const merged = new Map<string, ManualModule>();
  for (const courseModule of modules) {
    const title = normalizeModuleTitle(courseModule.title);
    const existing = merged.get(title);
    const lessons = courseModule.lessons.filter((lesson) => !isLowQualityLesson(lesson));
    if (!lessons.length) continue;
    if (!existing) {
      merged.set(title, { ...courseModule, title, lessons: [...lessons] });
      continue;
    }
    existing.lessons.push(...lessons);
    existing.estimatedMinutes += courseModule.estimatedMinutes;
  }
  return [...merged.values()];
}

export async function loadManualCourseData(): Promise<ManualCourseData> {
  const raw = JSON.parse(await readFile(DATA_PATH, "utf8")) as ManualCourseData;
  return { ...raw, modules: consolidateModules(raw.modules) };
}

export async function seedManualCourseStructure(options?: { forceRebuild?: boolean }) {
  const prisma = getMainPrisma();
  const data = await loadManualCourseData();
  const category = await prisma.trainingCategory.upsert({
    where: { slug: "new-agent-programme" },
    create: { name: "New Agent Programme", slug: "new-agent-programme", description: "Official HouseLink Zimbabwe agent certification.", sortOrder: 0 },
    update: { name: "New Agent Programme", active: true },
  });

  const c = data.course;
  await prisma.trainingCourse.upsert({
    where: { id: COURSE_ID },
    create: {
      id: COURSE_ID,
      title: c.title,
      subtitle: c.subtitle,
      slug: c.slug,
      shortDescription: c.shortDescription,
      description: c.description,
      categoryId: category.id,
      instructor: c.instructor ?? "HouseLink Zimbabwe",
      coInstructors: c.coInstructors ?? [],
      learningOutcomes: c.learningOutcomes ?? [],
      targetAudience: c.targetAudience,
      tags: c.tags ?? [],
      difficulty: "BEGINNER",
      durationMinutes: (c.estimatedHours ?? 40) * 60,
      estimatedHours: c.estimatedHours ?? 40,
      language: c.language ?? "English",
      passingPercentage: 80,
      certificateEnabled: true,
      price: 75,
      publicPrice: 75,
      agentPrice: 0,
      currency: "USD",
      registrationOpen: true,
      accessDurationDays: 365,
      status: "PUBLISHED",
      featured: true,
      visibility: "PUBLIC",
      roleNames: ["AGENT", "ADMIN", "PUBLIC_LEARNER"],
      thumbnailUrl: "/brand/houselink-full-lockup.png",
      bannerUrl: "/uploads/academy/houselink-zimbabwe-real-estate-agent-training-manual.pdf",
      introVideoUrl: null,
      previewVideoUrl: null,
      welcomeVideoUrl: null,
      enrollmentType: "OPEN",
    },
    update: {
      title: c.title,
      subtitle: c.subtitle,
      shortDescription: c.shortDescription,
      description: c.description,
      coInstructors: c.coInstructors ?? [],
      learningOutcomes: c.learningOutcomes ?? [],
      targetAudience: c.targetAudience,
      estimatedHours: c.estimatedHours ?? 40,
      durationMinutes: (c.estimatedHours ?? 40) * 60,
      status: "PUBLISHED",
      featured: true,
      registrationOpen: true,
      updatedAt: new Date(),
    },
  });

  const existingLessons = await prisma.trainingLesson.count({ where: { section: { module: { courseId: COURSE_ID } } } });
  if (existingLessons > 50 && !options?.forceRebuild) {
    return { rebuilt: false, lessonCount: existingLessons, moduleCount: await prisma.trainingModule.count({ where: { courseId: COURSE_ID } }) };
  }

  await prisma.trainingModule.deleteMany({ where: { courseId: COURSE_ID } });

  let lessonIndex = 0;
  for (const [moduleIndex, module] of data.modules.entries()) {
    await prisma.trainingModule.create({
      data: {
        courseId: COURSE_ID,
        title: module.title,
        description: module.description,
        objectives: module.objectives,
        estimatedMinutes: module.estimatedMinutes,
        sortOrder: moduleIndex,
        sections: {
          create: [{
            title: module.title,
            description: "Lessons extracted from the official HouseLink training manual.",
            sortOrder: 0,
            lessons: {
              create: module.lessons.map((lesson, sortOrder) => {
                lessonIndex += 1;
                const id = `manual-lesson-${lessonIndex}-${slugify(lesson.title).slice(0, 40)}`;
                return {
                  id,
                  title: lesson.title,
                  summary: lesson.summary,
                  richText: lesson.richText,
                  transcript: lesson.transcript ?? null,
                  lessonNotes: lesson.lessonNotes ?? null,
                  objectives: lesson.objectives,
                  discussionPrompt: lesson.discussionPrompt ?? null,
                  checklist: lesson.checklist ? (lesson.checklist as unknown as Prisma.InputJsonValue) : undefined,
                  reflectionQuestions: lesson.reflectionQuestions ? (lesson.reflectionQuestions as unknown as Prisma.InputJsonValue) : undefined,
                  pdfUrl: "/uploads/academy/houselink-zimbabwe-real-estate-agent-training-manual.pdf",
                  estimatedMinutes: lesson.estimatedMinutes,
                  completionRequirement: lesson.title.toLowerCase().includes("knowledge check") ? "QUIZ" : "VIEW",
                  sortOrder,
                  lessonResources: {
                    create: (lesson.resources ?? []).map((resource, index) => ({
                      title: resource.title,
                      body: resource.body,
                      type: resource.type,
                      sortOrder: index,
                    })),
                  },
                  lessonDownloads: {
                    create: (lesson.downloads ?? []).map((download) => ({
                      title: download.title,
                      url: download.url,
                      type: download.type as "PDF",
                    })),
                  },
                };
              }),
            },
          }],
        },
      },
    });
  }

  return {
    rebuilt: true,
    lessonCount: lessonIndex,
    moduleCount: data.modules.length,
  };
}
