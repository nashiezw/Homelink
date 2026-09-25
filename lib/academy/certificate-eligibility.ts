import { getMainPrisma } from "@/lib/db/main-prisma";
import { getProgrammeCourse } from "@/lib/academy/academy-programme";

export type CertificationStatus =
  | "DISABLED"
  | "LESSONS_IN_PROGRESS"
  | "ACTION_REQUIRED"
  | "AWAITING_REVIEW"
  | "READY_TO_ISSUE"
  | "ISSUANCE_BLOCKED"
  | "ISSUED";

export type CertificationRequirementKind = "lesson" | "quiz" | "assignment" | "exam" | "overall" | "certificate";
export type CertificationRequirementState = "COMPLETE" | "NOT_STARTED" | "AWAITING_REVIEW" | "ACTION_REQUIRED" | "PROCESSING" | "BLOCKED";

export type CertificationRequirement = {
  id: string;
  kind: CertificationRequirementKind;
  title: string;
  detail: string;
  complete: boolean;
  state: CertificationRequirementState;
  learnerAction: boolean;
};

export type CertificateEligibility = {
  courseId: string;
  enabled: boolean;
  status: CertificationStatus;
  statusLabel: string;
  summary: string;
  eligibleForIssuance: boolean;
  certificateIssued: boolean;
  lessonProgress: { completed: number; total: number; percent: number };
  assessmentProgress: { completed: number; total: number; percent: number };
  overallScore: number | null;
  passMark: number;
  requirements: CertificationRequirement[];
  blockers: CertificationRequirement[];
  nextAction: CertificationRequirement | null;
  counts: {
    quizzesPassed: number;
    quizzesTotal: number;
    assignmentsAccepted: number;
    assignmentsTotal: number;
    assignmentsAwaitingReview: number;
    assignmentsActionRequired: number;
    examsPassed: number;
    examsTotal: number;
  };
};

type EligibilityTarget = { learnerId: string; courseId: string };

export function certificateEligibilityKey(learnerId: string, courseId: string) {
  return `${learnerId}:${courseId}`;
}

export async function getCertificateEligibility(learnerId: string, courseId: string) {
  const results = await getCertificateEligibilityBatch([{ learnerId, courseId }]);
  return results.get(certificateEligibilityKey(learnerId, courseId)) ?? null;
}

export async function getCertificateEligibilityBatch(targets: EligibilityTarget[]) {
  const result = new Map<string, CertificateEligibility>();
  if (!targets.length) return result;

  const prisma = getMainPrisma();
  const learnerIds = [...new Set(targets.map((target) => target.learnerId))];
  const courseIds = [...new Set(targets.map((target) => target.courseId))];
  const [courses, lessonProgress, quizAttempts, assignmentSubmissions, examAttempts, certificates, activeTemplateCount] = await Promise.all([
    prisma.trainingCourse.findMany({
      where: { id: { in: courseIds } },
      select: {
        id: true,
        title: true,
        certificateEnabled: true,
        passingPercentage: true,
        modules: {
          select: {
            sections: {
              select: { lessons: { select: { id: true, title: true } } },
            },
          },
        },
        quizzes: { where: { active: true }, select: { id: true, title: true, passingPercentage: true } },
        assignments: { where: { active: true }, select: { id: true, title: true, points: true } },
        finalExams: { where: { active: true }, select: { id: true, title: true, passingScore: true } },
      },
    }),
    prisma.lessonProgress.findMany({
      where: {
        agentId: { in: learnerIds },
        status: "COMPLETED",
        lesson: { section: { module: { courseId: { in: courseIds } } } },
      },
      select: { agentId: true, lessonId: true, lesson: { select: { section: { select: { module: { select: { courseId: true } } } } } } },
    }),
    prisma.quizAttempt.findMany({
      where: { agentId: { in: learnerIds }, quiz: { courseId: { in: courseIds } }, status: { in: ["PASSED", "FAILED"] } },
      select: { agentId: true, quizId: true, score: true, status: true, submittedAt: true },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.assignmentSubmission.findMany({
      where: { agentId: { in: learnerIds }, assignment: { courseId: { in: courseIds } } },
      select: { agentId: true, assignmentId: true, status: true, grade: true, submittedAt: true, reviewedAt: true },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.examAttempt.findMany({
      where: { agentId: { in: learnerIds }, exam: { courseId: { in: courseIds } }, status: { in: ["PASSED", "FAILED"] } },
      select: { agentId: true, examId: true, score: true, status: true, submittedAt: true },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.certificateIssue.findMany({
      where: { agentId: { in: learnerIds }, courseId: { in: courseIds }, status: "ACTIVE" },
      select: { agentId: true, courseId: true },
    }),
    prisma.certificateTemplate.count({ where: { active: true } }),
  ]);

  const courseById = new Map(courses.map((course) => [course.id, course]));
  const completedLessonKeys = new Set(lessonProgress.map((row) => certificateEligibilityKey(row.agentId, row.lesson.section.module.courseId) + `:${row.lessonId}`));
  const certificateKeys = new Set(certificates.filter((row) => row.courseId).map((row) => certificateEligibilityKey(row.agentId, row.courseId!)));

  for (const target of targets) {
    const key = certificateEligibilityKey(target.learnerId, target.courseId);
    const course = courseById.get(target.courseId);
    if (!course) continue;
    const lessons = course.modules.flatMap((module) => module.sections.flatMap((section) => section.lessons));
    const completedLessons = lessons.filter((lesson) => completedLessonKeys.has(`${key}:${lesson.id}`)).length;
    const targetQuizAttempts = quizAttempts.filter((attempt) => attempt.agentId === target.learnerId);
    const targetAssignmentSubmissions = assignmentSubmissions.filter((submission) => submission.agentId === target.learnerId);
    const targetExamAttempts = examAttempts.filter((attempt) => attempt.agentId === target.learnerId);
    const programme = getProgrammeCourse(target.courseId);
    const requiredExams = programme?.requiresFinalExam === false ? [] : course.finalExams;

    result.set(key, evaluateCertificateEligibility({
      courseId: course.id,
      certificateEnabled: course.certificateEnabled,
      passMark: course.passingPercentage,
      completedLessons,
      totalLessons: lessons.length,
      quizzes: course.quizzes.map((quiz) => {
        const attempts = targetQuizAttempts.filter((attempt) => attempt.quizId === quiz.id);
        const bestScore = attempts.length ? Math.max(...attempts.map((attempt) => Number(attempt.score))) : null;
        return { id: quiz.id, title: quiz.title, passMark: quiz.passingPercentage, bestScore };
      }),
      assignments: course.assignments.map((assignment) => {
        const latest = targetAssignmentSubmissions.find((submission) => submission.assignmentId === assignment.id);
        const gradePercent = latest?.grade == null
          ? null
          : assignment.points > 0
            ? Math.round((Number(latest.grade) / assignment.points) * 100)
            : 0;
        return { id: assignment.id, title: assignment.title, status: latest?.status ?? null, gradePercent };
      }),
      exams: requiredExams.map((exam) => {
        const attempts = targetExamAttempts.filter((attempt) => attempt.examId === exam.id);
        const bestScore = attempts.length ? Math.max(...attempts.map((attempt) => Number(attempt.score))) : null;
        return { id: exam.id, title: exam.title, passMark: exam.passingScore, bestScore };
      }),
      certificateIssued: certificateKeys.has(key),
      templateAvailable: activeTemplateCount > 0,
    }));
  }

  return result;
}

export function evaluateCertificateEligibility(input: {
  courseId: string;
  certificateEnabled: boolean;
  passMark: number;
  completedLessons: number;
  totalLessons: number;
  quizzes: Array<{ id: string; title: string; passMark: number; bestScore: number | null }>;
  assignments: Array<{ id: string; title: string; status: string | null; gradePercent: number | null }>;
  exams: Array<{ id: string; title: string; passMark: number; bestScore: number | null }>;
  certificateIssued: boolean;
  templateAvailable: boolean;
}): CertificateEligibility {
  const lessonComplete = input.totalLessons === 0 || input.completedLessons >= input.totalLessons;
  const lessonPercent = input.totalLessons ? Math.round((input.completedLessons / input.totalLessons) * 100) : 100;
  const requirements: CertificationRequirement[] = [{
    id: "lessons",
    kind: "lesson",
    title: `Complete all lessons (${input.completedLessons}/${input.totalLessons})`,
    detail: lessonComplete ? "All course content is complete." : `${input.totalLessons - input.completedLessons} lesson${input.totalLessons - input.completedLessons === 1 ? "" : "s"} remaining.`,
    complete: lessonComplete,
    state: lessonComplete ? "COMPLETE" : "ACTION_REQUIRED",
    learnerAction: !lessonComplete,
  }];
  const scores: number[] = [];

  for (const quiz of input.quizzes) {
    const complete = quiz.bestScore !== null && quiz.bestScore >= quiz.passMark;
    if (complete) scores.push(quiz.bestScore!);
    requirements.push({
      id: quiz.id,
      kind: "quiz",
      title: quiz.title,
      detail: complete ? `Passed with ${quiz.bestScore}%.` : quiz.bestScore === null ? `Not attempted. Pass mark: ${quiz.passMark}%.` : `Best score: ${quiz.bestScore}%. Pass mark: ${quiz.passMark}%.`,
      complete,
      state: complete ? "COMPLETE" : quiz.bestScore === null ? "NOT_STARTED" : "ACTION_REQUIRED",
      learnerAction: !complete,
    });
  }

  for (const assignment of input.assignments) {
    const approved = assignment.status === "APPROVED";
    const gradedPass = assignment.status === "GRADED" && (assignment.gradePercent ?? 0) >= input.passMark;
    const complete = approved || gradedPass;
    const awaitingReview = assignment.status === "SUBMITTED";
    const needsChanges = assignment.status === "REJECTED" || assignment.status === "RESUBMISSION_REQUESTED" || (assignment.status === "GRADED" && !gradedPass);
    if (complete) scores.push(approved ? Math.max(input.passMark, assignment.gradePercent ?? input.passMark) : assignment.gradePercent!);
    requirements.push({
      id: assignment.id,
      kind: "assignment",
      title: assignment.title,
      detail: complete
        ? assignment.gradePercent == null ? "Accepted by an Academy reviewer." : `Accepted with ${assignment.gradePercent}%.`
        : awaitingReview ? "Submitted and awaiting Academy review."
          : needsChanges ? `Changes required${assignment.gradePercent == null ? "." : `; latest score ${assignment.gradePercent}%.`}`
            : "Not submitted yet.",
      complete,
      state: complete ? "COMPLETE" : awaitingReview ? "AWAITING_REVIEW" : needsChanges ? "ACTION_REQUIRED" : "NOT_STARTED",
      learnerAction: !complete && !awaitingReview,
    });
  }

  for (const exam of input.exams) {
    const complete = exam.bestScore !== null && exam.bestScore >= exam.passMark;
    if (complete) scores.push(exam.bestScore!);
    requirements.push({
      id: exam.id,
      kind: "exam",
      title: exam.title,
      detail: complete ? `Passed with ${exam.bestScore}%.` : exam.bestScore === null ? `Not attempted. Pass mark: ${exam.passMark}%.` : `Best score: ${exam.bestScore}%. Pass mark: ${exam.passMark}%.`,
      complete,
      state: complete ? "COMPLETE" : exam.bestScore === null ? "NOT_STARTED" : "ACTION_REQUIRED",
      learnerAction: !complete,
    });
  }

  const assessmentRequirements = requirements.filter((requirement) => requirement.kind === "quiz" || requirement.kind === "assignment" || requirement.kind === "exam");
  const individualAssessmentsComplete = assessmentRequirements.every((requirement) => requirement.complete);
  const overallScore = individualAssessmentsComplete && scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : assessmentRequirements.length === 0 ? 100 : null;
  const overallComplete = individualAssessmentsComplete && (overallScore ?? 0) >= input.passMark;
  if (assessmentRequirements.length) {
    requirements.push({
      id: "overall-score",
      kind: "overall",
      title: `Meet the ${input.passMark}% overall assessment pass mark`,
      detail: overallScore === null ? "Calculated after all required assessments are accepted." : `Current overall score: ${overallScore}%.`,
      complete: overallComplete,
      state: overallComplete ? "COMPLETE" : individualAssessmentsComplete ? "ACTION_REQUIRED" : "NOT_STARTED",
      learnerAction: individualAssessmentsComplete && !overallComplete,
    });
  }

  const learnerRequirementsComplete = lessonComplete && individualAssessmentsComplete && overallComplete;
  const certificateRequirement: CertificationRequirement = {
    id: "certificate",
    kind: "certificate",
    title: "Certificate issued",
    detail: input.certificateIssued ? "Your certificate is ready to view." : learnerRequirementsComplete ? input.templateAvailable ? "All requirements are complete; issuance is being prepared." : "Academy Admin must configure an active certificate template." : "Issued automatically after all requirements are complete.",
    complete: input.certificateIssued,
    state: input.certificateIssued ? "COMPLETE" : learnerRequirementsComplete ? input.templateAvailable ? "PROCESSING" : "BLOCKED" : "NOT_STARTED",
    learnerAction: false,
  };
  requirements.push(certificateRequirement);

  const blockers = requirements.filter((requirement) => !requirement.complete && requirement.kind !== "certificate" && !(requirement.kind === "overall" && !individualAssessmentsComplete));
  const learnerActionBlockers = blockers.filter((requirement) => requirement.learnerAction);
  const awaitingReviewBlockers = blockers.filter((requirement) => requirement.state === "AWAITING_REVIEW");
  const eligibleForIssuance = input.certificateEnabled && learnerRequirementsComplete && input.templateAvailable && !input.certificateIssued;
  let status: CertificationStatus;
  if (!input.certificateEnabled) status = "DISABLED";
  else if (input.certificateIssued) status = "ISSUED";
  else if (!lessonComplete) status = "LESSONS_IN_PROGRESS";
  else if (learnerActionBlockers.length) status = "ACTION_REQUIRED";
  else if (awaitingReviewBlockers.length) status = "AWAITING_REVIEW";
  else if (!input.templateAvailable) status = "ISSUANCE_BLOCKED";
  else status = "READY_TO_ISSUE";

  const assessmentCompleted = assessmentRequirements.filter((requirement) => requirement.complete).length;
  const assignmentRequirements = requirements.filter((requirement) => requirement.kind === "assignment");
  const statusCopy = certificationStatusCopy(status, blockers, input.certificateEnabled);
  return {
    courseId: input.courseId,
    enabled: input.certificateEnabled,
    status,
    statusLabel: statusCopy.label,
    summary: statusCopy.summary,
    eligibleForIssuance,
    certificateIssued: input.certificateIssued,
    lessonProgress: { completed: input.completedLessons, total: input.totalLessons, percent: lessonPercent },
    assessmentProgress: {
      completed: assessmentCompleted,
      total: assessmentRequirements.length,
      percent: assessmentRequirements.length ? Math.round((assessmentCompleted / assessmentRequirements.length) * 100) : 100,
    },
    overallScore,
    passMark: input.passMark,
    requirements,
    blockers,
    nextAction: learnerActionBlockers[0] ?? awaitingReviewBlockers[0] ?? blockers[0] ?? (!input.certificateIssued ? certificateRequirement : null),
    counts: {
      quizzesPassed: requirements.filter((requirement) => requirement.kind === "quiz" && requirement.complete).length,
      quizzesTotal: input.quizzes.length,
      assignmentsAccepted: assignmentRequirements.filter((requirement) => requirement.complete).length,
      assignmentsTotal: input.assignments.length,
      assignmentsAwaitingReview: assignmentRequirements.filter((requirement) => requirement.state === "AWAITING_REVIEW").length,
      assignmentsActionRequired: assignmentRequirements.filter((requirement) => !requirement.complete && requirement.state !== "AWAITING_REVIEW").length,
      examsPassed: requirements.filter((requirement) => requirement.kind === "exam" && requirement.complete).length,
      examsTotal: input.exams.length,
    },
  };
}

function certificationStatusCopy(status: CertificationStatus, blockers: CertificationRequirement[], enabled: boolean) {
  if (!enabled || status === "DISABLED") return { label: "Certificate not offered", summary: "This course does not issue a certificate." };
  if (status === "ISSUED") return { label: "Certificate issued", summary: "All certification requirements are complete and your certificate is ready." };
  if (status === "READY_TO_ISSUE") return { label: "Certificate processing", summary: "All requirements are complete. Your certificate is being prepared." };
  if (status === "ISSUANCE_BLOCKED") return { label: "Admin action required", summary: "All learner requirements are complete, but Academy Admin must resolve certificate setup." };
  if (status === "AWAITING_REVIEW") return { label: "Awaiting assignment review", summary: "Your submitted work is waiting for Academy review. No learner action is needed right now." };
  const actionable = blockers.filter((blocker) => blocker.learnerAction).length;
  if (status === "ACTION_REQUIRED") return { label: "Certificate actions required", summary: `${actionable} certification action${actionable === 1 ? "" : "s"} remaining.` };
  const lessons = blockers.find((blocker) => blocker.kind === "lesson");
  return { label: "Lessons in progress", summary: lessons?.detail ?? "Complete the remaining lessons to continue toward certification." };
}
