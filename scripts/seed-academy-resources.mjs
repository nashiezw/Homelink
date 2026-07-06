import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const root = process.cwd();
const manifestPath = path.join(root, "public", "uploads", "academy", "academy-resources-manifest.json");

const COURSE_ID = "academy-course-official-real-estate-agent-training";

const courseModules = [
  {
    title: "Introduction to the HomeLink Zimbabwe Standard",
    lessons: [
      "Welcome to HomeLink Zimbabwe",
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
  return descriptions[category] ?? `${category} used by HomeLink Agent Academy.`;
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
        permissions: ["ADMIN", "AGENT"],
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
        permissions: ["ADMIN", "AGENT"],
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
    create: { name: "New Agent Programme", slug: "new-agent-programme", description: "Official HomeLink Zimbabwe onboarding and professional agent training.", sortOrder: 0 },
    update: { name: "New Agent Programme", description: "Official HomeLink Zimbabwe onboarding and professional agent training.", active: true, sortOrder: 0 },
  });
  await prisma.trainingCourse.upsert({
    where: { id: COURSE_ID },
    create: {
      id: COURSE_ID,
      title: "HomeLink Zimbabwe Real Estate Agent Training",
      slug: "homelink-zimbabwe-real-estate-agent-training",
      description: "Digital course aligned to the official HomeLink Zimbabwe Real Estate Agent Training Manual.",
      categoryId: trainingCategory.id,
      tags: ["manual", "onboarding", "real estate", "sales", "lettings", "property management"],
      difficulty: "BEGINNER",
      durationMinutes: 960,
      instructor: "HomeLink Zimbabwe",
      passingPercentage: 80,
      estimatedHours: 16,
      certificateEnabled: true,
      expiresAfterDays: 365,
      version: 1,
      language: "English",
      status: "PUBLISHED",
      featured: true,
      visibility: "INTERNAL_ONLY",
      roleNames: ["AGENT", "ADMIN"],
    },
    update: {
      description: "Digital course aligned to the official HomeLink Zimbabwe Real Estate Agent Training Manual.",
      categoryId: trainingCategory.id,
      tags: ["manual", "onboarding", "real estate", "sales", "lettings", "property management"],
      status: "PUBLISHED",
      featured: true,
      certificateEnabled: true,
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
                    : "<p>This lesson follows the official HomeLink Zimbabwe Real Estate Agent Training Manual.</p>",
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

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  await seedDocuments(manifest);
  await seedCourse(manifest);
  const counts = {
    academyDocuments: await prisma.documentLibrary.count({ where: { id: { startsWith: "academy-doc-" } } }),
    courseModules: await prisma.trainingModule.count({ where: { courseId: COURSE_ID } }),
    courseLessons: await prisma.trainingLesson.count({ where: { section: { module: { courseId: COURSE_ID } } } }),
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
