import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { generateCertificate } from "@/lib/academy/certificate-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to issue certificates.");

  try {
    const body = await request.json();
    const { courseId, agentId, templateId } = body;

    if (!courseId || !agentId) {
      return problem(400, "MISSING_FIELDS", "courseId and agentId are required.");
    }

    const certificate = await generateCertificate(courseId, agentId, templateId);

    return ok({
      message: "Certificate issued successfully",
      certificate,
    });
  } catch (error) {
    console.error("Failed to issue certificate:", error);
    return problem(500, "SERVER_ERROR", "Failed to issue certificate.");
  }
}
