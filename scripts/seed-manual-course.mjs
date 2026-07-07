import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const COURSE_ID = "academy-course-official-real-estate-agent-training";
const DATA_PATH = path.join(process.cwd(), "lib", "academy", "data", "homelink-agent-course.json");
const MANIFEST_PATH = path.join(process.cwd(), "public", "uploads", "academy", "academy-resources-manifest.json");
const LEARNING_PATH_ID = "academy-path-new-agent-programme";
const CERTIFICATE_TEMPLATE_ID = "academy-certificate-certified-homelink-agent";

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

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
}

function isLowQualityLesson(lesson) {
  const dots = (lesson.summary.match(/\.{4,}/g) ?? []).length;
  return dots >= 2 || (lesson.richText.includes("Personal Goal Planner") && lesson.title === "Why This Manual Was Developed");
}

function normalizeModuleTitle(title) {
  const map = {
    INTRODUCTION: "Introduction to the HomeLink Zimbabwe Standard",
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

function consolidateModules(modules) {
  const merged = new Map();
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

async function seedManualCourseStructure(forceRebuild = true) {
  const raw = JSON.parse(await readFile(DATA_PATH, "utf8"));
  const data = { ...raw, modules: consolidateModules(raw.modules) };

  const category = await prisma.trainingCategory.upsert({
    where: { slug: "new-agent-programme" },
    create: { name: "New Agent Programme", slug: "new-agent-programme", description: "Official HomeLink Zimbabwe agent certification.", sortOrder: 0 },
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
      instructor: c.instructor ?? "HomeLink Zimbabwe",
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
      thumbnailUrl: "/brand/homelink-full-lockup.png",
      bannerUrl: "/uploads/academy/homelink-zimbabwe-real-estate-agent-training-manual.pdf",
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
  if (existingLessons > 50 && !forceRebuild) {
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
            description: "Lessons extracted from the official HomeLink training manual.",
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
                  checklist: lesson.checklist ?? undefined,
                  reflectionQuestions: lesson.reflectionQuestions ?? undefined,
                  pdfUrl: "/uploads/academy/homelink-zimbabwe-real-estate-agent-training-manual.pdf",
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
                      type: download.type,
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

  return { rebuilt: true, lessonCount: lessonIndex, moduleCount: data.modules.length };
}

async function ensureDocumentCategory(name, sortOrder) {
  return prisma.documentCategory.upsert({
    where: { slug: slugify(name) },
    create: { name, slug: slugify(name), description: `${name} used by HomeLink Agent Academy.`, sortOrder },
    update: { name, description: `${name} used by HomeLink Agent Academy.`, sortOrder },
  });
}

async function seedDocuments() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const manualCategory = await ensureDocumentCategory("Training Manuals", 0);
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
      fileUrl: "/uploads/academy/homelink-zimbabwe-real-estate-agent-training-manual.pdf",
      downloadable: true,
      previewable: true,
      visible: true,
      active: true,
    },
  });

  const categoryNames = [...new Set(manifest.map((item) => item.category))];
  const categories = new Map();
  for (const [index, name] of categoryNames.entries()) {
    categories.set(name, await ensureDocumentCategory(name, index + 1));
  }

  for (const item of manifest) {
    const category = categories.get(item.category);
    const id = `academy-doc-${slugify(item.title)}`;
    await prisma.documentLibrary.upsert({
      where: { id },
      create: {
        id,
        categoryId: category?.id,
        title: item.title,
        description: item.description,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileType: item.fileType,
        fileSizeBytes: item.fileSizeBytes,
        version: item.version ?? 1,
        tags: item.tags ?? [],
        permissions: ["ADMIN", "AGENT", "PUBLIC_LEARNER"],
        searchableText: `${item.title} ${item.description} ${item.category} ${(item.tags ?? []).join(" ")}`,
        downloadable: true,
        previewable: true,
        visible: true,
        sortOrder: item.sortOrder ?? 0,
        active: true,
      },
      update: {
        title: item.title,
        description: item.description,
        fileUrl: item.fileUrl,
        active: true,
      },
    });
  }
}

async function seedAssessments() {
  for (const quiz of quizSeeds) {
    await prisma.quiz.upsert({
      where: { id: quiz.id },
      create: { id: quiz.id, courseId: COURSE_ID, title: quiz.title, description: quiz.description, passingPercentage: 80, randomise: true, timeLimitMinutes: 20, active: true },
      update: { courseId: COURSE_ID, title: quiz.title, description: quiz.description, passingPercentage: 80, active: true },
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
          incorrectFeedback: "Review the related manual section before retaking this quiz.",
          hints: ["Check the official manual and linked resources."],
          difficulty: "BEGINNER",
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
    await prisma.assignment.upsert({
      where: { id: assignment.id },
      create: { ...assignment, courseId: COURSE_ID, dueDays: 14, active: true },
      update: { title: assignment.title, description: assignment.description, points: assignment.points, dueDays: 14, active: true },
    });
  }

  await prisma.finalExam.upsert({
    where: { id: "academy-final-exam-certified-homelink-agent" },
    create: {
      id: "academy-final-exam-certified-homelink-agent",
      courseId: COURSE_ID,
      title: "Certified HomeLink Agent Final Examination",
      durationMinutes: 90,
      passingScore: 80,
      randomQuestions: true,
      questionPools: { quizzes: quizSeeds.map((q) => q.id), minimumQuestions: 6 },
      attemptLimit: 2,
      browserLock: false,
      autoSubmit: true,
      retakeRules: { waitHours: 24, maxAttempts: 2 },
      reviewEnabled: true,
      manualGrading: false,
      active: true,
    },
    update: {
      courseId: COURSE_ID,
      title: "Certified HomeLink Agent Final Examination",
      questionPools: { quizzes: quizSeeds.map((q) => q.id), minimumQuestions: 6 },
      active: true,
    },
  });
}

async function seedLearningPathAndCertificate() {
  await prisma.learningPath.upsert({
    where: { id: LEARNING_PATH_ID },
    create: {
      id: LEARNING_PATH_ID,
      title: "New Agent Programme",
      description: "Structured HomeLink onboarding path from foundations through legal compliance, sales, property management and certification.",
      status: "PUBLISHED",
      badgeTitle: "Certified HomeLink Agent",
    },
    update: { status: "PUBLISHED" },
  });
  await prisma.pathCourse.upsert({
    where: { pathId_courseId: { pathId: LEARNING_PATH_ID, courseId: COURSE_ID } },
    create: { pathId: LEARNING_PATH_ID, courseId: COURSE_ID, sortOrder: 0, required: true },
    update: { sortOrder: 0, required: true },
  });
  await prisma.certificateTemplate.upsert({
    where: { id: CERTIFICATE_TEMPLATE_ID },
    create: {
      id: CERTIFICATE_TEMPLATE_ID,
      name: "Certified HomeLink Agent Certificate",
      logoUrl: "/brand/homelink-full-lockup.png",
      templateJson: { certificateNumberPrefix: "HLA", title: "Certified HomeLink Agent", qrVerification: true, expiryDays: 365, colours: { primary: "#008b68", accent: "#c6a15b" } },
      active: true,
    },
    update: { active: true },
  });
}

async function main() {
  console.log("Seeding complete HomeLink Agent Training course from manual...");
  const manual = await seedManualCourseStructure(true);
  console.log("Manual course:", manual);
  await seedDocuments();
  await seedAssessments();
  await seedLearningPathAndCertificate();
  const stats = {
    ...manual,
    academyDocuments: await prisma.documentLibrary.count({ where: { id: { startsWith: "academy-doc-" } } }),
    quizzes: await prisma.quiz.count({ where: { courseId: COURSE_ID } }),
    assignments: await prisma.assignment.count({ where: { courseId: COURSE_ID } }),
    finalExams: await prisma.finalExam.count({ where: { courseId: COURSE_ID } }),
  };
  console.log("Assessments & resources:", stats);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
