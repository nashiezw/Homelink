import { Prisma } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { ACADEMY_PROGRAMME_COURSES, LEARNING_PATH_ID } from "@/lib/academy/academy-programme";
import { seedStagedCourseStructure } from "@/lib/academy/staged-course-seed";

const CERTIFICATE_TEMPLATE_ID = "academy-certificate-certified-homelink-agent";

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

const quizSeeds = [
  {
    id: "academy-quiz-foundations",
    title: "Chapter 1 Foundations Knowledge Check",
    description: "Checks professional duties, ethics, terminology and customer-service expectations from the manual.",
    questions: [
      {
        prompt: "What is the agent's first responsibility when working with a new client?",
        answers: ["Understand the client's needs and document them accurately.", "Push the highest commission property first.", "Avoid written records until the deal is closed.", "Only communicate through social media."],
        correct: 0,
        explanation: "The manual centres the agent role on professional needs analysis, accurate records and reliable guidance.",
      },
      {
        prompt: "Which behaviour best reflects HomeLink professional conduct?",
        answers: ["Transparent communication and accurate property information.", "Withholding defects until after viewing.", "Changing offer terms verbally.", "Letting clients sign incomplete forms."],
        correct: 0,
        explanation: "Ethical conduct requires honesty, clarity, proper documentation and client care.",
      },
    ],
  },
  {
    id: "academy-quiz-listings-marketing",
    title: "Chapter 2 Listings and Marketing Knowledge Check",
    description: "Assesses listing capture, appraisals, photography and marketing workflow.",
    questions: [
      {
        prompt: "Before publishing a property listing, what must be completed?",
        answers: ["Listing details, owner authority, photos and compliance checks.", "Only a WhatsApp message from the owner.", "A buyer registration form.", "A commission invoice only."],
        correct: 0,
        explanation: "The listing workflow depends on verified listing information and complete supporting records.",
      },
      {
        prompt: "What is the purpose of a viewing feedback form?",
        answers: ["To record buyer or tenant reactions and guide follow-up.", "To replace an offer to purchase.", "To register a landlord.", "To calculate mileage only."],
        correct: 0,
        explanation: "Viewing feedback improves client follow-up, pricing insight and listing strategy.",
      },
    ],
  },
  {
    id: "academy-quiz-compliance",
    title: "Chapter 4 Documentation and Compliance Knowledge Check",
    description: "Assesses document handling, confidentiality, file completeness and compliance.",
    questions: [
      {
        prompt: "Why should every client file be checked before submission?",
        answers: ["To confirm required documents are complete, accurate and traceable.", "To reduce the number of forms agents use.", "To avoid audit logs.", "To delay the transaction."],
        correct: 0,
        explanation: "Complete, accurate files protect the client, agent and HomeLink from avoidable risk.",
      },
      {
        prompt: "Which item should be treated as confidential?",
        answers: ["Client identity, contact, financial and agreement details.", "Only public listing photos.", "Generic marketing slogans.", "Published branch names."],
        correct: 0,
        explanation: "The manual requires professional handling of private client and transaction information.",
      },
    ],
  },
];

const assignments = [
  {
    id: "academy-assignment-property-inspection",
    title: "Practical Property Inspection Upload",
    description: "Inspect a property, complete the branded inspection checklist, upload property photos and submit notes for admin review.",
    points: 100,
  },
  {
    id: "academy-assignment-viewing-record",
    title: "Viewing Record and Client Follow-Up",
    description: "Record a viewing, complete the viewing register and feedback form, then submit the follow-up plan.",
    points: 100,
  },
  {
    id: "academy-assignment-listing-file",
    title: "Complete Listing File Submission",
    description: "Prepare a listing file using the listing form, file checklist, marketing checklist and compliance checklist.",
    points: 100,
  },
];

export async function ensureOfficialAcademySeed() {
  const prisma = getMainPrisma();
  const [courseCount, documentCount, quizCount, assignmentCount, examCount] = await Promise.all([
    prisma.trainingCourse.count(),
    prisma.documentLibrary.count(),
    prisma.quiz.count(),
    prisma.assignment.count(),
    prisma.finalExam.count(),
  ]);

  const manifest = await loadManifest();
  if (!documentCount) await seedDocuments(prisma, manifest);
  await seedStagedCourseStructure({ forceRebuild: courseCount === 0 });
  if (!quizCount || !assignmentCount || !examCount) await seedAssessments(prisma);
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
  return {
    ...manual,
    academyDocuments: await prisma.documentLibrary.count({ where: { id: { startsWith: "academy-doc-" } } }),
    quizzes: await prisma.quiz.count(),
    assignments: await prisma.assignment.count(),
    finalExams: await prisma.finalExam.count(),
    learningPaths: await prisma.learningPath.count({ where: { id: LEARNING_PATH_ID } }),
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
      title: "HomeLink Zimbabwe Real Estate Agent Training Manual",
      description: "Official downloadable PDF manual for HomeLink Zimbabwe agent onboarding, training and certification.",
      fileUrl: "/uploads/academy/homelink-zimbabwe-real-estate-agent-training-manual.pdf",
      fileName: "homelink-zimbabwe-real-estate-agent-training-manual.pdf",
      fileType: "PDF",
      fileSizeBytes: 1959643,
      version: 1,
      tags: ["manual", "training", "official", "agent academy"],
      permissions: ["ADMIN", "AGENT", "PUBLIC_LEARNER"],
      searchableText: "HomeLink Zimbabwe Real Estate Agent Training Manual official onboarding training certification",
      downloadable: true,
      previewable: true,
      visible: true,
      active: true,
      sortOrder: 0,
    },
    update: {
      categoryId: manualCategory.id,
      title: "HomeLink Zimbabwe Real Estate Agent Training Manual",
      description: "Official downloadable PDF manual for HomeLink Zimbabwe agent onboarding, training and certification.",
      fileUrl: "/uploads/academy/homelink-zimbabwe-real-estate-agent-training-manual.pdf",
      downloadable: true,
      previewable: true,
      visible: true,
      active: true,
      sortOrder: 0,
    },
  });

  const categoryNames = [...new Set(manifest.map((item) => item.category))];
  const categories = new Map<string, { id: string }>();
  for (const [index, name] of categoryNames.entries()) {
    categories.set(name, await ensureDocumentCategory(prisma, name, index + 1));
  }

  for (const item of manifest) {
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

async function seedAssessments(prisma: ReturnType<typeof getMainPrisma>) {
  const quizCourseMap: Record<string, string> = {
    "academy-quiz-foundations": "academy-course-beginner",
    "academy-quiz-listings-marketing": "academy-course-intermediate",
    "academy-quiz-compliance": "academy-course-advanced-professional",
  };
  const assignmentCourseMap: Record<string, string> = {
    "academy-assignment-property-inspection": "academy-course-advanced-professional",
    "academy-assignment-viewing-record": "academy-course-intermediate",
    "academy-assignment-listing-file": "academy-course-intermediate",
  };

  for (const quiz of quizSeeds) {
    const courseId = quizCourseMap[quiz.id] ?? ACADEMY_PROGRAMME_COURSES[0].id;
    await prisma.quiz.upsert({
      where: { id: quiz.id },
      create: { id: quiz.id, courseId, title: quiz.title, description: quiz.description, passingPercentage: 80, randomise: true, timeLimitMinutes: 20, active: true },
      update: { courseId, title: quiz.title, description: quiz.description, passingPercentage: 80, randomise: true, timeLimitMinutes: 20, active: true },
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
          incorrectFeedback: "Review the related manual section and supporting resource before retaking this quiz.",
          hints: ["Check the official manual and the linked resource forms."],
          difficulty: "BEGINNER",
          randomise: false,
          categories: ["Official Manual"],
          tags: ["manual", "knowledge-check"],
          sortOrder: index,
          answers: {
            create: question.answers.map((answer, answerIndex) => ({
              label: answer,
              value: String(answerIndex),
              isCorrect: answerIndex === question.correct,
              feedback: answerIndex === question.correct ? "Correct." : "Not quite. Revisit the manual section.",
              sortOrder: answerIndex,
            })),
          },
        },
      });
    }
  }

  for (const assignment of assignments) {
    const courseId = assignmentCourseMap[assignment.id] ?? ACADEMY_PROGRAMME_COURSES[1].id;
    await prisma.assignment.upsert({
      where: { id: assignment.id },
      create: { ...assignment, courseId, dueDays: 14, active: true },
      update: { courseId, title: assignment.title, description: assignment.description, points: assignment.points, dueDays: 14, active: true },
    });
  }

  const advancedCourseId = "academy-course-advanced-professional";
  await prisma.finalExam.upsert({
    where: { id: "academy-final-exam-certified-homelink-agent" },
    create: {
      id: "academy-final-exam-certified-homelink-agent",
      courseId: advancedCourseId,
      title: "Certified HomeLink Agent Final Examination",
      durationMinutes: 90,
      passingScore: 80,
      randomQuestions: true,
      questionPools: { quizzes: quizSeeds.map((quiz) => quiz.id), minimumQuestions: 6 },
      attemptLimit: 2,
      browserLock: false,
      autoSubmit: true,
      retakeRules: { waitHours: 24, maxAttempts: 2 },
      reviewEnabled: true,
      manualGrading: false,
      active: true,
    },
    update: {
      courseId: advancedCourseId,
      title: "Certified HomeLink Agent Final Examination",
      durationMinutes: 90,
      passingScore: 80,
      questionPools: { quizzes: quizSeeds.map((quiz) => quiz.id), minimumQuestions: 6 },
      active: true,
    },
  });
}

async function seedLearningPath(prisma: ReturnType<typeof getMainPrisma>) {
  await prisma.learningPath.upsert({
    where: { id: LEARNING_PATH_ID },
    create: {
      id: LEARNING_PATH_ID,
      title: "HomeLink Agent Certification Path",
      description: "Three progressive courses: Beginner, Intermediate, and Advanced & Professional — each with its own badge and certificate.",
      status: "PUBLISHED",
      badgeTitle: "HomeLink Certified Agent",
    },
    update: {
      title: "HomeLink Agent Certification Path",
      description: "Three progressive courses: Beginner, Intermediate, and Advanced & Professional.",
      status: "PUBLISHED",
      badgeTitle: "HomeLink Certified Agent",
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
      name: "Certified HomeLink Agent Certificate",
      logoUrl: "/brand/homelink-full-lockup.png",
      templateJson: {
        certificateNumberPrefix: "HLA",
        title: "Certified HomeLink Agent",
        qrVerification: true,
        expiryDays: 365,
        colours: { primary: "#008b68", accent: "#c6a15b" },
      } as Prisma.InputJsonObject,
      active: true,
    },
    update: {
      name: "Certified HomeLink Agent Certificate",
      logoUrl: "/brand/homelink-full-lockup.png",
      templateJson: {
        certificateNumberPrefix: "HLA",
        title: "Certified HomeLink Agent",
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
      title: "Official HomeLink Agent Academy is live",
      body: "The official HomeLink Zimbabwe Real Estate Agent Training Manual, course sequence and downloadable resources are now available.",
      audience: "AGENTS",
      publishedAt: new Date(),
    },
    update: {
      title: "Official HomeLink Agent Academy is live",
      body: "The official HomeLink Zimbabwe Real Estate Agent Training Manual, course sequence and downloadable resources are now available.",
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
    where: { id: "academy-badge-certified-homelink-agent" },
    create: { id: "academy-badge-certified-homelink-agent", name: "Certified HomeLink Agent", description: "Completed all three Academy courses and earned full certification.", xp: 1500, active: true },
    update: { name: "Certified HomeLink Agent", description: "Completed all three Academy courses and earned full certification.", xp: 1500, active: true },
  });
}

async function ensureDocumentCategory(prisma: ReturnType<typeof getMainPrisma>, name: string, sortOrder: number) {
  return prisma.documentCategory.upsert({
    where: { slug: slugify(name) },
    create: { name, slug: slugify(name), description: `${name} used by HomeLink Agent Academy.`, sortOrder },
    update: { name, description: `${name} used by HomeLink Agent Academy.`, sortOrder },
  });
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "academy";
}
