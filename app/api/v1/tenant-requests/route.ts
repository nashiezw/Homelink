import { created, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { createTenantRequest, normalizeTenantRequestInput, validateTenantRequest } from "@/lib/tenant-requests/repository";

export async function POST(request: Request) {
  const body = await request.json();
  const input = normalizeTenantRequestInput(body);
  const validation = validateTenantRequest(input);
  if (validation) return problem(400, "INVALID_TENANT_REQUEST", validation);

  const userId = getSessionUserIdFromRequest(request) ?? "guest";
  const tenantRequest = await createTenantRequest(input, userId);
  return created({ request: tenantRequest });
}
