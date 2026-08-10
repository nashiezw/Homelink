import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getProgrammeCourse } from "@/lib/academy/academy-programme";
import {
  AGENT_PORTFOLIO_REQUIREMENTS,
  GRADUATE_OUTCOME_SIGNALS,
  ROLEPLAY_ASSESSMENT_SCENARIOS,
} from "@/lib/academy/academy-excellence";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ number: string }> }) {
  const { number } = await context.params;
  const certificateNumber = decodeURIComponent(number);
  if (!certificateNumber) return problem(400, "NUMBER_REQUIRED", "Certificate number is required.");

  try {
    const certificate = await getMainPrisma().certificateIssue.findUnique({
      where: { certificateNumber },
      include: { course: true, template: true },
    });
    if (!certificate) return problem(404, "NOT_FOUND", "Certificate not found.");
    if (certificate.status !== "ACTIVE") return problem(410, "REVOKED", "This certificate is no longer active.");
    const programme = certificate.courseId ? getProgrammeCourse(certificate.courseId) : null;
    const prisma = getMainPrisma();
    const [learner, courseStats, programmeBadge] = await Promise.all([
      prisma.user.findUnique({
      where: { id: certificate.agentId },
      select: { name: true },
      }),
      certificate.courseId
        ? prisma.trainingCourse.findUnique({
            where: { id: certificate.courseId },
            select: {
              title: true,
              learningOutcomes: true,
              modules: { select: { sections: { select: { lessons: { select: { id: true } } } } } },
              quizzes: { where: { active: true }, select: { id: true } },
              assignments: { where: { active: true }, select: { id: true, title: true } },
              finalExams: { where: { active: true }, select: { id: true } },
            },
          })
        : Promise.resolve(null),
      programme ? prisma.badge.findUnique({ where: { id: programme.badgeId } }) : Promise.resolve(null),
    ]);
    const [quizAttempts, examAttempts, assignmentSubmissions] = certificate.courseId
      ? await Promise.all([
          prisma.quizAttempt.findMany({
            where: { agentId: certificate.agentId, quiz: { courseId: certificate.courseId } },
            orderBy: { submittedAt: "desc" },
          }),
          prisma.examAttempt.findMany({
            where: { agentId: certificate.agentId, exam: { courseId: certificate.courseId } },
            orderBy: { submittedAt: "desc" },
          }),
          prisma.assignmentSubmission.findMany({
            where: {
              agentId: certificate.agentId,
              assignment: { courseId: certificate.courseId },
            },
            orderBy: { submittedAt: "desc" },
          }),
        ])
      : [[], [], []];
    const confidenceSignals = quizAttempts
      .map((attempt) => readAttemptConfidence(attempt.answers))
      .filter((value): value is string => Boolean(value));
    const lessonCount = courseStats?.modules.reduce((sum, module) => sum + module.sections.reduce((sectionSum, section) => sectionSum + section.lessons.length, 0), 0) ?? 0;
    const quizCount = courseStats?.quizzes.length ?? 0;
    const assignmentCount = courseStats?.assignments.length ?? 0;
    const requiresPortfolio = courseStats?.assignments.some((assignment) => /portfolio/i.test(assignment.title)) ?? false;
    const roleplayAssessments = courseStats?.assignments.filter((assignment) => /roleplay|simulation/i.test(assignment.title)).length ?? 0;
    const finalExamCount = courseStats?.finalExams.length ?? 0;
    const certificateTitle = certificate.course?.title
      ? `${certificate.course.title} Certificate`
      : "HouseLink Academy Training Certificate";

    return ok({
      valid: true,
      certificateNumber: certificate.certificateNumber,
      learnerName: learner?.name ?? "HouseLink Learner",
      course: certificate.course?.title ?? null,
      certificateTitle: trainingCertificateTitle(certificateTitle),
      badgeName: programmeBadge?.name ?? null,
      skillsAssessed: courseStats?.learningOutcomes ?? [],
      assessmentProof: certificate.courseId
        ? {
            trainingSessions: lessonCount ? `${lessonCount} training sessions` : null,
            quizzes: quizCount,
            assignments: assignmentCount,
            passedQuizAttempts: quizAttempts.filter((attempt) => attempt.status === "PASSED").length,
            reviewedAssignments: new Set(
              assignmentSubmissions
                .filter((submission) => submission.status === "GRADED" || submission.status === "APPROVED")
                .map((submission) => submission.assignmentId),
            ).size,
            finalExamBestScore: examAttempts.length ? Math.max(...examAttempts.map((attempt) => Number(attempt.score))) : null,
            confidenceSignals: confidenceSignals.length
              ? {
                  confident: confidenceSignals.filter((value) => value === "confident").length,
                  mixed: confidenceSignals.filter((value) => value === "mixed").length,
                  guessed: confidenceSignals.filter((value) => value === "guessed").length,
                }
              : null,
            requiresFinalExam: finalExamCount > 0,
            requiresPortfolio,
            roleplayAssessments,
            certificateRequirements: [
              `Completed ${certificate.course?.title ?? "the course"} requirements recorded in HouseLink Academy.`,
              quizCount ? `Passed required quiz${quizCount === 1 ? "" : "zes"}.` : null,
              assignmentCount ? `Submitted required assignment${assignmentCount === 1 ? "" : "s"} for review.` : null,
              finalExamCount ? "Passed the final examination." : null,
            ].filter(Boolean),
          }
        : null,
      gradingStandard: [
        "Market reasoning and property fact accuracy.",
        "Professional communication and documented follow-up.",
        "Listing, client-file, and compliance completeness.",
        "Ethical judgement, confidentiality, and escalation decisions.",
        "Practical readiness for real client work.",
      ],
      portfolioEvidence: AGENT_PORTFOLIO_REQUIREMENTS.slice(0, 5),
      roleplayEvidence: ROLEPLAY_ASSESSMENT_SCENARIOS.slice(0, 5),
      graduateProofSignals: GRADUATE_OUTCOME_SIGNALS,
      issuedAt: certificate.issuedAt.toISOString(),
      expiresAt: certificate.expiresAt?.toISOString() ?? null,
      status: certificate.status,
    });
  } catch (error) {
    console.error("Certificate verification failed", error);
    return problem(500, "VERIFY_FAILED", "Certificate could not be verified.");
  }
}

function trainingCertificateTitle(title: string) {
  if (/^Certified HouseLink Agent$/i.test(title.trim())) return "Certificate of Completion - HouseLink Agent Foundations";
  if (/HouseLink Certified Agent - Foundations/i.test(title)) return "Certificate of Completion - HouseLink Agent Foundations";
  if (/HouseLink Certified Agent - Listing & Client Mastery/i.test(title)) return "Certificate of Completion - HouseLink Listing & Client Mastery";
  if (/HouseLink Certified Professional Agent/i.test(title)) return "Certificate of Completion - HouseLink Professional Training";
  return title;
}

function readAttemptConfidence(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const meta = (value as Record<string, unknown>)._meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const confidence = (meta as Record<string, unknown>).confidence;
  return typeof confidence === "string" ? confidence : null;
}
