import { ok, problem, created } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to check rating eligibility.");

  const listingId = new URL(request.url).searchParams.get("listingId");
  if (!listingId) return problem(400, "INVALID_REQUEST", "listingId is required.");

  if (isPostgresStoreEnabled()) {
    const deal = await getRateableAgentDealFromPostgres(userId, listingId);
    return ok(deal);
  }

  const deal = getStore().getRateableAgentDeal(userId, listingId);
  return ok(deal);
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to submit a rating.");

  const body = await request.json();
  if (isPostgresStoreEnabled()) {
    const rating = await createAgentRatingInPostgres(userId, body);
    if ("error" in rating) return rating.error;
    return created(rating.rating);
  }

  const store = getStore();
  const user = store.getUserById(userId);
  if (!user) return problem(404, "NOT_FOUND", "User not found.");

  const deal = store.getRateableAgentDeal(userId, body.listingId);
  if (!deal || deal.dealRef !== body.dealRef) {
    return problem(400, "NOT_ELIGIBLE", "No completed deal found to rate for this listing.");
  }

  const rating = store.addAgentRating({
    agentId: deal.agentId,
    customerId: userId,
    customerName: user.name,
    dealRef: deal.dealRef,
    professionalism: Number(body.professionalism),
    communication: Number(body.communication),
    knowledge: Number(body.knowledge),
    responsiveness: Number(body.responsiveness),
    comment: body.comment ? String(body.comment) : undefined,
  });

  return created(rating);
}

async function getRateableAgentDealFromPostgres(customerId: string, listingId: string) {
  const prisma = getMainPrisma();
  const lead = await prisma.agentLeadRecord.findFirst({
    where: {
      listingId,
      status: "CLOSED_WON",
      assignedAgentId: { not: null },
      payload: { path: ["clientUserId"], equals: customerId },
    },
    orderBy: { updatedAt: "desc" },
  });
  const payload = objectPayload(lead?.payload);
  const dealRef = stringValue(payload.dealRef);
  if (!lead?.assignedAgentId || !dealRef) return null;

  const existingRating = await prisma.review.findFirst({
    where: {
      authorId: customerId,
      target: "agent",
      metadata: { path: ["dealRef"], equals: dealRef },
    },
    select: { id: true },
  });
  if (existingRating) return null;

  const agent = await prisma.user.findUnique({
    where: { id: lead.assignedAgentId },
    select: { id: true, name: true, email: true },
  });

  return {
    agentId: lead.assignedAgentId,
    agentName: agent?.name ?? lead.assignedAgentName ?? "HouseLink Agent",
    agentSlug: slugify(agent?.name ?? lead.assignedAgentName ?? lead.assignedAgentId),
    dealRef,
    listingId: lead.listingId ?? undefined,
    listingTitle: lead.listingTitle ?? undefined,
    closedAt: stringValue(payload.closedAt),
  };
}

async function createAgentRatingInPostgres(customerId: string, body: Record<string, unknown>) {
  const listingId = stringValue(body.listingId);
  const dealRef = stringValue(body.dealRef);
  if (!listingId || !dealRef) {
    return { error: problem(400, "INVALID_REQUEST", "listingId and dealRef are required.") };
  }

  const prisma = getMainPrisma();
  const [user, deal] = await Promise.all([
    prisma.user.findUnique({ where: { id: customerId }, select: { name: true } }),
    getRateableAgentDealFromPostgres(customerId, listingId),
  ]);
  if (!user) return { error: problem(404, "NOT_FOUND", "User not found.") };
  if (!deal || deal.dealRef !== dealRef) {
    return { error: problem(400, "NOT_ELIGIBLE", "No completed deal found to rate for this listing.") };
  }

  const professionalism = numericRating(body.professionalism);
  const communication = numericRating(body.communication);
  const knowledge = numericRating(body.knowledge);
  const responsiveness = numericRating(body.responsiveness);
  if ([professionalism, communication, knowledge, responsiveness].some((value) => value === null)) {
    return { error: problem(400, "INVALID_RATING", "All rating scores must be between 1 and 5.") };
  }

  const overall = Math.round(((professionalism! + communication! + knowledge! + responsiveness!) / 4) * 10) / 10;
  const review = await prisma.review.create({
    data: {
      authorId: customerId,
      listingId,
      rating: Math.round(overall),
      body: stringValue(body.comment) ?? `Rated ${deal.agentName} ${overall}/5.`,
      target: "agent",
      metadata: {
        agentId: deal.agentId,
        agentName: deal.agentName,
        customerName: user.name,
        dealRef,
        listingId,
        listingTitle: deal.listingTitle,
        professionalism,
        communication,
        knowledge,
        responsiveness,
        overall,
      },
    },
  });

  return {
    rating: {
      id: review.id,
      agentId: deal.agentId,
      customerId,
      customerName: user.name,
      dealRef,
      professionalism,
      communication,
      knowledge,
      responsiveness,
      overall,
      comment: stringValue(body.comment),
      createdAt: review.createdAt.toISOString(),
    },
  };
}

function objectPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numericRating(value: unknown) {
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agent";
}
