import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, problem } from "@/lib/api/response";
import { createPMRequestInPostgres, shouldUsePostgresPM } from "@/lib/property-management/postgres-pm-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

const SERVICE_MAP: Record<string, string> = {
  sell: "sale_management",
  rent: "rental_collection",
  manage: "full_management",
  tenants: "tenant_find",
  valuation: "property_valuation",
  commercial: "commercial_management",
  diaspora: "diaspora_services",
};

export async function POST(request: Request) {
  const body = await request.json();
  const sessionUserId = getSessionUserIdFromRequest(request);

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const services: string[] = Array.isArray(body.services) ? body.services : body.service ? [body.service] : [];

  if (!fullName || !phone || !location) {
    return problem(400, "INVALID_INPUT", "Full name, phone, and property location are required.");
  }
  if (services.length === 0) {
    return problem(400, "INVALID_INPUT", "Select at least one service.");
  }

  const mappedServices = services.map((s) => SERVICE_MAP[s] ?? s);
  const primaryService = mappedServices[0] ?? "full_management";
  const city = location.split(",")[0]?.trim() || location;

  let ownerId: string;
  let ownerEmail: string;
  let ownerName: string;

  if (sessionUserId) {
    if (shouldUsePostgresPM()) {
      ownerId = sessionUserId;
      ownerEmail = body.email?.trim() || `user+${sessionUserId}@houselinkzim.co.zw`;
      ownerName = fullName;
    } else {
      const store = getStore();
      const user = store.getUserById(sessionUserId);
      if (!user) return problem(401, "UNAUTHORIZED", "Invalid session.");
      ownerId = user.id;
      ownerEmail = user.email;
      ownerName = fullName || user.name;
    }
  } else {
    ownerId = `guest_${crypto.randomUUID()}`;
    ownerEmail = body.email?.trim() || `guest+${phone.replace(/\D/g, "")}@houselinkzim.co.zw`;
    ownerName = fullName;
  }

  const input = {
    ownerId,
    ownerName,
    ownerEmail,
    ownerPhone: phone,
    propertyAddress: location,
    city,
    propertyType: body.propertyType ?? "house",
    serviceType: primaryService,
    description: `Services requested: ${mappedServices.join(", ")}. Submitted via homepage hero.`,
    bedrooms: body.bedrooms ? Number(body.bedrooms) : undefined,
  };
  const result = shouldUsePostgresPM() ? await createPMRequestInPostgres(input) : getStore().submitPMRequest(input, clientIp(request));

  return created({
    request: result.request,
    requestNumber: result.request.requestNumber,
    consultant: result.recommendation,
    lead: result.lead,
  });
}
