import { Prisma } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";
import { getMainPrisma } from "@/lib/db/main-prisma";

const COURSE_ID = "academy-course-official-real-estate-agent-training";
const CERTIFICATE_TEMPLATE_ID = "academy-certificate-certified-homelink-agent";
const LEARNING_PATH_ID = "academy-path-new-agent-programme";

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

const courseModules = [
  {
    title: "Introduction to the HomeLink Zimbabwe Standard",
    lessons: ["Welcome to HomeLink Zimbabwe", "How to use this manual", "Your journey to becoming a professional real estate agent"],
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
  const [courseCount, documentCount, lessonCount, quizCount, assignmentCount, examCount] = await Promise.all([
    prisma.trainingCourse.count(),
    prisma.documentLibrary.count(),
    prisma.trainingLesson.count(),
    prisma.quiz.count(),
    prisma.assignment.count(),
    prisma.finalExam.count(),
  ]);

  if (courseCount && documentCount && lessonCount && quizCount && assignmentCount && examCount) return;

  const manifest = await loadManifest();
  await seedDocuments(prisma, manifest);
  await seedCourse(prisma, manifest, lessonCount === 0);
  await seedAssessments(prisma);
  await seedLearningPath(prisma);
  await seedCertificateTemplate(prisma);
  await seedEngagementRecords(prisma);
}

export async function seedOfficialAcademyResources() {
  const prisma = getMainPrisma();
  const manifest = await loadManifest();
  await seedDocuments(prisma, manifest);
  await seedCourse(prisma, manifest, true);
  await seedAssessments(prisma);
  await seedLearningPath(prisma);
  await seedCertificateTemplate(prisma);
  await seedEngagementRecords(prisma);
  return {
    academyDocuments: await prisma.documentLibrary.count({ where: { id: { startsWith: "academy-doc-" } } }),
    courseModules: await prisma.trainingModule.count({ where: { courseId: COURSE_ID } }),
    courseLessons: await prisma.trainingLesson.count({ where: { section: { module: { courseId: COURSE_ID } } } }),
    quizzes: await prisma.quiz.count({ where: { courseId: COURSE_ID } }),
    assignments: await prisma.assignment.count({ where: { courseId: COURSE_ID } }),
    finalExams: await prisma.finalExam.count({ where: { courseId: COURSE_ID } }),
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

async function seedCourse(prisma: ReturnType<typeof getMainPrisma>, manifest: AcademyResourceManifestItem[], rebuildStructure: boolean) {
  const category = await prisma.trainingCategory.upsert({
    where: { slug: "new-agent-programme" },
    create: { name: "New Agent Programme", slug: "new-agent-programme", description: "Official HomeLink Zimbabwe onboarding and professional agent training.", sortOrder: 0 },
    update: { name: "New Agent Programme", description: "Official HomeLink Zimbabwe onboarding and professional agent training.", active: true, sortOrder: 0 },
  });

  await prisma.trainingCourse.upsert({
    where: { id: COURSE_ID },
    create: officialCoursePayload(category.id),
    update: {
      categoryId: category.id,
      description: "Digital course aligned to the official HomeLink Zimbabwe Real Estate Agent Training Manual.",
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
      updatedAt: new Date(),
    },
  });

  if (!rebuildStructure) return;

  await prisma.trainingModule.deleteMany({ where: { courseId: COURSE_ID } });
  const resourcesByGroup: Record<string, string[]> = {
    "Client document forms": manifest.filter((item) => item.sourceCategory === "Client Documents").map((item) => item.title),
    "Operations planners and registers": manifest.filter((item) => item.sourceCategory === "Operations").map((item) => item.title),
    "Marketing templates and scripts": manifest.filter((item) => item.sourceCategory === "Marketing").map((item) => item.title),
    "Administration and compliance tools": manifest.filter((item) => item.sourceCategory === "Administration").map((item) => item.title),
    "Performance trackers and quick reference guides": manifest.filter((item) => ["Performance", "Quick Reference Guides"].includes(item.sourceCategory ?? "")).map((item) => item.title),
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
                create: module.lessons.map((lesson, lessonIndex) => {
                  const resourceTitles = resourcesByGroup[lesson] ?? [];
                  const lessonContent = getLessonContent(lesson, module.title);
                  return {
                    title: lesson,
                    summary: lessonContent.summary,
                    richText: lessonContent.richText,
                    videoUrl: lessonContent.videoUrl,
                    pdfUrl: lessonContent.pdfUrl,
                    estimatedMinutes: lessonContent.estimatedMinutes,
                    completionRequirement: "VIEW",
                    sortOrder: lessonIndex,
                    lessonDownloads: {
                      create: resourceTitles.slice(0, 8).map((title) => ({
                        title,
                        url: `/api/v1/academy/documents/academy-doc-${slugify(title)}/download`,
                        type: "PDF" as const,
                      })),
                    },
                  };
                }),
              },
            },
          ],
        },
      },
    });
  }
}

async function seedAssessments(prisma: ReturnType<typeof getMainPrisma>) {
  for (const quiz of quizSeeds) {
    await prisma.quiz.upsert({
      where: { id: quiz.id },
      create: { id: quiz.id, courseId: COURSE_ID, title: quiz.title, description: quiz.description, passingPercentage: 80, randomise: true, timeLimitMinutes: 20, active: true },
      update: { courseId: COURSE_ID, title: quiz.title, description: quiz.description, passingPercentage: 80, randomise: true, timeLimitMinutes: 20, active: true },
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
      title: "New Agent Programme",
      description: "Structured HomeLink onboarding path from foundations through legal compliance, sales, property management and certification.",
      status: "PUBLISHED",
      badgeTitle: "Certified HomeLink Agent",
    },
    update: {
      title: "New Agent Programme",
      description: "Structured HomeLink onboarding path from foundations through legal compliance, sales, property management and certification.",
      status: "PUBLISHED",
      badgeTitle: "Certified HomeLink Agent",
    },
  });
  await prisma.pathCourse.upsert({
    where: { pathId_courseId: { pathId: LEARNING_PATH_ID, courseId: COURSE_ID } },
    create: { pathId: LEARNING_PATH_ID, courseId: COURSE_ID, sortOrder: 0, required: true },
    update: { sortOrder: 0, required: true },
  });
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
  await prisma.badge.upsert({
    where: { id: "academy-badge-certified-homelink-agent" },
    create: { id: "academy-badge-certified-homelink-agent", name: "Certified HomeLink Agent", description: "Awarded after completing the official Academy course and final examination.", xp: 1000, active: true },
    update: { name: "Certified HomeLink Agent", description: "Awarded after completing the official Academy course and final examination.", xp: 1000, active: true },
  });
}

async function ensureDocumentCategory(prisma: ReturnType<typeof getMainPrisma>, name: string, sortOrder: number) {
  return prisma.documentCategory.upsert({
    where: { slug: slugify(name) },
    create: { name, slug: slugify(name), description: `${name} used by HomeLink Agent Academy.`, sortOrder },
    update: { name, description: `${name} used by HomeLink Agent Academy.`, sortOrder },
  });
}

function officialCoursePayload(categoryId: string) {
  return {
    id: COURSE_ID,
    title: "HomeLink Zimbabwe Real Estate Agent Training",
    slug: "homelink-zimbabwe-real-estate-agent-training",
    description: "Digital course aligned to the official HomeLink Zimbabwe Real Estate Agent Training Manual.",
    categoryId,
    tags: ["manual", "onboarding", "real estate", "sales", "lettings", "property management"],
    difficulty: "BEGINNER" as const,
    durationMinutes: 960,
    instructor: "HomeLink Zimbabwe",
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
    status: "PUBLISHED" as const,
    featured: true,
    visibility: "PUBLIC" as const,
    roleNames: ["AGENT", "ADMIN", "PUBLIC_LEARNER"],
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "academy";
}

function getLessonContent(lessonTitle: string, moduleTitle: string) {
  const lessonMap: Record<string, { summary: string; richText: string; videoUrl?: string; pdfUrl?: string; estimatedMinutes: number }> = {
    "Welcome to HomeLink Zimbabwe": {
      summary: "Introduction to the HomeLink Zimbabwe platform and your journey as a real estate professional.",
      richText: `<h2>Welcome to HomeLink Zimbabwe</h2>
        <p>This lesson introduces you to HomeLink Zimbabwe, the leading property platform connecting buyers, sellers, landlords, and tenants across the country. You will learn about our mission, values, and the opportunities available to certified agents.</p>
        <h3>What You'll Learn</h3>
        <ul>
          <li>HomeLink Zimbabwe's history and market position</li>
          <li>The benefits of becoming a certified HomeLink agent</li>
          <li>Overview of the agent portal and tools</li>
          <li>Success stories from top-performing agents</li>
        </ul>
        <h3>Key Takeaways</h3>
        <p>By the end of this lesson, you'll understand why HomeLink is the preferred choice for property professionals in Zimbabwe and how to leverage our platform for your success.</p>`,
      estimatedMinutes: 25,
    },
    "How to use this manual": {
      summary: "Guide to navigating and effectively using the HomeLink training manual.",
      richText: `<h2>How to Use This Training Manual</h2>
        <p>This manual is your comprehensive guide to becoming a successful real estate agent with HomeLink Zimbabwe. Each chapter builds upon the previous one, so we recommend studying in sequence.</p>
        <h3>Manual Structure</h3>
        <ul>
          <li><strong>Foundations:</strong> Real estate basics and professional ethics</li>
          <li><strong>Operations:</strong> Daily workflows and business generation</li>
          <li><strong>Compliance:</strong> Legal requirements and documentation</li>
          <li><strong>Excellence:</strong> Building a sustainable career</li>
        </ul>
        <h3>Study Tips</h3>
        <p>Take notes, complete the knowledge checks, and apply what you learn in practical scenarios. The manual includes downloadable templates and checklists to support your daily work.</p>`,
      estimatedMinutes: 20,
    },
    "Your journey to becoming a professional real estate agent": {
      summary: "Overview of the certification path and career opportunities with HomeLink.",
      richText: `<h2>Your Journey to Professional Excellence</h2>
        <p>Becoming a certified HomeLink agent opens doors to a rewarding career in Zimbabwe's dynamic real estate market. This lesson outlines your path from trainee to certified professional.</p>
        <h3>Certification Path</h3>
        <ol>
          <li>Complete all course modules and lessons</li>
          <li>Pass knowledge checks with 80% or higher</li>
          <li>Submit practical assignments for review</li>
          <li>Pass the final certification examination</li>
          <li>Receive your HomeLink Agent Certificate</li>
        </ol>
        <h3>Career Opportunities</h3>
        <p>Certified agents access exclusive listings, commission structures, marketing support, and ongoing professional development. Join our network of successful property professionals.</p>`,
      estimatedMinutes: 30,
    },
    "Understanding the real estate industry": {
      summary: "Comprehensive overview of the Zimbabwe real estate market landscape.",
      richText: `<h2>Understanding the Real Estate Industry</h2>
        <p>The Zimbabwe real estate market offers significant opportunities for trained professionals. This lesson provides market insights, trends, and the role of agents in property transactions.</p>
        <h3>Market Overview</h3>
        <ul>
          <li>Current market conditions and trends in Zimbabwe</li>
          <li>Key property sectors: residential, commercial, industrial</li>
          <li>Urban vs rural market dynamics</li>
          <li>Impact of economic factors on property values</li>
          <li>Understanding property cycles and market timing</li>
        </ul>
        <h3>The Agent's Role</h3>
        <p>Real estate agents facilitate property transactions, provide market expertise, negotiate deals, and ensure legal compliance. Your role is critical in connecting buyers and sellers while protecting all parties' interests.</p>
        <h3>Key Market Players</h3>
        <ul>
          <li>Property owners and investors</li>
          <li>Real estate agents and agencies</li>
          <li>Property developers</li>
          <li>Legal professionals and conveyancers</li>
          <li>Financial institutions and mortgage lenders</li>
        </ul>
        <h3>Market Trends in Zimbabwe</h3>
        <p>The Zimbabwean property market has unique characteristics influenced by economic policies, urbanization rates, and foreign investment patterns. Understanding these trends helps you provide better advice to clients.</p>`,
      estimatedMinutes: 45,
    },
    "Role, duties and responsibilities of a professional agent": {
      summary: "Detailed explanation of what it means to be a professional real estate agent.",
      richText: `<h2>Role, Duties and Responsibilities</h2>
        <p>Professional real estate agents have specific duties and ethical obligations. This lesson defines your responsibilities to clients, the industry, and the public.</p>
        <h3>Core Responsibilities</h3>
        <ul>
          <li>Property valuation and market analysis</li>
          <li>Marketing and advertising properties</li>
          <li>Conducting property viewings</li>
          <li>Negotiating offers and closing deals</li>
          <li>Maintaining accurate records</li>
        </ul>
        <h3>Fiduciary Duties</h3>
        <p>As an agent, you owe fiduciary duties to your clients including loyalty, confidentiality, full disclosure, and reasonable care. Understanding these duties is essential for professional practice.</p>`,
      estimatedMinutes: 40,
    },
    "Professional ethics, conduct and customer service": {
      summary: "Ethical standards and customer service excellence for real estate agents.",
      richText: `<h2>Professional Ethics and Customer Service</h2>
        <p>Ethical conduct is the foundation of a successful real estate career. This lesson covers professional standards, ethical dilemmas, and delivering exceptional customer service.</p>
        <h3>Ethical Principles</h3>
        <ul>
          <li>Honesty and integrity in all dealings</li>
          <li>Fair treatment of all parties</li>
          <li>Confidentiality of client information</li>
          <li>Disclosure of material facts</li>
          <li>Avoidance of conflicts of interest</li>
          <li>Professional competence and continuous improvement</li>
        </ul>
        <h3>Customer Service Excellence</h3>
        <p>Build lasting relationships through responsive communication, market expertise, and going above and beyond for your clients. Happy clients become repeat customers and referrals.</p>
        <h3>Handling Ethical Dilemmas</h3>
        <ul>
          <li>Identify potential conflicts early</li>
          <li>Consult with supervisors or legal counsel when uncertain</li>
          <li>Document all decisions and communications</li>
          <li>Prioritize client interests while maintaining fairness</li>
          <li>Know when to decline representation</li>
        </ul>
        <h3>Building Trust</h3>
        <p>Trust is earned through consistent ethical behavior, transparency, and delivering on promises. Your reputation is your most valuable asset in real estate.</p>`,
      estimatedMinutes: 35,
    },
    "Essential real estate terminology": {
      summary: "Key terms and vocabulary used in the Zimbabwe real estate industry.",
      richText: `<h2>Essential Real Estate Terminology</h2>
        <p>Master the language of real estate to communicate professionally with clients, colleagues, and legal professionals. This lesson covers essential terminology.</p>
        <h3>Property Terms</h3>
        <ul>
          <li><strong>Freehold:</strong> Complete ownership of property and land</li>
          <li><strong>Leasehold:</strong> Rights to occupy property for a specified period</li>
          <li><strong>Sectional Title:</strong> Ownership of a unit in a complex</li>
          <li><strong>Stand:</strong> A plot of land for development</li>
        </ul>
        <h3>Transaction Terms</li>
        <ul>
          <li><strong>Offer to Purchase:</strong> Formal written offer to buy property</li>
          <li><strong>Deed of Sale:</strong> Legal transfer document</li>
          <li><strong>Conveyancing:</strong> Legal process of property transfer</li>
          <li><strong>Bond:</strong> Mortgage loan secured by property</li>
        </ul>`,
      estimatedMinutes: 30,
    },
    "Chapter 1 knowledge check and practical assessment": {
      summary: "Assessment of your understanding of real estate foundations.",
      richText: `<h2>Chapter 1 Knowledge Check</h2>
        <p>This assessment tests your understanding of the foundational concepts covered in Chapter 1. Complete the knowledge check and practical assessment to demonstrate your competency.</p>
        <h3>Assessment Components</h3>
        <ul>
          <li>Multiple choice questions on industry knowledge</li>
          <li>Scenario-based ethical dilemmas</li>
          <li>Terminology matching exercise</li>
          <li>Practical case study analysis</li>
        </ul>
        <h3>Passing Score</h3>
        <p>You must achieve 80% or higher to proceed to the next chapter. Review the lessons and retake the assessment if needed.</p>`,
      estimatedMinutes: 30,
    },
  };

  // Default content for lessons not specifically defined
  return lessonMap[lessonTitle] || {
    summary: `Study this lesson in the ${moduleTitle} module to advance your real estate knowledge and skills.`,
    richText: `<h2>${lessonTitle}</h2>
      <p>This lesson is part of the <strong>${moduleTitle}</strong> module. Study the content carefully and complete any associated assessments.</p>
      <h3>Learning Objectives</h3>
      <ul>
        <li>Understand the key concepts of ${lessonTitle}</li>
        <li>Apply this knowledge in practical scenarios</li>
        <li>Complete the knowledge check for this lesson</li>
      </ul>
      <p>Refer to the official HomeLink Zimbabwe Real Estate Agent Training Manual for detailed information and supporting resources.</p>`,
    estimatedMinutes: 30,
  };
}
