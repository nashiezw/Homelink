import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem, created } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to check rating eligibility.");

  const listingId = new URL(request.url).searchParams.get("listingId");
  if (!listingId) return problem(400, "INVALID_REQUEST", "listingId is required.");

  const deal = getStore().getRateableAgentDeal(userId, listingId);
  return ok(deal);
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to submit a rating.");

  const body = await request.json();
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
