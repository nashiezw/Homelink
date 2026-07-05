import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import {
  createPMRequestInPostgres,
  listPMRequestsFromPostgres,
  shouldUsePostgresPM,
} from "@/lib/property-management/postgres-pm-repository";
import { getPostgresUserById } from "@/lib/auth/postgres-auth";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to continue.");

  const store = shouldUsePostgresPM() ? null : getStore();
  const user = shouldUsePostgresPM() ? await getPostgresUserById(userId) : store?.getUserById(userId);
  if (!user) return problem(401, "UNAUTHORIZED", "Invalid session.");

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  if (user.roles.includes("ADMIN")) {
    if (shouldUsePostgresPM()) {
      return ok({ requests: await listPMRequestsFromPostgres({ q, status }) });
    }
    const requests = store!.listPMRequests({ q, status: status as import("@/lib/property-management/types").PMRequestStatus | undefined });
    return ok({ requests, leads: store!.listCRMLeads(), consultants: store!.listConsultants() });
  }

  if (user.roles.map(String).includes("CONSULTANT")) {
    if (shouldUsePostgresPM()) {
      return ok({ requests: await listPMRequestsFromPostgres({ consultantId: userId, q, status }), metrics: null });
    }
    const requests = store!.listPMRequests({ consultantId: userId, q, status: status as import("@/lib/property-management/types").PMRequestStatus | undefined });
    return ok({ requests, metrics: store!.getConsultantMetrics(userId) });
  }

  if (shouldUsePostgresPM()) {
    return ok({ requests: await listPMRequestsFromPostgres({ ownerId: userId, q, status }) });
  }
  const requests = store!.listPMRequests({ ownerId: userId, q, status: status as import("@/lib/property-management/types").PMRequestStatus | undefined });
  return ok({ requests });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to submit a property management request.");

  const body = await request.json();
  const store = shouldUsePostgresPM() ? null : getStore();
  const user = shouldUsePostgresPM() ? await getPostgresUserById(userId) : store?.getUserById(userId);
  if (!user) return problem(401, "UNAUTHORIZED", "Invalid session.");

  const required = ["propertyAddress", "city", "propertyType", "serviceType", "description"] as const;
  for (const key of required) {
    if (!body[key]?.toString().trim()) {
      return problem(400, "INVALID_INPUT", `${key} is required.`);
    }
  }

  const input = {
    ownerId: userId,
    ownerName: user.name,
    ownerEmail: user.email,
    ownerPhone: body.ownerPhone ?? user.phone ?? "",
    propertyAddress: body.propertyAddress,
    city: body.city,
    suburb: body.suburb,
    propertyType: body.propertyType,
    serviceType: body.serviceType,
    bedrooms: body.bedrooms ? Number(body.bedrooms) : undefined,
    description: body.description,
  };
  const result = shouldUsePostgresPM() ? await createPMRequestInPostgres(input) : store!.submitPMRequest(input, clientIp(request));

  return created({ request: result.request, lead: result.lead, recommendation: result.recommendation });
}
