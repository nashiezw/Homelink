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
              assignmentId: { in: programme?.assignmentIds ?? [] },
            },
            orderBy: { submittedAt: "desc" },
          }),
        ])
      : [[], [], []];
    const confidenceSignals = quizAttempts
      .map((attempt) => readAttemptConfidence(attempt.answers))
      .filter((value): value is string => Boolean(value));

    return ok({
      valid: true,
      certificateNumber: certificate.certificateNumber,
      course: certificate.course?.title ?? null,
      certificateTitle: trainingCertificateTitle(programme?.certificateTitle ?? certificate.course?.title ?? "HouseLink Academy Training Certificate"),
      badgeName: programme?.badgeName ?? null,
      skillsAssessed: programme?.learningOutcomes ?? [],
      assessmentProof: programme
        ? {
            trainingSessions: programme.includes.find((item) => /training sessions/i.test(item)) ?? null,
            quizzes: programme.quizIds.length,
            assignments: programme.assignmentIds.length,
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
            requiresFinalExam: programme.requiresFinalExam,
            requiresPortfolio: programme.assignmentIds.some((id) => id.includes("portfolio")),
            roleplayAssessments: programme.assignmentIds.filter((id) => id.includes("roleplay") || id.includes("simulation")).length,
            certificateRequirements: [
              programme.assessmentSummary,
              ...programme.includes.filter((item) => /quiz|assignment|exam|portfolio|certificate/i.test(item)),
            ],
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
