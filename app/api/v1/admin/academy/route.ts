import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getAcademyDashboard, runAcademyAction } from "@/lib/academy/postgres-academy-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  try {
    return ok(await getAcademyDashboard());
  } catch (error) {
    console.error("Failed to load HomeLink Agent Academy", error);
    return problem(500, "ACADEMY_READ_FAILED", "HomeLink Agent Academy data could not be loaded.");
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  try {
    const body = await request.json();
    const result = await runAcademyAction(body, { id: auth.user.id, name: auth.user.name });
    if (!result) return problem(400, "INVALID_ACADEMY_ACTION", "Unknown Academy action.");
    return ok(result);
  } catch (error) {
    console.error("Failed to update HomeLink Agent Academy", error);
    return problem(500, "ACADEMY_WRITE_FAILED", error instanceof Error ? error.message : "Academy update could not be saved.");
  }
}
