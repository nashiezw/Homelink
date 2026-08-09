import { Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";

export type RetakeExhaustedAction = "LOCK_CERTIFICATE" | "REQUIRE_MODULE_RESTART" | "REQUIRE_COURSE_RESTART";

export type CourseRetakeRules = {
  quizAttemptLimit: number;
  examAttemptLimit: number;
  assignmentSubmissionLimit: number;
  retakeCooldownHours: number;
  exhaustedAction: RetakeExhaustedAction;
  allowAdminExtraAttempts: boolean;
};

export const DEFAULT_COURSE_RETAKE_RULES: CourseRetakeRules = {
  quizAttemptLimit: 3,
  examAttemptLimit: 2,
  assignmentSubmissionLimit: 3,
  retakeCooldownHours: 0,
  exhaustedAction: "LOCK_CERTIFICATE",
  allowAdminExtraAttempts: true,
};

export async function getCourseRetakeRules(courseId: string): Promise<CourseRetakeRules> {
  const row = await getMainPrisma().trainingSetting.findUnique({ where: { id: "singleton" } });
  const payload = (row?.payload ?? {}) as Record<string, unknown>;
  const rulesByCourse = (payload.courseCertificationRules ?? {}) as Record<string, unknown>;
  return normaliseRetakeRules(rulesByCourse[courseId]);
}

export async function saveCourseRetakeRules(courseId: string, rules: Partial<CourseRetakeRules>) {
  const prisma = getMainPrisma();
  const row = await prisma.trainingSetting.findUnique({ where: { id: "singleton" } });
  const payload = (row?.payload ?? {}) as Record<string, unknown>;
  const rulesByCourse = { ...((payload.courseCertificationRules ?? {}) as Record<string, unknown>) };
  const nextRules = { ...normaliseRetakeRules(rulesByCourse[courseId]), ...normaliseRetakeRules(rules) };
  rulesByCourse[courseId] = nextRules;

  await prisma.trainingSetting.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      payload: { ...payload, courseCertificationRules: rulesByCourse } as Prisma.InputJsonObject,
    },
    update: {
      payload: { ...payload, courseCertificationRules: rulesByCourse } as Prisma.InputJsonObject,
    },
  });

  return nextRules;
}

export function normaliseRetakeRules(value: unknown): CourseRetakeRules {
  const input = (value ?? {}) as Record<string, unknown>;
  return {
    quizAttemptLimit: positiveInt(input.quizAttemptLimit, DEFAULT_COURSE_RETAKE_RULES.quizAttemptLimit),
    examAttemptLimit: positiveInt(input.examAttemptLimit, DEFAULT_COURSE_RETAKE_RULES.examAttemptLimit),
    assignmentSubmissionLimit: positiveInt(input.assignmentSubmissionLimit, DEFAULT_COURSE_RETAKE_RULES.assignmentSubmissionLimit),
    retakeCooldownHours: nonNegativeInt(input.retakeCooldownHours, DEFAULT_COURSE_RETAKE_RULES.retakeCooldownHours),
    exhaustedAction: exhaustedAction(input.exhaustedAction),
    allowAdminExtraAttempts: input.allowAdminExtraAttempts !== false,
  };
}

export function attemptsRemaining(limit: number, used: number) {
  return Math.max(0, limit - used);
}

function positiveInt(value: unknown, fallback: number) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeInt(value: unknown, fallback: number) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function exhaustedAction(value: unknown): RetakeExhaustedAction {
  if (value === "REQUIRE_MODULE_RESTART" || value === "REQUIRE_COURSE_RESTART") return value;
  return "LOCK_CERTIFICATE";
}
