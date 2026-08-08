import { requireAdminAsync } from "@/lib/admin/require-admin";
import { getMainPrisma } from "@/lib/db/main-prisma";
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "csv";

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
  const filename = `houselink-academy-trainer-export-${new Date().toISOString().slice(0, 10)}`;

  if (format === "excel" || format === "xlsx") {
    return generateExcelExport(rows, headers, filename);
  }

  if (format === "pdf") {
    return generatePdfExport(rows, headers, filename);
  }

  // Default to CSV
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

async function generateExcelExport(rows: Array<Record<string, unknown>>, headers: string[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows.map(row => {
    const newRow: Record<string, string> = {};
    headers.forEach(header => {
      newRow[header] = String(row[header] ?? "");
    });
    return newRow;
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Academy Data");

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  return new Response(excelBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

async function generatePdfExport(rows: Array<Record<string, unknown>>, headers: string[], filename: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;
  const margin = 50;
  const lineHeight = 14;
  const colWidth = (page.getWidth() - 2 * margin) / headers.length;

  // Title
  page.drawText("HouseLink Academy Trainer Export", {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // Headers
  headers.forEach((header, i) => {
    page.drawText(header, {
      x: margin + i * colWidth,
      y,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  });
  y -= lineHeight;

  // Data rows
  for (const row of rows) {
    if (y < 50) {
      // Add new page if we run out of space
      page.drawText("(continued on next page)", { x: margin, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
      const newPage = pdfDoc.addPage();
      y = newPage.getHeight() - 50;
      
      // Repeat headers on new page
      headers.forEach((header, i) => {
        newPage.drawText(header, {
          x: margin + i * colWidth,
          y,
          size: 10,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
      });
      y -= lineHeight;
    }

    headers.forEach((header, i) => {
      const value = String(row[header as keyof typeof row] ?? "").substring(0, 20);
      page.drawText(value, {
        x: margin + i * colWidth,
        y,
        size: 8,
        font,
        color: rgb(0, 0, 0),
      });
    });
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
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
