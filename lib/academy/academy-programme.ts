/** HouseLink Agent Academy — three progressive programmes. */
export const LEGACY_COURSE_ID = "academy-course-official-real-estate-agent-training";
export const LEARNING_PATH_ID = "academy-path-new-agent-programme";

export type AcademyCourseStage = "Beginner" | "Intermediate" | "Advanced" | "Professional Kit";

export type AcademyProgrammeCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  moduleStages: AcademyCourseStage[];
  sortOrder: number;
  publicPrice: number;
  agentPrice: number;
  featured: boolean;
  badgeId: string;
  badgeName: string;
  badgeDescription: string;
  badgeXp: number;
  certificateTitle: string;
  certificatePrefix: string;
  quizIds: string[];
  assignmentIds: string[];
  requiresFinalExam: boolean;
  prerequisiteCourseId: string | null;
  theme: {
    label: string;
    accent: string;
    gradient: string;
    sidebar: string;
    chip: string;
  };
  learningOutcomes: string[];
  includes: string[];
  assessmentSummary: string;
};

export const ACADEMY_PROGRAMME_COURSES: AcademyProgrammeCourse[] = [
  {
    id: "academy-course-beginner",
    slug: "houselink-agent-foundations",
    title: "HouseLink Agent Foundations",
    subtitle: "Professional standards, ethics & industry essentials",
    shortDescription: "Your entry into HouseLink — orientation, conduct, real estate fundamentals, and your starter field toolkit.",
    description: "A comprehensive foundation programme covering HouseLink standards, professional ethics, Zimbabwe real estate essentials, and daily agent routines. Includes branded planners and your Foundations knowledge certification.",
    difficulty: "BEGINNER",
    moduleStages: ["Beginner"],
    sortOrder: 0,
    publicPrice: 25,
    agentPrice: 0,
    featured: true,
    badgeId: "academy-badge-beginner-graduate",
    badgeName: "HouseLink Foundations Graduate",
    badgeDescription: "Completed the Agent Foundations programme and passed the knowledge check.",
    badgeXp: 250,
    certificateTitle: "HouseLink Certified Agent — Foundations",
    certificatePrefix: "HLF",
    quizIds: [
      "academy-quiz-beginner-orientation",
      "academy-quiz-foundations",
    ],
    assignmentIds: [
      "academy-assignment-goal-planner",
      "academy-assignment-foundations-standards",
    ],
    requiresFinalExam: false,
    prerequisiteCourseId: null,
    theme: {
      label: "Foundations",
      accent: "#008b68",
      gradient: "from-emerald-500 via-emerald-600 to-teal-700",
      sidebar: "from-emerald-50 via-white to-teal-50/80",
      chip: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    },
    learningOutcomes: [
      "Understand HouseLink Zimbabwe's marketplace standards and your professional obligations",
      "Apply ethical conduct, confidentiality, and client service in daily field work",
      "Master essential real estate terminology for sales, lettings, and mandates",
      "Use branded planners and client forms from day one",
      "Pass the Foundations knowledge check and earn your first HouseLink certificate",
    ],
    includes: [
      "8 guided lessons across 2 modules",
      "8 print-ready toolkit PDFs (planners, client forms, workflow guides)",
      "2 module checkpoint quizzes (Orientation + Foundations)",
      "2 practical assignments (Goal Planner + Professional Standards)",
      "HouseLink Foundations Graduate badge + downloadable certificate",
    ],
    assessmentSummary: "Complete all lessons, pass both module quizzes (80% pass mark), and submit both practical assignments to earn your Foundations certificate.",
  },
  {
    id: "academy-course-intermediate",
    slug: "houselink-listing-client-mastery",
    title: "HouseLink Listing & Client Mastery",
    subtitle: "Prospecting, listings, marketing & client service",
    shortDescription: "Win listings, market properties professionally, and master the full client journey with HouseLink-branded field tools.",
    description: "An in-depth programme on prospecting, appraisals, listing capture, property marketing, viewings, and client qualification. Practical assignments and the complete intermediate field toolkit included.",
    difficulty: "INTERMEDIATE",
    moduleStages: ["Intermediate"],
    sortOrder: 1,
    publicPrice: 25,
    agentPrice: 0,
    featured: true,
    badgeId: "academy-badge-intermediate-graduate",
    badgeName: "HouseLink Listing & Client Specialist",
    badgeDescription: "Completed Listing & Client Mastery and passed practical assessments.",
    badgeXp: 500,
    certificateTitle: "HouseLink Certified Agent — Listing & Client Mastery",
    certificatePrefix: "HLM",
    quizIds: [
      "academy-quiz-intermediate-listings",
      "academy-quiz-intermediate-clients",
    ],
    assignmentIds: [
      "academy-assignment-prospecting-log",
      "academy-assignment-listing-file",
      "academy-assignment-viewing-record",
    ],
    requiresFinalExam: false,
    prerequisiteCourseId: "academy-course-beginner",
    theme: {
      label: "Mastery",
      accent: "#0e7490",
      gradient: "from-cyan-600 via-sky-600 to-blue-700",
      sidebar: "from-sky-50 via-white to-cyan-50/80",
      chip: "bg-sky-100 text-sky-900 border border-sky-200",
    },
    learningOutcomes: [
      "Run a structured daily prospecting routine that generates qualified leads",
      "Win listings with evidence-based appraisals and professional presentations",
      "Capture complete, compliant listing data before publishing on HouseLink",
      "Market properties across photography, descriptions, WhatsApp, and social channels",
      "Qualify buyers and tenants, run safe viewings, and manage offers professionally",
      "Submit practical listing and viewing assignments for trainer review",
    ],
    includes: [
      "10 in-depth lessons across 2 modules",
      "24 branded field tools — forms, scripts, checklists, and marketing templates",
      "2 module checkpoint quizzes (Listings & Marketing + Client Service)",
      "3 practical assignments (Prospecting Log, Listing File, Viewing Record)",
      "Listing & Client Specialist badge + downloadable certificate",
    ],
    assessmentSummary: "Complete all lessons, pass both module quizzes, and submit all three practical assignments to earn your Listing & Client Mastery certificate.",
  },
  {
    id: "academy-course-advanced-professional",
    slug: "houselink-professional-certification",
    title: "HouseLink Professional Certification",
    subtitle: "Compliance, performance & complete field toolkit",
    shortDescription: "Advanced compliance, top-performer systems, final examination, and the full HouseLink professional resource kit.",
    description: "The capstone programme covering documentation, legal awareness, performance tracking, and every branded form, checklist, and flowchart in the HouseLink toolkit. Earn full professional agent certification.",
    difficulty: "ADVANCED",
    moduleStages: ["Advanced", "Professional Kit"],
    sortOrder: 2,
    publicPrice: 25,
    agentPrice: 0,
    featured: true,
    badgeId: "academy-badge-advanced-professional",
    badgeName: "HouseLink Certified Professional Agent",
    badgeDescription: "Completed Professional Certification including compliance assessments and the final examination.",
    badgeXp: 1000,
    certificateTitle: "HouseLink Certified Professional Agent",
    certificatePrefix: "HLP",
    quizIds: [
      "academy-quiz-compliance",
      "academy-quiz-advanced-performance",
      "academy-quiz-professional-toolkit",
    ],
    assignmentIds: [
      "academy-assignment-compliance-file",
      "academy-assignment-property-inspection",
      "academy-assignment-performance-review",
    ],
    requiresFinalExam: true,
    prerequisiteCourseId: "academy-course-intermediate",
    theme: {
      label: "Professional",
      accent: "#b45309",
      gradient: "from-amber-500 via-orange-600 to-rose-700",
      sidebar: "from-amber-50 via-white to-orange-50/80",
      chip: "bg-amber-100 text-amber-900 border border-amber-200",
    },
    learningOutcomes: [
      "Maintain audit-ready client files using HouseLink compliance checklists",
      "Complete documentation accurately for every transaction stage",
      "Apply confidentiality standards and recognise legal referral boundaries",
      "Build sustainable performance routines with KPI and pipeline tracking",
      "Access and apply the complete HouseLink professional resource kit in the field",
      "Pass compliance assessments and the Certified Professional Agent final examination",
    ],
    includes: [
      "15 advanced lessons across 3 modules",
      "Complete professional resource kit — all branded forms, flowcharts, and trackers",
      "3 module checkpoint quizzes (Compliance, Performance, Toolkit Mastery)",
      "3 practical assignments (Compliance File, Inspection, Performance Review)",
      "Certified HouseLink Agent final examination",
      "HouseLink Certified Professional Agent badge + full certification",
    ],
    assessmentSummary: "Complete all lessons, pass all three module quizzes, submit all three assignments, then pass the final examination to earn full professional certification.",
  },
];

export function getProgrammeCourse(courseId: string) {
  return ACADEMY_PROGRAMME_COURSES.find((course) => course.id === courseId) ?? null;
}

export function getProgrammeCourseBySort(sortOrder: number) {
  return ACADEMY_PROGRAMME_COURSES.find((course) => course.sortOrder === sortOrder) ?? null;
}

export const PROGRAMME_COURSE_IDS = ACADEMY_PROGRAMME_COURSES.map((course) => course.id);
