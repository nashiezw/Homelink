import { Prisma } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { ACADEMY_PROGRAMME_COURSES, LEARNING_PATH_ID } from "@/lib/academy/academy-programme";
import {
  ACADEMY_ASSIGNMENT_SEEDS,
  ACADEMY_FINAL_EXAM,
  ACADEMY_QUIZ_SEEDS,
} from "@/lib/academy/academy-assessments";
import { verifyAcademyAssets } from "@/lib/academy/academy-files-server";
import { seedStagedCourseStructure } from "@/lib/academy/staged-course-seed";

const CERTIFICATE_TEMPLATE_ID = "academy-certificate-certified-houselink-agent";

type AcademyResourceManifestItem = {
  title: string;
  description: string;
  category: string;
  sourceCategory?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  version?: number;
  tags?: string[];
  sortOrder?: number;
};

const MANUAL_TITLE = "HouseLink Zimbabwe Real Estate Agent Training Manual";
const MANUAL_URL = "/uploads/academy/houselink-zimbabwe-real-estate-agent-training-manual.pdf";

export async function ensureOfficialAcademySeed() {
  const prisma = getMainPrisma();
  const [courseCount, documentCount] = await Promise.all([
    prisma.trainingCourse.count(),
    prisma.documentLibrary.count(),
  ]);

  const manifest = await loadManifest();
  if (!documentCount) await seedDocuments(prisma, manifest);
  await seedStagedCourseStructure({ forceRebuild: courseCount === 0 });
  await seedAssessments(prisma);
  await seedLearningPath(prisma);
  await seedCertificateTemplate(prisma);
  await seedEngagementRecords(prisma);
}

export async function seedOfficialAcademyResources(options?: { skipCourseRebuild?: boolean }) {
  const prisma = getMainPrisma();
  const manifest = await loadManifest();
  await seedDocuments(prisma, manifest);
  const manual = options?.skipCourseRebuild
    ? { rebuilt: false, lessonCount: await prisma.trainingLesson.count({ where: { section: { module: { courseId: { in: ACADEMY_PROGRAMME_COURSES.map((c) => c.id) } } } } }) }
    : await seedStagedCourseStructure({ forceRebuild: true });
  await seedAssessments(prisma);
  await seedLearningPath(prisma);
  await seedCertificateTemplate(prisma);
  await seedEngagementRecords(prisma);
  const assetPaths = [
    "houselink-zimbabwe-real-estate-agent-training-manual.pdf",
    ...manifest.map((item) => item.fileUrl.replace("/uploads/academy/", "")),
  ];
  try {
    const handouts = JSON.parse(
      await readFile(path.join(process.cwd(), "public", "uploads", "academy", "lesson-handouts-manifest.json"), "utf8"),
    ) as Array<{ slug: string }>;
    assetPaths.push(...handouts.map((item) => `lessons/${item.slug}.pdf`));
  } catch {
    // handout manifest generated during staged seed
  }
  const assets = await verifyAcademyAssets([...new Set(assetPaths)]);
  return {
    ...manual,
    academyDocuments: await prisma.documentLibrary.count({ where: { id: { startsWith: "academy-doc-" } } }),
    quizzes: await prisma.quiz.count(),
    assignments: await prisma.assignment.count(),
    finalExams: await prisma.finalExam.count(),
    learningPaths: await prisma.learningPath.count({ where: { id: LEARNING_PATH_ID } }),
    assets,
  };
}

async function loadManifest(): Promise<AcademyResourceManifestItem[]> {
  const manifestPath = path.join(process.cwd(), "public", "uploads", "academy", "academy-resources-manifest.json");
  return JSON.parse(await readFile(manifestPath, "utf8")) as AcademyResourceManifestItem[];
}

async function seedDocuments(prisma: ReturnType<typeof getMainPrisma>, manifest: AcademyResourceManifestItem[]) {
  const manualCategory = await ensureDocumentCategory(prisma, "Training Manuals", 0);
  await prisma.documentLibrary.upsert({
    where: { id: "academy-doc-official-training-manual" },
    create: {
      id: "academy-doc-official-training-manual",
      categoryId: manualCategory.id,
      title: MANUAL_TITLE,
      description: "Official downloadable PDF manual for HouseLink Zimbabwe agent onboarding, training and certification.",
      fileUrl: MANUAL_URL,
      fileName: "houselink-zimbabwe-real-estate-agent-training-manual.pdf",
      fileType: "PDF",
      fileSizeBytes: 1959643,
      version: 1,
      tags: ["manual", "training", "official", "agent academy"],
      permissions: ["ADMIN", "AGENT", "PUBLIC_LEARNER"],
      searchableText: "HouseLink Zimbabwe Real Estate Agent Training Manual official onboarding training certification",
      downloadable: true,
      previewable: true,
      visible: true,
      active: true,
      sortOrder: 0,
    },
    update: {
      categoryId: manualCategory.id,
      title: MANUAL_TITLE,
      description: "Official downloadable PDF manual for HouseLink Zimbabwe agent onboarding, training and certification.",
      fileUrl: MANUAL_URL,
      downloadable: true,
      previewable: true,
      visible: true,
      active: true,
      sortOrder: 0,
    },
  });

  await prisma.documentLibrary.deleteMany({
    where: { id: `academy-doc-${slugify(MANUAL_TITLE)}` },
  });

  const categoryNames = [...new Set(manifest.map((item) => item.category))];
  const categories = new Map<string, { id: string }>();
  for (const [index, name] of categoryNames.entries()) {
    categories.set(name, await ensureDocumentCategory(prisma, name, index + 1));
  }

  for (const item of manifest) {
    if (item.title === MANUAL_TITLE || item.fileUrl === MANUAL_URL) continue;
    const category = categories.get(item.category);
    const id = `academy-doc-${slugify(item.title)}`;
    const searchableText = `${item.title} ${item.description} ${item.category} ${(item.tags ?? []).join(" ")}`;
    await prisma.documentLibrary.upsert({
      where: { id },
      create: {
        id,
        categoryId: category?.id,
        title: item.title,
        description: item.description,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileType: item.fileType as any,
        fileSizeBytes: item.fileSizeBytes,
        version: item.version ?? 1,
        tags: item.tags ?? [],
        permissions: ["ADMIN", "AGENT", "PUBLIC_LEARNER"],
        searchableText,
        downloadable: true,
        previewable: true,
        visible: true,
        sortOrder: item.sortOrder ?? 0,
        active: true,
      },
      update: {
        categoryId: category?.id,
        title: item.title,
        description: item.description,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileType: item.fileType as any,
        fileSizeBytes: item.fileSizeBytes,
        version: item.version ?? 1,
        tags: item.tags ?? [],
        permissions: ["ADMIN", "AGENT", "PUBLIC_LEARNER"],
        searchableText,
        downloadable: true,
        previewable: true,
        visible: true,
        sortOrder: item.sortOrder ?? 0,
        active: true,
      },
    });
  }
}

async function resolveModuleId(prisma: ReturnType<typeof getMainPrisma>, courseId: string, moduleTitle: string) {
  const courseModule = await prisma.trainingModule.findFirst({ where: { courseId, title: moduleTitle } });
  return courseModule?.id ?? null;
}

async function seedAssessments(prisma: ReturnType<typeof getMainPrisma>) {
  for (const quiz of ACADEMY_QUIZ_SEEDS) {
    const moduleId = await resolveModuleId(prisma, quiz.courseId, quiz.moduleTitle);
    await prisma.quiz.upsert({
      where: { id: quiz.id },
      create: {
        id: quiz.id,
        courseId: quiz.courseId,
        moduleId,
        title: quiz.title,
        description: quiz.description,
        passingPercentage: 80,
        randomise: true,
        timeLimitMinutes: quiz.timeLimitMinutes,
        active: true,
      },
      update: {
        courseId: quiz.courseId,
        moduleId,
        title: quiz.title,
        description: quiz.description,
        passingPercentage: 80,
        randomise: true,
        timeLimitMinutes: quiz.timeLimitMinutes,
        active: true,
      },
    });
    await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
    for (const [index, question] of quiz.questions.entries()) {
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          type: "MULTIPLE_CHOICE",
          prompt: question.prompt,
          points: 5,
          explanation: question.explanation,
          correctAnswer: { value: String(question.correct) },
          incorrectFeedback: "Review the lesson notes PDF and related module before retaking this checkpoint.",
          hints: ["Open the Lesson Notes PDF for this module and revisit the Toolkit forms."],
          difficulty: "BEGINNER",
          randomise: false,
          categories: [quiz.moduleTitle],
          tags: ["module-checkpoint", quiz.moduleTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
          sortOrder: index,
          answers: {
            create: question.answers.map((answer, answerIndex) => ({
              label: answer,
              value: String(answerIndex),
              isCorrect: answerIndex === question.correct,
              feedback: answerIndex === question.correct ? "Correct." : "Not quite. Revisit the module lesson notes.",
              sortOrder: answerIndex,
            })),
          },
        },
      });
    }
  }

  for (const assignment of ACADEMY_ASSIGNMENT_SEEDS) {
    const moduleId = await resolveModuleId(prisma, assignment.courseId, assignment.moduleTitle);
    await prisma.assignment.upsert({
      where: { id: assignment.id },
      create: {
        id: assignment.id,
        courseId: assignment.courseId,
        moduleId,
        title: assignment.title,
        description: assignment.description,
        points: assignment.points,
        dueDays: assignment.dueDays,
        active: true,
      },
      update: {
        courseId: assignment.courseId,
        moduleId,
        title: assignment.title,
        description: assignment.description,
        points: assignment.points,
        dueDays: assignment.dueDays,
        active: true,
      },
    });
  }

  await prisma.finalExam.upsert({
    where: { id: ACADEMY_FINAL_EXAM.id },
    create: {
      id: ACADEMY_FINAL_EXAM.id,
      courseId: ACADEMY_FINAL_EXAM.courseId,
      title: ACADEMY_FINAL_EXAM.title,
      durationMinutes: ACADEMY_FINAL_EXAM.durationMinutes,
      passingScore: ACADEMY_FINAL_EXAM.passingScore,
      randomQuestions: true,
      questionPools: { quizzes: ACADEMY_QUIZ_SEEDS.map((quiz) => quiz.id), minimumQuestions: 12 },
      attemptLimit: ACADEMY_FINAL_EXAM.attemptLimit,
      browserLock: false,
      autoSubmit: true,
      retakeRules: { waitHours: 24, maxAttempts: ACADEMY_FINAL_EXAM.attemptLimit },
      reviewEnabled: true,
      manualGrading: false,
      active: true,
    },
    update: {
      courseId: ACADEMY_FINAL_EXAM.courseId,
      title: ACADEMY_FINAL_EXAM.title,
      durationMinutes: ACADEMY_FINAL_EXAM.durationMinutes,
      passingScore: ACADEMY_FINAL_EXAM.passingScore,
      questionPools: { quizzes: ACADEMY_QUIZ_SEEDS.map((quiz) => quiz.id), minimumQuestions: 12 },
      active: true,
    },
  });
}

async function seedLearningPath(prisma: ReturnType<typeof getMainPrisma>) {
  await prisma.learningPath.upsert({
    where: { id: LEARNING_PATH_ID },
    create: {
      id: LEARNING_PATH_ID,
      title: "HouseLink Agent Certification Path",
      description: "Three progressive courses: Beginner, Intermediate, and Advanced & Professional — each with its own badge and certificate.",
      status: "PUBLISHED",
      badgeTitle: "HouseLink Certified Agent",
    },
    update: {
      title: "HouseLink Agent Certification Path",
      description: "Three progressive courses: Beginner, Intermediate, and Advanced & Professional.",
      status: "PUBLISHED",
      badgeTitle: "HouseLink Certified Agent",
    },
  });
  for (const course of ACADEMY_PROGRAMME_COURSES) {
    await prisma.pathCourse.upsert({
      where: { pathId_courseId: { pathId: LEARNING_PATH_ID, courseId: course.id } },
      create: { pathId: LEARNING_PATH_ID, courseId: course.id, sortOrder: course.sortOrder, required: true },
      update: { sortOrder: course.sortOrder, required: true },
    });
  }
}

async function seedCertificateTemplate(prisma: ReturnType<typeof getMainPrisma>) {
  await prisma.certificateTemplate.upsert({
    where: { id: CERTIFICATE_TEMPLATE_ID },
    create: {
      id: CERTIFICATE_TEMPLATE_ID,
      name: "Certified HouseLink Agent Certificate",
      logoUrl: "/brand/houselink-full-lockup.png",
      templateJson: {
        certificateNumberPrefix: "HLA",
        title: "Certified HouseLink Agent",
        qrVerification: true,
        expiryDays: 365,
        colours: { primary: "#008b68", accent: "#c6a15b" },
      } as Prisma.InputJsonObject,
      active: true,
    },
    update: {
      name: "Certified HouseLink Agent Certificate",
      logoUrl: "/brand/houselink-full-lockup.png",
      templateJson: {
        certificateNumberPrefix: "HLA",
        title: "Certified HouseLink Agent",
        qrVerification: true,
        expiryDays: 365,
        colours: { primary: "#008b68", accent: "#c6a15b" },
      } as Prisma.InputJsonObject,
      active: true,
    },
  });
}

async function seedEngagementRecords(prisma: ReturnType<typeof getMainPrisma>) {
  await prisma.announcement.upsert({
    where: { id: "academy-announcement-official-manual-live" },
    create: {
      id: "academy-announcement-official-manual-live",
      title: "Official HouseLink Agent Academy is live",
      body: "The official HouseLink Zimbabwe Real Estate Agent Training Manual, course sequence and downloadable resources are now available.",
      audience: "AGENTS",
      publishedAt: new Date(),
    },
    update: {
      title: "Official HouseLink Agent Academy is live",
      body: "The official HouseLink Zimbabwe Real Estate Agent Training Manual, course sequence and downloadable resources are now available.",
      audience: "AGENTS",
      publishedAt: new Date(),
    },
  });
  for (const course of ACADEMY_PROGRAMME_COURSES) {
    await prisma.badge.upsert({
      where: { id: course.badgeId },
      create: {
        id: course.badgeId,
        name: course.badgeName,
        description: course.badgeDescription,
        xp: course.badgeXp,
        active: true,
      },
      update: {
        name: course.badgeName,
        description: course.badgeDescription,
        xp: course.badgeXp,
        active: true,
      },
    });
  }
  await prisma.badge.upsert({
    where: { id: "academy-badge-certified-houselink-agent" },
    create: { id: "academy-badge-certified-houselink-agent", name: "Certified HouseLink Agent", description: "Completed all three Academy courses and earned full certification.", xp: 1500, active: true },
    update: { name: "Certified HouseLink Agent", description: "Completed all three Academy courses and earned full certification.", xp: 1500, active: true },
  });
}

async function ensureDocumentCategory(prisma: ReturnType<typeof getMainPrisma>, name: string, sortOrder: number) {
  return prisma.documentCategory.upsert({
    where: { slug: slugify(name) },
    create: { name, slug: slugify(name), description: `${name} used by HouseLink Agent Academy.`, sortOrder },
    update: { name, description: `${name} used by HouseLink Agent Academy.`, sortOrder },
  });
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "academy";
}
