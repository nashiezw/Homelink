import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const root = process.cwd();
const manifestPath = path.join(root, "public", "uploads", "academy", "academy-resources-manifest.json");

const COURSE_ID = "academy-course-official-real-estate-agent-training";
const LEARNING_PATH_ID = "academy-path-new-agent-programme";
const CERTIFICATE_TEMPLATE_ID = "academy-certificate-certified-houselink-agent";

const courseModules = [
  {
    title: "Introduction to the HouseLink Zimbabwe Standard",
    lessons: [
      "Welcome to HouseLink Zimbabwe",
      "How to use this manual",
      "Your journey to becoming a professional real estate agent",
    ],
  },
  {
    title: "Chapter 1: Foundations of Real Estate",
    lessons: [
      "Understanding the real estate industry",
      "Role, duties and responsibilities of a professional agent",
      "Professional ethics, conduct and customer service",
      "Essential real estate terminology",
      "Chapter 1 knowledge check and practical assessment",
    ],
  },
  {
    title: "Chapter 2: Prospecting, Listings and Property Marketing",
    lessons: [
      "Prospecting and daily business generation",
      "Winning listings and conducting property appraisals",
      "Collecting accurate listing information",
      "Property photography, descriptions and marketing channels",
      "Chapter 2 knowledge check and practical assessment",
    ],
  },
  {
    title: "Chapter 3: Working with Clients",
    lessons: [
      "Qualifying buyers and tenants",
      "Matching clients with the right property",
      "Managing property viewings",
      "Understanding and presenting offers",
      "Chapter 3 client service simulation",
    ],
  },
  {
    title: "Chapter 4: Documentation, Legal Awareness and Compliance",
    lessons: [
      "Why documentation matters",
      "Common documents used by real estate agents",
      "Completing documents accurately",
      "Understanding contracts and confidentiality",
      "Chapter 4 compliance assessment",
    ],
  },
  {
    title: "Chapter 5: Becoming a Top-Performing Agent",
    lessons: [
      "Building a successful real estate career",
      "Daily, weekly and monthly success routines",
      "Tracking pipeline and performance",
      "Professional reputation and long-term growth",
      "Final competency checklist",
    ],
  },
  {
    title: "Professional Agent Resource Kit",
    lessons: [
      "Client document forms",
      "Operations planners and registers",
      "Marketing templates and scripts",
      "Administration and compliance tools",
      "Performance trackers and quick reference guides",
    ],
  },
];

const quizSeeds = [
  {
    id: "academy-quiz-foundations",
    title: "Chapter 1 Foundations Knowledge Check",
    description: "Checks professional duties, ethics, terminology and customer-service expectations from the manual.",
    questions: [
      ["What is the agent's first responsibility when working with a new client?", ["Understand the client's needs and document them accurately.", "Push the highest commission property first.", "Avoid written records until the deal is closed.", "Only communicate through social media."], 0],
      ["Which behaviour best reflects HouseLink professional conduct?", ["Transparent communication and accurate property information.", "Withholding defects until after viewing.", "Changing offer terms verbally.", "Letting clients sign incomplete forms."], 0],
    ],
  },
  {
    id: "academy-quiz-listings-marketing",
    title: "Chapter 2 Listings and Marketing Knowledge Check",
    description: "Assesses listing capture, appraisals, photography and marketing workflow.",
    questions: [
      ["Before publishing a property listing, what must be completed?", ["Listing details, owner authority, photos and compliance checks.", "Only a WhatsApp message from the owner.", "A buyer registration form.", "A commission invoice only."], 0],
      ["What is the purpose of a viewing feedback form?", ["To record buyer or tenant reactions and guide follow-up.", "To replace an offer to purchase.", "To register a landlord.", "To calculate mileage only."], 0],
    ],
  },
  {
    id: "academy-quiz-compliance",
    title: "Chapter 4 Documentation and Compliance Knowledge Check",
    description: "Assesses document handling, confidentiality, file completeness and compliance.",
    questions: [
      ["Why should every client file be checked before submission?", ["To confirm required documents are complete, accurate and traceable.", "To reduce the number of forms agents use.", "To avoid audit logs.", "To delay the transaction."], 0],
      ["Which item should be treated as confidential?", ["Client identity, contact, financial and agreement details.", "Only public listing photos.", "Generic marketing slogans.", "Published branch names."], 0],
    ],
  },
];

const assignments = [
  ["academy-assignment-property-inspection", "Practical Property Inspection Upload", "Inspect a property, complete the branded inspection checklist, upload property photos and submit notes for admin review."],
  ["academy-assignment-viewing-record", "Viewing Record and Client Follow-Up", "Record a viewing, complete the viewing register and feedback form, then submit the follow-up plan."],
  ["academy-assignment-listing-file", "Complete Listing File Submission", "Prepare a listing file using the listing form, file checklist, marketing checklist and compliance checklist."],
];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "academy";
}

function categoryDescription(category) {
  const descriptions = {
    "Training Manuals": "Official manuals and primary training reference guides.",
    "Property Forms": "Client, buyer, seller, tenant, landlord, listing, viewing and inspection forms.",
    "Agent Templates": "Day-to-day planning, appointment, lead and follow-up templates.",
    "Marketing Resources": "Marketing checklists, scripts, message templates and campaign tools.",
    "Compliance Documents": "Administration, compliance, file and document submission tools.",
    "Assessments": "Performance reviews, KPI trackers, goal planners and competency tools.",
    "Reference Guides": "Quick reference process flowcharts and daily workflow guides.",
  };
  return descriptions[category] ?? `${category} used by HouseLink Agent Academy.`;
}

async function ensureCategory(name, sortOrder) {
  return prisma.documentCategory.upsert({
    where: { slug: slugify(name) },
    create: { name, slug: slugify(name), description: categoryDescription(name), sortOrder },
    update: { name, description: categoryDescription(name), sortOrder },
  });
}

async function seedDocuments(manifest) {
  const categoryNames = [...new Set(manifest.map((item) => item.category))];
  const categories = new Map();
  for (const [index, name] of categoryNames.entries()) {
    const category = await ensureCategory(name, index);
    categories.set(name, category);
  }
  for (const item of manifest) {
    const category = categories.get(item.category);
    await prisma.documentLibrary.upsert({
      where: { id: `academy-doc-${slugify(item.title)}` },
      create: {
        id: `academy-doc-${slugify(item.title)}`,
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
    });
  }
}

async function seedCourse(manifest) {
  const trainingCategory = await prisma.trainingCategory.upsert({
    where: { slug: "new-agent-programme" },
    create: { name: "New Agent Programme", slug: "new-agent-programme", description: "Official HouseLink Zimbabwe onboarding and professional agent training.", sortOrder: 0 },
    update: { name: "New Agent Programme", description: "Official HouseLink Zimbabwe onboarding and professional agent training.", active: true, sortOrder: 0 },
  });
  await prisma.trainingCourse.upsert({
    where: { id: COURSE_ID },
    create: {
      id: COURSE_ID,
      title: "HouseLink Zimbabwe Real Estate Agent Training",
      slug: "houselink-zimbabwe-real-estate-agent-training",
      description: "Digital course aligned to the official HouseLink Zimbabwe Real Estate Agent Training Manual.",
      categoryId: trainingCategory.id,
      tags: ["manual", "onboarding", "real estate", "sales", "lettings", "property management"],
      difficulty: "BEGINNER",
      durationMinutes: 960,
      instructor: "HouseLink Zimbabwe",
      passingPercentage: 80,
      estimatedHours: 16,
      certificateEnabled: true,
      expiresAfterDays: 365,
      price: 75,
      publicPrice: 75,
      agentPrice: 0,
      currency: "USD",
      registrationOpen: true,
      accessDurationDays: 365,
      version: 1,
      language: "English",
      status: "PUBLISHED",
      featured: true,
      visibility: "PUBLIC",
      roleNames: ["AGENT", "ADMIN", "PUBLIC_LEARNER"],
    },
    update: {
      description: "Digital course aligned to the official HouseLink Zimbabwe Real Estate Agent Training Manual.",
      categoryId: trainingCategory.id,
      tags: ["manual", "onboarding", "real estate", "sales", "lettings", "property management"],
      status: "PUBLISHED",
      featured: true,
      certificateEnabled: true,
      price: 75,
      publicPrice: 75,
      agentPrice: 0,
      currency: "USD",
      registrationOpen: true,
      accessDurationDays: 365,
      visibility: "PUBLIC",
      roleNames: ["AGENT", "ADMIN", "PUBLIC_LEARNER"],
    },
  });
  await prisma.trainingModule.deleteMany({ where: { courseId: COURSE_ID } });
  const resourcesByGroup = {
    "Client document forms": manifest.filter((item) => item.sourceCategory === "Client Documents").map((item) => item.title),
    "Operations planners and registers": manifest.filter((item) => item.sourceCategory === "Operations").map((item) => item.title),
    "Marketing templates and scripts": manifest.filter((item) => item.sourceCategory === "Marketing").map((item) => item.title),
    "Administration and compliance tools": manifest.filter((item) => item.sourceCategory === "Administration").map((item) => item.title),
    "Performance trackers and quick reference guides": manifest.filter((item) => ["Performance", "Quick Reference Guides"].includes(item.sourceCategory)).map((item) => item.title),
  };
  for (const [moduleIndex, module] of courseModules.entries()) {
    await prisma.trainingModule.create({
      data: {
        courseId: COURSE_ID,
        title: module.title,
        description: `Aligned to the official manual sequence: ${module.title}.`,
        sortOrder: moduleIndex,
        sections: {
          create: [
            {
              title: module.title,
              description: "Manual-aligned lesson sequence and supporting resources.",
              sortOrder: 0,
              lessons: {
                create: module.lessons.map((lesson, lessonIndex) => ({
                  title: lesson,
                  summary: resourcesByGroup[lesson]
                    ? `Use the Training Resources library downloads: ${resourcesByGroup[lesson].join(", ")}.`
                    : "Study this lesson in sequence with the official manual and complete the related practical work.",
                  richText: resourcesByGroup[lesson]
                    ? `<p>This lesson is supported by the following downloadable resources: ${resourcesByGroup[lesson].join(", ")}.</p>`
                    : "<p>This lesson follows the official HouseLink Zimbabwe Real Estate Agent Training Manual.</p>",
                  estimatedMinutes: 30,
                  completionRequirement: "VIEW",
                  sortOrder: lessonIndex,
                })),
              },
            },
          ],
        },
      },
    });
  }
}

async function seedAssessments() {
  for (const quiz of quizSeeds) {
    await prisma.quiz.upsert({
      where: { id: quiz.id },
      create: { id: quiz.id, courseId: COURSE_ID, title: quiz.title, description: quiz.description, passingPercentage: 80, randomise: true, timeLimitMinutes: 20, active: true },
      update: { courseId: COURSE_ID, title: quiz.title, description: quiz.description, passingPercentage: 80, randomise: true, timeLimitMinutes: 20, active: true },
    });
    await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
    for (const [questionIndex, [prompt, answers, correct]] of quiz.questions.entries()) {
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          type: "MULTIPLE_CHOICE",
          prompt,
          points: 5,
          explanation: "This question is aligned to the official HouseLink Zimbabwe Real Estate Agent Training Manual.",
          correctAnswer: { value: String(correct) },
          incorrectFeedback: "Review the related manual section and supporting resource before retaking this quiz.",
          hints: ["Check the official manual and the linked resource forms."],
          difficulty: "BEGINNER",
          randomise: false,
          categories: ["Official Manual"],
          tags: ["manual", "knowledge-check"],
          sortOrder: questionIndex,
          answers: {
            create: answers.map((answer, answerIndex) => ({
              label: answer,
              value: String(answerIndex),
              isCorrect: answerIndex === correct,
              feedback: answerIndex === correct ? "Correct." : "Not quite. Revisit the manual section.",
              sortOrder: answerIndex,
            })),
          },
        },
      });
    }
  }

  for (const [id, title, description] of assignments) {
    await prisma.assignment.upsert({
      where: { id },
      create: { id, courseId: COURSE_ID, title, description, dueDays: 14, points: 100, active: true },
      update: { courseId: COURSE_ID, title, description, dueDays: 14, points: 100, active: true },
    });
  }

  await prisma.finalExam.upsert({
    where: { id: "academy-final-exam-certified-houselink-agent" },
    create: {
      id: "academy-final-exam-certified-houselink-agent",
      courseId: COURSE_ID,
      title: "Certified HouseLink Agent Final Examination",
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
      courseId: COURSE_ID,
      title: "Certified HouseLink Agent Final Examination",
      durationMinutes: 90,
      passingScore: 80,
      questionPools: { quizzes: quizSeeds.map((quiz) => quiz.id), minimumQuestions: 6 },
      active: true,
    },
  });
}

async function seedProgrammeRecords() {
  await prisma.learningPath.upsert({
    where: { id: LEARNING_PATH_ID },
    create: {
      id: LEARNING_PATH_ID,
      title: "New Agent Programme",
      description: "Structured HouseLink onboarding path from foundations through legal compliance, sales, property management and certification.",
      status: "PUBLISHED",
      badgeTitle: "Certified HouseLink Agent",
    },
    update: {
      title: "New Agent Programme",
      description: "Structured HouseLink onboarding path from foundations through legal compliance, sales, property management and certification.",
      status: "PUBLISHED",
      badgeTitle: "Certified HouseLink Agent",
    },
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
      name: "Certified HouseLink Agent Certificate",
      logoUrl: "/brand/houselink-full-lockup.png",
      templateJson: { certificateNumberPrefix: "HLA", title: "Certified HouseLink Agent", qrVerification: true, expiryDays: 365, colours: { primary: "#008b68", accent: "#c6a15b" } },
      active: true,
    },
    update: {
      name: "Certified HouseLink Agent Certificate",
      logoUrl: "/brand/houselink-full-lockup.png",
      templateJson: { certificateNumberPrefix: "HLA", title: "Certified HouseLink Agent", qrVerification: true, expiryDays: 365, colours: { primary: "#008b68", accent: "#c6a15b" } },
      active: true,
    },
  });
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
  await prisma.badge.upsert({
    where: { id: "academy-badge-certified-houselink-agent" },
    create: { id: "academy-badge-certified-houselink-agent", name: "Certified HouseLink Agent", description: "Awarded after completing the official Academy course and final examination.", xp: 1000, active: true },
    update: { name: "Certified HouseLink Agent", description: "Awarded after completing the official Academy course and final examination.", xp: 1000, active: true },
  });
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  await seedDocuments(manifest);
  await seedCourse(manifest);
  await seedAssessments();
  await seedProgrammeRecords();
  const counts = {
    academyDocuments: await prisma.documentLibrary.count({ where: { id: { startsWith: "academy-doc-" } } }),
    courseModules: await prisma.trainingModule.count({ where: { courseId: COURSE_ID } }),
    courseLessons: await prisma.trainingLesson.count({ where: { section: { module: { courseId: COURSE_ID } } } }),
    quizzes: await prisma.quiz.count({ where: { courseId: COURSE_ID } }),
    assignments: await prisma.assignment.count({ where: { courseId: COURSE_ID } }),
    finalExams: await prisma.finalExam.count({ where: { courseId: COURSE_ID } }),
    learningPaths: await prisma.learningPath.count({ where: { id: LEARNING_PATH_ID } }),
  };
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
