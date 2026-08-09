import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getProgrammeCourse } from "@/lib/academy/academy-programme";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ issueId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view this certificate.");

  const { issueId } = await context.params;
  const prisma = getMainPrisma();
  const issue = await prisma.certificateIssue.findUnique({
    where: { id: issueId },
    include: { course: true, template: true },
  });
  if (!issue || issue.status !== "ACTIVE") return problem(404, "NOT_FOUND", "Certificate not found.");
  if (issue.agentId !== userId) return problem(403, "FORBIDDEN", "This certificate belongs to another learner.");

  const [user, currentCourseTemplate] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    !issue.courseId
      ? Promise.resolve(null)
      : prisma.certificateTemplate.findMany({ where: { active: true }, orderBy: { updatedAt: "desc" } }).then((templates) => selectCertificateTemplateForCourse(templates, issue.courseId!)),
  ]);
  const template = issue.template ?? currentCourseTemplate;
  const programme = issue.courseId ? getProgrammeCourse(issue.courseId) : null;
  const templateJson = (template?.templateJson ?? {}) as Record<string, unknown>;
  const colours = (templateJson.colours ?? {}) as Record<string, unknown>;

  return ok({
    id: issue.id,
    certificateNumber: issue.certificateNumber,
    courseId: issue.courseId,
    courseTitle: issue.course?.title ?? "HouseLink Academy Course",
    certificateTitle: trainingCertificateTitle(String(templateJson.title ?? programme?.certificateTitle ?? "HouseLink Academy Training Certificate")),
    skillsAssessed: programme?.learningOutcomes ?? [],
    badgeName: programme?.badgeName ?? null,
    issuedAt: issue.issuedAt.toISOString(),
    expiresAt: issue.expiresAt?.toISOString() ?? null,
    verifyUrl: `/academy/verify?certificate=${encodeURIComponent(issue.certificateNumber)}`,
    learnerName: user?.name ?? "HouseLink Learner",
    accent: String(colours.primary ?? programme?.theme.accent ?? "#008b68"),
    backgroundUrl: template?.backgroundUrl ?? null,
    logoUrl: template?.logoUrl ?? null,
    signatureUrl: template?.signatureUrl ?? null,
    signatureName: typeof templateJson.signatureName === "string" ? templateJson.signatureName : null,
    signatureTitle: typeof templateJson.signatureTitle === "string" ? templateJson.signatureTitle : null,
    secondSignatureUrl: typeof templateJson.secondSignatureUrl === "string" ? templateJson.secondSignatureUrl : null,
    secondSignatureName: typeof templateJson.secondSignatureName === "string" ? templateJson.secondSignatureName : null,
    secondSignatureTitle: typeof templateJson.secondSignatureTitle === "string" ? templateJson.secondSignatureTitle : null,
    sealUrl: typeof templateJson.sealUrl === "string" ? templateJson.sealUrl : null,
    leftLaurelUrl: typeof templateJson.leftLaurelUrl === "string" ? templateJson.leftLaurelUrl : null,
    rightLaurelUrl: typeof templateJson.rightLaurelUrl === "string" ? templateJson.rightLaurelUrl : null,
    designation: typeof templateJson.designation === "string" ? templateJson.designation : null,
    customHtml: typeof templateJson.customHtml === "string" ? templateJson.customHtml : "",
    customCss: typeof templateJson.customCss === "string" ? templateJson.customCss : "",
  });
}

function selectCertificateTemplateForCourse<T extends { templateJson: unknown }>(templates: T[], courseId: string): T | null {
  const courseTemplate = templates.find((template) => {
    const templateJson = (template.templateJson ?? {}) as Record<string, unknown>;
    const courseIds = Array.isArray(templateJson.courseIds) ? templateJson.courseIds.filter((id): id is string => typeof id === "string") : [];
    return courseIds.includes(courseId);
  });
  if (courseTemplate) return courseTemplate;

  return templates.find((template) => {
    const templateJson = (template.templateJson ?? {}) as Record<string, unknown>;
    const courseIds = Array.isArray(templateJson.courseIds) ? templateJson.courseIds.filter((id): id is string => typeof id === "string") : [];
    return courseIds.length === 0;
  }) ?? templates[0] ?? null;
}

function trainingCertificateTitle(title: string) {
  if (/^Certified HouseLink Agent$/i.test(title.trim())) return "Certificate of Completion - HouseLink Agent Foundations";
  if (/HouseLink Certified Agent - Foundations/i.test(title)) return "Certificate of Completion - HouseLink Agent Foundations";
  if (/HouseLink Certified Agent - Listing & Client Mastery/i.test(title)) return "Certificate of Completion - HouseLink Listing & Client Mastery";
  if (/HouseLink Certified Professional Agent/i.test(title)) return "Certificate of Completion - HouseLink Professional Training";
  return title;
}
