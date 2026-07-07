import { readFile } from "fs/promises";
import path from "path";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { ACADEMY_FULL_MANUAL_URL } from "@/lib/academy/academy-constants";
import { ACADEMY_PROGRAMME_COURSES, LEGACY_COURSE_ID } from "@/lib/academy/academy-programme";
import { lessonHandoutUrl } from "@/lib/academy/lesson-handouts";
import { toAcademyFileDownloadUrl } from "@/lib/academy/academy-files";

const MANIFEST_PATH = path.join(process.cwd(), "public", "uploads", "academy", "academy-resources-manifest.json");

type ManifestItem = {
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  sourceCategory?: string;
  category: string;
};

type LessonSeed = {
  title: string;
  stage: "Beginner" | "Intermediate" | "Advanced" | "Professional Kit";
  summary: string;
  richText: string;
  objectives: string[];
  estimatedMinutes: number;
  completionRequirement?: string;
  resourceTitles?: string[];
  discussionPrompt?: string;
};

type ModuleSeed = {
  title: string;
  stage: LessonSeed["stage"];
  description: string;
  objectives: string[];
  lessons: LessonSeed[];
};

export const modules: ModuleSeed[] = [
  {
    title: "Introduction to the HomeLink Zimbabwe Standard",
    stage: "Beginner",
    description: "Orientation to HomeLink, professional expectations, and how to use the Academy programme.",
    objectives: ["Understand HomeLink's mission and your role", "Navigate the Academy and resource kit", "Set professional development goals"],
    lessons: [
      {
        title: "Welcome to HomeLink Zimbabwe",
        stage: "Beginner",
        summary: "Your official entry into the HomeLink agent community and Zimbabwe's premium property marketplace.",
        richText: `<p>Welcome to HomeLink Zimbabwe — a marketplace built on trust, verified listings, and professional agent standards. As an agent, you represent both your clients and the HomeLink brand in every conversation, viewing, and transaction.</p><p>This programme is structured in stages: <strong>Beginner</strong>, <strong>Intermediate</strong>, and <strong>Advanced</strong>, so you build confidence step by step rather than trying to absorb everything at once.</p><p>Complete each lesson in order, download the branded tools provided, and apply them in the field before moving to the next stage.</p>`,
        objectives: ["Explain HomeLink's role in Zimbabwe property", "Describe the staged training pathway", "Commit to professional conduct standards"],
        estimatedMinutes: 20,
        discussionPrompt: "What motivated you to join HomeLink, and what does professional success look like for you in the next 90 days?",
      },
      {
        title: "How to use this Academy",
        stage: "Beginner",
        summary: "How to progress through modules, use branded downloads, and track your certification path.",
        richText: `<p>Each lesson includes reading material, practical downloads, and checkpoints. Branded PDFs in this Academy are print-ready HomeLink resources — forms, checklists, and planners — not generic placeholders.</p><p>Use <strong>Continue learning</strong> on your dashboard to resume where you left off. Bookmark lessons you want to revisit. The full training manual is available once in the Resource Library for reference — individual lessons link only to the tools you need for that topic.</p><p>Quizzes and assignments appear at stage checkpoints. Pass marks and certificates are tracked in your learner dashboard.</p>`,
        objectives: ["Navigate the learner dashboard", "Use lesson downloads correctly", "Understand quiz and certificate requirements"],
        estimatedMinutes: 15,
        resourceTitles: ["Agent Daily Workflow"],
      },
      {
        title: "Your journey to becoming a professional agent",
        stage: "Beginner",
        summary: "Set goals and routines for a sustainable, ethical real estate career with HomeLink.",
        richText: `<p>Top agents combine daily discipline with client care. Your journey starts with honest communication, accurate records, and consistent follow-through — not shortcuts.</p><p>Use the Personal Goal Planner to define income targets, skill milestones, and weekly activity goals. Review progress weekly and adjust based on real pipeline data.</p><p>HomeLink expects every agent to protect client confidentiality, represent properties accurately, and escalate issues through proper channels.</p>`,
        objectives: ["Set 90-day professional goals", "Adopt weekly review habits", "Identify your first skill priorities"],
        estimatedMinutes: 25,
        resourceTitles: ["Personal Goal Planner", "Weekly Performance Review"],
      },
    ],
  },
  {
    title: "Foundations of Real Estate",
    stage: "Beginner",
    description: "Industry basics, agent duties, ethics, terminology, and your first knowledge checkpoint.",
    objectives: ["Master core real estate concepts", "Apply HomeLink ethics in daily work", "Pass the foundations knowledge check"],
    lessons: [
      {
        title: "Understanding the real estate industry",
        stage: "Beginner",
        summary: "How sales, lettings, and property management work in Zimbabwe's market context.",
        richText: `<p>Real estate in Zimbabwe spans residential sales, rentals, commercial property, and land. Agents connect owners, buyers, tenants, and landlords while managing documentation, viewings, and negotiations.</p><p>Success depends on market knowledge, reliable data, and professional networks — not pressure tactics. HomeLink gives you a verified platform; your job is to add local expertise and trustworthy service.</p>`,
        objectives: ["Describe key market segments", "Explain the agent's place in a transaction", "Identify HomeLink's marketplace advantages"],
        estimatedMinutes: 30,
      },
      {
        title: "Role, duties and responsibilities of a professional agent",
        stage: "Beginner",
        summary: "What clients and HomeLink expect from you every day.",
        richText: `<p>Your duties include accurate listing information, timely communication, safe viewings, proper documentation, and transparent fee discussions. You must never misrepresent availability, price, or property condition.</p><p>Document every material conversation and keep client files complete. When in doubt, ask a senior agent or HomeLink admin before proceeding.</p>`,
        objectives: ["List core agent duties", "Document client interactions properly", "Recognise when to escalate"],
        estimatedMinutes: 35,
        resourceTitles: ["Client Information Sheet"],
      },
      {
        title: "Professional ethics, conduct and customer service",
        stage: "Beginner",
        summary: "Ethical standards that protect clients, HomeLink, and your reputation.",
        richText: `<p>Ethical conduct means honesty, confidentiality, fair dealing, and respect — especially under pressure. Never share one client's details with another without consent. Never guarantee outcomes you cannot control.</p><p>Customer service on HomeLink is responsive, clear, and solution-focused. Acknowledge messages promptly, confirm appointments in writing, and follow up after every viewing.</p>`,
        objectives: ["Apply HomeLink ethics checklist", "Handle confidential information safely", "Deliver consistent client communication"],
        estimatedMinutes: 30,
      },
      {
        title: "Essential real estate terminology",
        stage: "Beginner",
        summary: "Key terms for sales, lettings, offers, and compliance conversations.",
        richText: `<p>Fluency in industry language builds client confidence. Know the difference between mandate types, deposit vs. bond, lease vs. licence, and sole vs. open mandate.</p><p>When explaining terms to clients, use plain language first, then confirm understanding. Keep a personal glossary and add local practice notes as you gain experience.</p>`,
        objectives: ["Define 15+ core terms accurately", "Explain terms clearly to clients", "Avoid common terminology mistakes"],
        estimatedMinutes: 25,
      },
      {
        title: "Chapter 1 knowledge check and practical assessment",
        stage: "Beginner",
        summary: "Consolidate foundations and complete the Chapter 1 quiz.",
        richText: `<p>Review modules one and two before attempting the knowledge check. Focus on duties, ethics, terminology, and client communication scenarios.</p><p>After passing the quiz, complete any pending downloads and note areas for field practice with your mentor or branch lead.</p>`,
        objectives: ["Pass the Chapter 1 knowledge check", "Identify gaps for field practice", "Prepare for Intermediate stage"],
        estimatedMinutes: 40,
        completionRequirement: "QUIZ",
      },
    ],
  },
  {
    title: "Prospecting, Listings and Property Marketing",
    stage: "Intermediate",
    description: "Generate business, win listings, capture quality data, and market properties professionally.",
    objectives: ["Run a daily prospecting routine", "Publish compliant listings", "Use HomeLink marketing tools"],
    lessons: [
      {
        title: "Prospecting and daily business generation",
        stage: "Intermediate",
        summary: "Build a predictable pipeline with structured daily activity.",
        richText: `<p>Prospecting is disciplined outreach: calls, follow-ups, referrals, and community visibility. Plan targets daily and log every lead in your tracker.</p><p>Use the Daily Activity Planner and Lead Tracking Sheet to stay accountable. Consistency beats occasional bursts of activity.</p>`,
        objectives: ["Plan daily prospecting blocks", "Log leads systematically", "Measure weekly activity KPIs"],
        estimatedMinutes: 35,
        resourceTitles: ["Daily Activity Planner", "Lead Tracking Sheet", "Cold Calling Scripts", "Telephone Scripts"],
      },
      {
        title: "Winning listings and conducting property appraisals",
        stage: "Intermediate",
        summary: "Present professionally, appraise accurately, and secure mandates.",
        richText: `<p>Listing presentations should demonstrate market knowledge, marketing plan, and HomeLink's reach. Appraisals must be evidence-based — comparable sales, condition, location, and demand.</p><p>Complete the Property Appraisal Form on every serious listing appointment and attach photos where possible.</p>`,
        objectives: ["Structure a listing presentation", "Complete appraisal documentation", "Handle common vendor objections"],
        estimatedMinutes: 40,
        resourceTitles: ["Property Appraisal Form", "Listing Agreement Template", "Objection Handling Guide"],
      },
      {
        title: "Collecting accurate listing information",
        stage: "Intermediate",
        summary: "Capture complete, verified property details before publishing.",
        richText: `<p>Incomplete listings damage trust and waste buyer time. Verify ownership authority, pricing, availability, keys/access, utilities, and material defects before go-live.</p><p>Use the Property Listing Form and File Checklist together — nothing goes to market until both are satisfied.</p>`,
        objectives: ["Verify listing authority and facts", "Complete listing forms accurately", "Apply file checklist before submission"],
        estimatedMinutes: 35,
        resourceTitles: ["Property Listing Form", "File Checklist", "Property Inspection Checklist"],
      },
      {
        title: "Property photography, descriptions and marketing channels",
        stage: "Intermediate",
        summary: "Present properties at a premium standard across HomeLink and social channels.",
        richText: `<p>Photography should be bright, straight, and honest — no misleading angles. Descriptions must highlight features without exaggeration.</p><p>Follow the Property Photography and Marketing checklists. Use WhatsApp and social templates for consistent HomeLink-branded outreach.</p>`,
        objectives: ["Apply photography standards", "Write accurate descriptions", "Execute multi-channel marketing"],
        estimatedMinutes: 40,
        resourceTitles: ["Property Photography Checklist", "Property Marketing Checklist", "Property Description Template", "WhatsApp Marketing Templates", "Social Media Content Planner"],
      },
      {
        title: "Chapter 2 knowledge check and practical assessment",
        stage: "Intermediate",
        summary: "Validate listings and marketing competency before client-work modules.",
        richText: `<p>Complete the Chapter 2 quiz and submit the listing file assignment using your branded forms. Your submission should include a completed listing form, inspection checklist, and marketing checklist.</p>`,
        objectives: ["Pass Chapter 2 knowledge check", "Submit listing file assignment", "Demonstrate marketing workflow"],
        estimatedMinutes: 45,
        completionRequirement: "QUIZ",
        resourceTitles: ["Listing Tracker", "Compliance Checklist"],
      },
    ],
  },
  {
    title: "Working with Clients",
    stage: "Intermediate",
    description: "Qualify buyers and tenants, run viewings, and manage offers professionally.",
    objectives: ["Qualify clients properly", "Run safe, productive viewings", "Manage offers and follow-up"],
    lessons: [
      {
        title: "Qualifying buyers and tenants",
        stage: "Intermediate",
        summary: "Match clients to suitable properties with proper registration and needs analysis.",
        richText: `<p>Qualification protects everyone: budget, timeline, location, must-haves, and authority to proceed. Use registration forms for every serious enquiry.</p><p>Buyer and tenant needs analysis forms structure your discovery conversation and feed better property matches.</p>`,
        objectives: ["Complete buyer/tenant registration", "Run needs analysis interviews", "Filter unsuitable enquiries early"],
        estimatedMinutes: 35,
        resourceTitles: ["Buyer Registration Form", "Tenant Registration Form", "Buyer Needs Analysis Form", "Tenant Needs Analysis Form"],
      },
      {
        title: "Matching clients with the right property",
        stage: "Intermediate",
        summary: "Shortlist ethically and explain fit clearly.",
        richText: `<p>Present no more than a focused shortlist aligned to documented needs. Explain trade-offs honestly — location vs. budget, condition vs. price.</p><p>Log every match and client reaction in your follow-up register for accountability and better recommendations next time.</p>`,
        objectives: ["Build evidence-based shortlists", "Document client preferences", "Manage expectations transparently"],
        estimatedMinutes: 30,
        resourceTitles: ["Client Follow-Up Register", "Email Templates"],
      },
      {
        title: "Managing property viewings",
        stage: "Intermediate",
        summary: "Safe, punctual, professional viewings with full records.",
        richText: `<p>Confirm viewings in writing, arrive early, respect the property, and never rush clients. Safety first: verify identity where required and follow HomeLink viewing guidelines.</p><p>Every viewing goes in the Property Viewing Register; feedback captured on the Viewing Feedback Form drives next steps.</p>`,
        objectives: ["Run viewings to HomeLink standard", "Complete viewing register entries", "Capture structured feedback"],
        estimatedMinutes: 35,
        resourceTitles: ["Property Viewing Register", "Viewing Feedback Form", "Open House Checklist", "Appointment Schedule"],
      },
      {
        title: "Understanding and presenting offers",
        stage: "Intermediate",
        summary: "Guide clients through offers, rentals applications, and next steps.",
        richText: `<p>Present offers clearly: price, conditions, timelines, and contingencies. Never pressure clients. Ensure rental applications and offer documents are complete before submission.</p><p>Use official templates and escalate legal questions to qualified professionals.</p>`,
        objectives: ["Explain offer components clearly", "Use correct application templates", "Maintain neutral professional guidance"],
        estimatedMinutes: 35,
        resourceTitles: ["Offer to Purchase Template", "Rental Application Form"],
      },
      {
        title: "Chapter 3 client service simulation",
        stage: "Intermediate",
        summary: "Apply client workflows in a practical assignment.",
        richText: `<p>Submit a viewing record assignment: viewing register entry, feedback form, and written follow-up plan for a real or practice scenario.</p><p>This checkpoint confirms you can execute the full client journey before advancing to compliance modules.</p>`,
        objectives: ["Complete viewing record assignment", "Demonstrate follow-up planning", "Ready for Advanced stage"],
        estimatedMinutes: 45,
        completionRequirement: "ASSIGNMENT",
      },
    ],
  },
  {
    title: "Documentation, Legal Awareness and Compliance",
    stage: "Advanced",
    description: "Handle documents, contracts, and confidentiality to HomeLink standard.",
    objectives: ["Maintain complete client files", "Apply compliance checklists", "Protect confidential data"],
    lessons: [
      {
        title: "Why documentation matters",
        stage: "Advanced",
        summary: "Documentation protects clients, agents, and HomeLink from dispute and loss.",
        richText: `<p>Verbal agreements fail under pressure. Written, signed, dated records create clarity and audit trails. Treat every file as if it will be reviewed tomorrow.</p>`,
        objectives: ["Explain documentation risks", "Adopt file-first habits", "Use checklists consistently"],
        estimatedMinutes: 25,
      },
      {
        title: "Common documents used by real estate agents",
        stage: "Advanced",
        summary: "Know which form applies to each transaction stage.",
        richText: `<p>From registration forms to mandates, inspection reports, applications, and compliance submissions — each document has a purpose. Keep master copies in your resource kit and complete them fully before upload to HomeLink or branch records.</p>`,
        objectives: ["Match documents to transaction stages", "Access the correct branded templates", "Avoid incomplete submissions"],
        estimatedMinutes: 30,
        resourceTitles: ["Document Submission Checklist", "Seller Information Form", "Landlord Registration Form"],
      },
      {
        title: "Completing documents accurately",
        stage: "Advanced",
        summary: "Accuracy, legibility, and consistency on every form.",
        richText: `<p>Illegible or inconsistent data causes delays and disputes. Double-check names, IDs, amounts, dates, and signatures. Use the Document Submission Checklist before any file leaves your desk.</p>`,
        objectives: ["Apply accuracy standards", "Complete submission checklist", "Review files before handover"],
        estimatedMinutes: 30,
        resourceTitles: ["Document Submission Checklist", "File Checklist"],
      },
      {
        title: "Understanding contracts and confidentiality",
        stage: "Advanced",
        summary: "Confidentiality, mandate terms, and when to seek legal advice.",
        richText: `<p>You are not a lawyer — but you must understand mandate basics, confidentiality duties, and referral boundaries. Never advise on legal interpretation; escalate to qualified professionals.</p><p>Client financial and identity data stays confidential unless disclosure is legally required or authorised.</p>`,
        objectives: ["Protect confidential client data", "Recognise legal referral boundaries", "Explain mandate basics accurately"],
        estimatedMinutes: 35,
      },
      {
        title: "Chapter 4 compliance assessment",
        stage: "Advanced",
        summary: "Compliance quiz and file review checkpoint.",
        richText: `<p>Pass the Chapter 4 knowledge check and review your sample client file against the File and Compliance checklists. Fix any gaps before proceeding to performance modules.</p>`,
        objectives: ["Pass compliance knowledge check", "Audit a sample client file", "Correct documentation gaps"],
        estimatedMinutes: 40,
        completionRequirement: "QUIZ",
        resourceTitles: ["Compliance Checklist"],
      },
    ],
  },
  {
    title: "Becoming a Top-Performing Agent",
    stage: "Advanced",
    description: "Performance habits, KPIs, reputation, and certification readiness.",
    objectives: ["Build sustainable performance routines", "Track KPIs weekly", "Prepare for final certification"],
    lessons: [
      {
        title: "Building a successful real estate career",
        stage: "Advanced",
        summary: "Long-term career design: specialisation, reputation, and continuous learning.",
        richText: `<p>Sustainable careers combine skill, reputation, and systems. Choose niches where you can excel — rentals, sales, commercial — and deepen expertise rather than chasing every lead.</p>`,
        objectives: ["Define your career niche", "Plan continuous learning", "Build referral networks"],
        estimatedMinutes: 30,
      },
      {
        title: "Daily, weekly and monthly success routines",
        stage: "Advanced",
        summary: "Planners and workflows that top agents use consistently.",
        richText: `<p>Structure beats motivation. Use the Daily Activity Planner each morning, Weekly Planner for priorities, and Monthly KPI Tracker for results review.</p><p>The Agent Daily Workflow flowchart gives a visual checklist for high-productivity days.</p>`,
        objectives: ["Implement daily planning ritual", "Run weekly performance reviews", "Track monthly KPIs"],
        estimatedMinutes: 35,
        resourceTitles: ["Daily Activity Planner", "Weekly Planner", "Monthly Planner", "Agent Daily Workflow", "Monthly KPI Tracker"],
      },
      {
        title: "Tracking pipeline and performance",
        stage: "Advanced",
        summary: "Measure what matters: leads, viewings, listings, and closed deals.",
        richText: `<p>Pipeline visibility prevents feast-or-famine cycles. Update your Listing Tracker, Closed Deals Register, and Sales Performance Tracker weekly.</p><p>Commission calculations should be understood early — use the Commission Calculation Worksheet for transparency with clients and personal forecasting.</p>`,
        objectives: ["Maintain live pipeline data", "Review conversion metrics", "Forecast commission accurately"],
        estimatedMinutes: 35,
        resourceTitles: ["Listing Tracker", "Closed Deals Register", "Sales Performance Tracker", "Commission Calculation Worksheet", "Expense Tracker", "Mileage Log"],
      },
      {
        title: "Professional reputation and long-term growth",
        stage: "Advanced",
        summary: "Reviews, referrals, and brand building on HomeLink.",
        richText: `<p>Your reputation is your most valuable asset. Deliver on promises, respond professionally to complaints, and ask satisfied clients for reviews through proper HomeLink channels.</p><p>Personal branding should align with HomeLink standards — professional photos, consistent messaging, no misleading claims.</p>`,
        objectives: ["Grow reviews ethically", "Build referral habits", "Align personal brand with HomeLink"],
        estimatedMinutes: 30,
      },
      {
        title: "Final competency checklist",
        stage: "Advanced",
        summary: "Confirm readiness for the Certified HomeLink Agent final examination.",
        richText: `<p>Before the final exam, verify you have completed all stage lessons, downloaded and used key branded tools, passed module quizzes, and submitted practical assignments.</p><p>The full training manual remains in the Resource Library for deep reference — your certification is based on this staged programme and assessments.</p>`,
        objectives: ["Complete competency checklist", "Schedule final examination", "Identify final revision areas"],
        estimatedMinutes: 30,
        completionRequirement: "QUIZ",
        resourceTitles: ["Weekly Performance Review"],
      },
    ],
  },
  {
    title: "Professional Agent Resource Kit",
    stage: "Professional Kit",
    description: "HomeLink-branded print-ready forms, planners, flowcharts, and templates — your field toolkit.",
    objectives: ["Access all branded Academy downloads", "Know which tool to use when", "Keep a complete digital field kit"],
    lessons: [
      {
        title: "Client document forms",
        stage: "Professional Kit",
        summary: "Print-ready buyer, seller, tenant, and landlord forms with HomeLink branding.",
        richText: `<p>These A4 forms are recreated for HomeLink agents — use them on every qualified client engagement. Download, print or fill digitally, and store copies in the client file.</p>`,
        objectives: ["Download all client registration forms", "Use correct form per client type", "File completed forms properly"],
        estimatedMinutes: 20,
        resourceTitles: ["Seller Information Form", "Buyer Registration Form", "Tenant Registration Form", "Landlord Registration Form", "Client Information Sheet"],
      },
      {
        title: "Operations planners and registers",
        stage: "Professional Kit",
        summary: "Daily planners, viewing registers, and appointment tools.",
        richText: `<p>Operational excellence runs on simple registers. Keep viewing, follow-up, and appointment records current — they protect you in disputes and improve conversion.</p><p><strong>Practical exercise:</strong> Set up your weekly planner template today. Block prospecting, follow-up, and admin time before adding client appointments.</p><p>Review every open enquiry in your Client Follow-Up Register each Friday and schedule next actions before the week ends.</p>`,
        objectives: ["Set up operational templates", "Maintain viewing and follow-up registers", "Plan appointments systematically"],
        estimatedMinutes: 20,
        resourceTitles: ["Daily Activity Planner", "Weekly Planner", "Monthly Planner", "Appointment Schedule", "Property Viewing Register", "Client Follow-Up Register"],
      },
      {
        title: "Marketing templates and scripts",
        stage: "Professional Kit",
        summary: "WhatsApp, social, email, and telephone scripts aligned to HomeLink.",
        richText: `<p>Consistent messaging builds brand trust. Adapt templates to each client but keep tone professional and compliant with HomeLink marketing rules.</p><p><strong>Practical exercise:</strong> Customise the WhatsApp introduction template for three property types you list most often. Save versions in your toolkit folder.</p><p>Never promise outcomes in scripts — focus on clarity, next steps, and permission to follow up.</p>`,
        objectives: ["Use WhatsApp and social templates", "Apply telephone and cold-call scripts", "Plan campaigns with content planner"],
        estimatedMinutes: 25,
        resourceTitles: ["WhatsApp Marketing Templates", "Social Media Content Planner", "Email Templates", "Telephone Scripts", "Cold Calling Scripts"],
      },
      {
        title: "Administration and compliance tools",
        stage: "Professional Kit",
        summary: "Checklists for files, compliance, inspections, and submissions.",
        richText: `<p>Run every listing and client file through the File, Compliance, and Document Submission checklists before handover. These tools prevent the most common compliance failures.</p><p><strong>Practical exercise:</strong> Audit one recent file against all three checklists. Document gaps and corrective actions with dates.</p><p>Inspection and open-house checklists protect you when access, safety, or neighbour issues arise.</p>`,
        objectives: ["Apply file and compliance checklists", "Use inspection and open-house tools", "Submit complete document packs"],
        estimatedMinutes: 25,
        resourceTitles: ["File Checklist", "Compliance Checklist", "Document Submission Checklist", "Property Inspection Checklist", "Open House Checklist"],
      },
      {
        title: "Performance trackers and quick reference guides",
        stage: "Professional Kit",
        summary: "KPI trackers, journey flowcharts, and process guides.",
        richText: `<p>Flowcharts for buyer, seller, landlord, rental, and sales journeys give you and clients a shared mental model. Pin them in your workspace and refer to them during complex transactions.</p><p>The complete manual PDF is available separately in the Academy Resource Library for deep reading — these lesson tools are what you use in the field every day.</p>`,
        objectives: ["Use KPI and performance trackers", "Apply journey flowcharts in client meetings", "Keep quick references accessible"],
        estimatedMinutes: 25,
        resourceTitles: ["Monthly KPI Tracker", "Sales Performance Tracker", "Buyer Journey Flowchart", "Seller Journey Flowchart", "Landlord Journey Flowchart", "Property Selling Process Flowchart", "Property Rental Process Flowchart"],
      },
    ],
  },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
}

function buildManifestMap(items: ManifestItem[]) {
  return new Map(items.map((item) => [item.title, item]));
}

function downloadsForTitles(map: Map<string, ManifestItem>, titles: string[] = []) {
  return titles.flatMap((title) => {
    const item = map.get(title);
    if (!item) return [];
    return [{ title: item.title, url: toAcademyFileDownloadUrl(item.fileUrl), type: "PDF" as const }];
  });
}

async function archiveLegacyCourse(prisma: ReturnType<typeof getMainPrisma>) {
  await prisma.trainingModule.deleteMany({ where: { courseId: LEGACY_COURSE_ID } }).catch(() => undefined);
  await prisma.trainingCourse
    .update({
      where: { id: LEGACY_COURSE_ID },
      data: {
        status: "ARCHIVED",
        registrationOpen: false,
        featured: false,
        title: "HomeLink Zimbabwe Real Estate Agent Training (Legacy)",
        updatedAt: new Date(),
      },
    })
    .catch(() => undefined);
}

async function migrateLegacyEnrollments(prisma: ReturnType<typeof getMainPrisma>) {
  const foundationsId = ACADEMY_PROGRAMME_COURSES[0].id;
  const legacyApplications = await prisma.academyLearnerApplication.findMany({
    where: { courseId: LEGACY_COURSE_ID, status: "APPROVED" },
  });

  for (const legacy of legacyApplications) {
    const existing = await prisma.academyLearnerApplication.findUnique({
      where: { learnerId_courseId: { learnerId: legacy.learnerId, courseId: foundationsId } },
    });
    if (!existing) {
      await prisma.academyLearnerApplication.create({
        data: {
          learnerId: legacy.learnerId,
          courseId: foundationsId,
          paymentId: legacy.paymentId,
          learnerType: legacy.learnerType,
          status: "APPROVED",
          fullName: legacy.fullName,
          email: legacy.email,
          phone: legacy.phone,
          organisation: legacy.organisation,
          motivation: legacy.motivation,
          amount: legacy.amount,
          currency: legacy.currency,
          accessStartsAt: legacy.accessStartsAt ?? new Date(),
          accessEndsAt: legacy.accessEndsAt,
        },
      });
    }
    await prisma.courseEnrolment.upsert({
      where: { courseId_agentId: { courseId: foundationsId, agentId: legacy.learnerId } },
      create: {
        courseId: foundationsId,
        agentId: legacy.learnerId,
        status: "ACTIVE",
        dueAt: legacy.accessEndsAt,
      },
      update: { status: "ACTIVE", dueAt: legacy.accessEndsAt },
    });
  }

  await prisma.academyLearnerApplication.updateMany({
    where: { courseId: LEGACY_COURSE_ID },
    data: {
      status: "EXPIRED",
      adminNote: "Superseded by the HomeLink Agent Foundations programme. Your access continues on the new staged certification path.",
    },
  });
  await prisma.courseEnrolment.updateMany({
    where: { courseId: LEGACY_COURSE_ID },
    data: { status: "ARCHIVED" },
  });
}

export async function seedStagedCourseStructure(options?: { forceRebuild?: boolean }) {
  const prisma = getMainPrisma();
  await archiveLegacyCourse(prisma);
  await migrateLegacyEnrollments(prisma);

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as ManifestItem[];
  const manifestMap = buildManifestMap(manifest);

  const category = await prisma.trainingCategory.upsert({
    where: { slug: "new-agent-programme" },
    create: { name: "New Agent Programme", slug: "new-agent-programme", description: "Three-course HomeLink agent certification — Beginner, Intermediate, Advanced.", sortOrder: 0 },
    update: { name: "New Agent Programme", description: "Three-course HomeLink agent certification.", active: true },
  });

  const totalExisting = await prisma.trainingLesson.count({
    where: { section: { module: { courseId: { in: [...ACADEMY_PROGRAMME_COURSES.map((c) => c.id), LEGACY_COURSE_ID] } } } },
  });
  if (totalExisting > 10 && !options?.forceRebuild) {
    return {
      rebuilt: false,
      courses: ACADEMY_PROGRAMME_COURSES.map((course) => ({ id: course.id, title: course.title })),
      lessonCount: totalExisting,
    };
  }

  let globalLessonIndex = 0;
  const courseResults: Array<{ id: string; title: string; lessonCount: number; moduleCount: number }> = [];

  for (const programmeCourse of ACADEMY_PROGRAMME_COURSES) {
    const courseModules = modules.filter((module) => programmeCourse.moduleStages.includes(module.stage));
    const lessonCount = courseModules.reduce((n, m) => n + m.lessons.length, 0);

    await prisma.trainingCourse.upsert({
      where: { id: programmeCourse.id },
      create: {
        id: programmeCourse.id,
        title: programmeCourse.title,
        subtitle: programmeCourse.subtitle,
        slug: programmeCourse.slug,
        shortDescription: programmeCourse.shortDescription,
        description: programmeCourse.description,
        categoryId: category.id,
        instructor: "HomeLink Zimbabwe Academy",
        coInstructors: ["HomeLink Training Team"],
        learningOutcomes: programmeCourse.learningOutcomes,
        targetAudience: programmeCourse.sortOrder === 0
          ? "New HomeLink agents and public learners starting certification"
          : `Agents who completed ${ACADEMY_PROGRAMME_COURSES[programmeCourse.sortOrder - 1]?.title ?? "the previous programme"}`,
        tags: [programmeCourse.theme.label.toLowerCase(), "homelink", "certification", "agent"],
        difficulty: programmeCourse.difficulty,
        durationMinutes: lessonCount * 30,
        estimatedHours: Math.max(1, Math.ceil((lessonCount * 30) / 60)),
        language: "English",
        passingPercentage: 80,
        certificateEnabled: true,
        price: programmeCourse.publicPrice,
        publicPrice: programmeCourse.publicPrice,
        agentPrice: programmeCourse.agentPrice,
        currency: "USD",
        registrationOpen: true,
        accessDurationDays: 365,
        status: "PUBLISHED",
        featured: programmeCourse.featured,
        visibility: "PUBLIC",
        roleNames: ["AGENT", "ADMIN", "PUBLIC_LEARNER"],
        thumbnailUrl: "/brand/homelink-full-lockup.png",
        bannerUrl: "/brand/homelink-full-lockup.png",
        enrollmentType: "OPEN",
      },
      update: {
        title: programmeCourse.title,
        subtitle: programmeCourse.subtitle,
        slug: programmeCourse.slug,
        shortDescription: programmeCourse.shortDescription,
        description: programmeCourse.description,
        difficulty: programmeCourse.difficulty,
        estimatedHours: Math.max(1, Math.ceil((lessonCount * 30) / 60)),
        durationMinutes: lessonCount * 30,
        learningOutcomes: programmeCourse.learningOutcomes,
        publicPrice: programmeCourse.publicPrice,
        agentPrice: programmeCourse.agentPrice,
        status: "PUBLISHED",
        featured: programmeCourse.featured,
        registrationOpen: true,
        certificateEnabled: true,
        updatedAt: new Date(),
      },
    });

    await prisma.trainingModule.deleteMany({ where: { courseId: programmeCourse.id } });

    for (const [moduleIndex, module] of courseModules.entries()) {
      await prisma.trainingModule.create({
        data: {
          courseId: programmeCourse.id,
          title: module.title,
          description: module.description,
          objectives: module.objectives,
          estimatedMinutes: module.lessons.reduce((n, l) => n + l.estimatedMinutes, 0),
          sortOrder: moduleIndex,
          sections: {
            create: [{
              title: module.title,
              description: `${module.stage} · ${module.lessons.length} lessons`,
              sortOrder: 0,
              lessons: {
                create: module.lessons.map((lesson, sortOrder) => {
                  globalLessonIndex += 1;
                  const resourceTitles = lesson.resourceTitles ?? [];
                  const downloads = downloadsForTitles(manifestMap, resourceTitles);
                  const pdfUrl = lessonHandoutUrl(programmeCourse.id, lesson.title);
                  return {
                    id: `${programmeCourse.id}-lesson-${globalLessonIndex}-${slugify(lesson.title).slice(0, 28)}`,
                    title: lesson.title,
                    summary: lesson.summary,
                    richText: lesson.richText,
                    objectives: lesson.objectives,
                    discussionPrompt: lesson.discussionPrompt ?? null,
                    pdfUrl,
                    estimatedMinutes: lesson.estimatedMinutes,
                    completionRequirement: lesson.completionRequirement ?? "VIEW",
                    sortOrder,
                    lessonDownloads: downloads.length ? { create: downloads } : undefined,
                    lessonResources: resourceTitles.length
                      ? {
                          create: resourceTitles.map((title, index) => {
                            const item = manifestMap.get(title);
                            return {
                              title: item?.title ?? title,
                              body: item?.description ?? "HomeLink branded print-ready resource.",
                              type: "PDF",
                              sortOrder: index,
                            };
                          }),
                        }
                      : undefined,
                  };
                }),
              },
            }],
          },
        },
      });
    }

    courseResults.push({
      id: programmeCourse.id,
      title: programmeCourse.title,
      lessonCount,
      moduleCount: courseModules.length,
    });
  }

  return { rebuilt: true, courses: courseResults, lessonCount: globalLessonIndex };
}

/** Full manual — course library only, not per-lesson default */
export { ACADEMY_FULL_MANUAL_URL };
