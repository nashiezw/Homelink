import { requireAdminAsync } from "@/lib/admin/require-admin";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const prisma = getMainPrisma();
  const [enrolments, courseProgress, quizAttempts, examAttempts, assignmentSubmissions, certificates] = await Promise.all([
    prisma.courseEnrolment.findMany({ include: { course: { select: { title: true } } }, orderBy: { enrolledAt: "desc" } }),
    prisma.courseProgress.findMany({ include: { course: { select: { title: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.quizAttempt.findMany({ include: { quiz: { select: { title: true } } }, orderBy: { startedAt: "desc" }, take: 1000 }),
    prisma.examAttempt.findMany({ include: { exam: { select: { title: true } } }, orderBy: { startedAt: "desc" }, take: 1000 }),
    prisma.assignmentSubmission.findMany({ include: { assignment: { select: { title: true } } }, orderBy: { submittedAt: "desc" }, take: 1000 }),
    prisma.certificateIssue.findMany({ include: { course: { select: { title: true } } }, orderBy: { issuedAt: "desc" } }),
  ]);

  const rows = [
    ...enrolments.map((entry) => ({
      recordType: "enrolment",
      agentId: entry.agentId,
      course: entry.course.title,
      assessment: "",
      status: entry.status,
      score: "",
      riskSignals: "",
      weakTopics: "",
      mentorSignoff: "",
      certificateNumber: "",
      occurredAt: entry.enrolledAt.toISOString(),
    })),
    ...courseProgress.map((entry) => ({
      recordType: "course_progress",
      agentId: entry.agentId,
      course: entry.course.title,
      assessment: "",
      status: entry.status,
      score: `${entry.percentComplete}% complete / ${Number(entry.averageScore)}% average`,
      riskSignals: entry.percentComplete < 35 && entry.status !== "COMPLETED" ? "low_progress" : "",
      weakTopics: "",
      mentorSignoff: "",
      certificateNumber: "",
      occurredAt: entry.updatedAt.toISOString(),
    })),
    ...quizAttempts.map((entry) => {
      const meta = attemptMeta(entry.answers);
      return {
        recordType: "quiz_attempt",
        agentId: entry.agentId,
        course: "",
        assessment: entry.quiz.title,
        status: entry.status,
        score: `${Number(entry.score)}%`,
        riskSignals: [meta.confidence === "guessed" || meta.confidence === "mixed" ? `confidence:${meta.confidence}` : "", meta.elapsedSeconds && meta.elapsedSeconds < 90 ? "rushed" : ""].filter(Boolean).join("; "),
        weakTopics: meta.reviewTopics.join("; "),
        mentorSignoff: "",
        certificateNumber: "",
        occurredAt: (entry.submittedAt ?? entry.startedAt).toISOString(),
      };
    }),
    ...examAttempts.map((entry) => {
      const meta = attemptMeta(entry.answers);
      return {
        recordType: "exam_attempt",
        agentId: entry.agentId,
        course: "",
        assessment: entry.exam.title,
        status: entry.status,
        score: `${Number(entry.score)}%`,
        riskSignals: meta.securityEvents.length ? `security_events:${meta.securityEvents.join(";")}` : "",
        weakTopics: meta.reviewTopics.join("; "),
        mentorSignoff: "",
        certificateNumber: "",
        occurredAt: (entry.submittedAt ?? entry.startedAt).toISOString(),
      };
    }),
    ...assignmentSubmissions.map((entry) => ({
      recordType: "assignment_submission",
      agentId: entry.agentId,
      course: "",
      assessment: entry.assignment.title,
      status: entry.status,
      score: entry.grade === null ? "" : `${Number(entry.grade)}%`,
      riskSignals: entry.status === "RESUBMISSION_REQUESTED" || (entry.grade !== null && Number(entry.grade) < 70) ? "practical_review_needed" : "",
      weakTopics: "",
      mentorSignoff: /mentor sign-off:\s*granted/i.test(entry.reviewerNote ?? "") ? "granted" : "",
      certificateNumber: "",
      occurredAt: (entry.reviewedAt ?? entry.submittedAt).toISOString(),
    })),
    ...certificates.map((entry) => ({
      recordType: "certificate",
      agentId: entry.agentId,
      course: entry.course?.title ?? "",
      assessment: "",
      status: entry.status,
      score: "",
      riskSignals: entry.status === "ACTIVE" ? "" : "certificate_not_active",
      weakTopics: "",
      mentorSignoff: "",
      certificateNumber: entry.certificateNumber,
      occurredAt: entry.issuedAt.toISOString(),
    })),
  ];

  const headers = ["recordType", "agentId", "course", "assessment", "status", "score", "riskSignals", "weakTopics", "mentorSignoff", "certificateNumber", "occurredAt"];
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(","))].join("\n");
  const filename = `houselink-academy-trainer-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function attemptMeta(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { confidence: null as string | null, elapsedSeconds: null as number | null, reviewTopics: [] as string[], securityEvents: [] as string[] };
  const meta = (value as Record<string, unknown>)._meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return { confidence: null as string | null, elapsedSeconds: null as number | null, reviewTopics: [] as string[], securityEvents: [] as string[] };
  const record = meta as Record<string, unknown>;
  return {
    confidence: typeof record.confidence === "string" ? record.confidence : null,
    elapsedSeconds: typeof record.elapsedSeconds === "number" && Number.isFinite(record.elapsedSeconds) ? record.elapsedSeconds : null,
    reviewTopics: Array.isArray(record.reviewTopics) ? record.reviewTopics.filter((item): item is string => typeof item === "string") : [],
    securityEvents: Array.isArray(record.securityEvents) ? record.securityEvents.filter((item): item is string => typeof item === "string") : [],
  };
}
