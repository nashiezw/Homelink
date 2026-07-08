import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { registerResourceAccess } from "@/lib/academy/academy-resource-access";
import { AcademyResourceKind } from "@prisma/client";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to purchase Academy resources.");

  const body = await request.json();
  const resourceKind =
    body.resourceKind === "TRAINING_MANUAL"
      ? AcademyResourceKind.TRAINING_MANUAL
      : body.resourceKind === "COURSE_TOOLKIT"
        ? AcademyResourceKind.COURSE_TOOLKIT
        : null;
  if (!resourceKind) return problem(400, "RESOURCE_KIND_REQUIRED", "Choose a resource type.");

  const user = shouldUsePostgresAuth()
    ? await getPostgresPublicUserById(userId)
    : getStore().getUserById(userId);
  if (!user) return problem(401, "UNAUTHORIZED", "Your session is no longer valid.");

  const result = await registerResourceAccess({
    learnerId: userId,
    resourceKind,
    courseId: typeof body.courseId === "string" ? body.courseId : undefined,
    fullName: typeof body.fullName === "string" && body.fullName.trim() ? body.fullName : user.name,
    email: typeof body.email === "string" && body.email.trim() ? body.email : user.email,
    phone: typeof body.phone === "string" ? body.phone : user.phone ?? undefined,
    isAgent: user.roles?.includes("AGENT") ?? false,
    paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : undefined,
  });

  if (result === "RESOURCE_NOT_AVAILABLE") {
    return problem(404, "RESOURCE_NOT_AVAILABLE", "This resource is not currently available for purchase.");
  }

  return ok(result);
}
