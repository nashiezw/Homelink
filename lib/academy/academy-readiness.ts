import type { AcademyProgrammeCourse } from "@/lib/academy/academy-programme";

export type ReadinessEvidence = {
  courseProgress: number;
  quizScores: Record<string, number | null>;
  assignmentStatuses: Record<string, string | null>;
  finalExamPassed?: boolean;
};

export type ReadinessCategory = {
  id: string;
  label: string;
  description: string;
  quizIds: string[];
  assignmentIds: string[];
  score: number;
  status: "READY" | "DEVELOPING" | "NEEDS_PRACTICE";
};

const CATEGORY_DEFINITIONS = [
  {
    id: "prospecting",
    label: "Prospecting",
    description: "Can create lead flow, log activity, and follow up consistently.",
    quizIds: ["academy-quiz-beginner-orientation", "academy-quiz-advanced-performance"],
    assignmentIds: ["academy-assignment-goal-planner", "academy-assignment-prospecting-log", "academy-assignment-pipeline-coaching-review"],
  },
  {
    id: "listings",
    label: "Listings & Pricing",
    description: "Can verify listings, prepare a CMA, handle seller objections, and launch marketing.",
    quizIds: ["academy-quiz-foundations", "academy-quiz-intermediate-listings"],
    assignmentIds: ["academy-assignment-verification-risk-drill", "academy-assignment-listing-file", "academy-assignment-cma-pricing-pack", "academy-assignment-listing-roleplay"],
  },
  {
    id: "client-service",
    label: "Client Service",
    description: "Can qualify clients, run viewings, capture feedback, and manage follow-up.",
    quizIds: ["academy-quiz-intermediate-clients"],
    assignmentIds: ["academy-assignment-client-qualification-simulation", "academy-assignment-viewing-record"],
  },
  {
    id: "negotiation",
    label: "Negotiation",
    description: "Can present offers neutrally and document counter-offers accurately.",
    quizIds: ["academy-quiz-intermediate-clients"],
    assignmentIds: ["academy-assignment-offer-negotiation-roleplay"],
  },
  {
    id: "compliance",
    label: "Compliance",
    description: "Can maintain audit-ready files, spot document risks, and escalate correctly.",
    quizIds: ["academy-quiz-compliance"],
    assignmentIds: ["academy-assignment-compliance-file", "academy-assignment-property-inspection", "academy-assignment-document-risk-review"],
  },
  {
    id: "performance",
    label: "Performance Discipline",
    description: "Can review KPIs, diagnose pipeline gaps, and maintain a field evidence portfolio.",
    quizIds: ["academy-quiz-advanced-performance", "academy-quiz-professional-toolkit"],
    assignmentIds: ["academy-assignment-performance-review", "academy-assignment-field-portfolio"],
  },
] as const;

const PASSING_ASSIGNMENT_STATUSES = new Set(["SUBMITTED", "APPROVED", "GRADED"]);

function statusFor(score: number): ReadinessCategory["status"] {
  if (score >= 85) return "READY";
  if (score >= 60) return "DEVELOPING";
  return "NEEDS_PRACTICE";
}

function categoryScore(definition: (typeof CATEGORY_DEFINITIONS)[number], evidence: ReadinessEvidence) {
  const quizScores = definition.quizIds
    .map((id) => evidence.quizScores[id])
    .filter((score): score is number => typeof score === "number");
  const quizScore = quizScores.length ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length : 0;
  const assignmentScore = definition.assignmentIds.length
    ? (definition.assignmentIds.filter((id) => PASSING_ASSIGNMENT_STATUSES.has(String(evidence.assignmentStatuses[id] ?? ""))).length / definition.assignmentIds.length) * 100
    : 0;
  return Math.round((quizScore * 0.45) + (assignmentScore * 0.45) + (Math.min(100, Math.max(0, evidence.courseProgress)) * 0.1));
}

export function buildReadinessScore(programme: AcademyProgrammeCourse | null, evidence: ReadinessEvidence) {
  const relevantQuizIds = new Set(programme?.quizIds ?? []);
  const relevantAssignmentIds = new Set(programme?.assignmentIds ?? []);
  const categories: ReadinessCategory[] = CATEGORY_DEFINITIONS
    .filter((definition) =>
      definition.quizIds.some((id) => relevantQuizIds.has(id)) ||
      definition.assignmentIds.some((id) => relevantAssignmentIds.has(id)),
    )
    .map((definition) => {
      const score = categoryScore(definition, evidence);
      return {
        id: definition.id,
        label: definition.label,
        description: definition.description,
        quizIds: [...definition.quizIds],
        assignmentIds: [...definition.assignmentIds],
        score,
        status: statusFor(score),
      };
    });

  const overall = categories.length
    ? Math.round(categories.reduce((sum, category) => sum + category.score, 0) / categories.length)
    : Math.round(evidence.courseProgress);

  return {
    overall,
    status: statusFor(overall),
    categories,
    mentorSignoffRequired: programme?.requiresFinalExam === true,
    mentorSignoffLabel: programme?.requiresFinalExam
      ? "Mentor/admin portfolio sign-off required before a learner should be treated as client-ready."
      : "Trainer review recommended before live client responsibility.",
  };
}
