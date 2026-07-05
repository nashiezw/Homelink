import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import {
  createHolidayHomeReviewInPostgres,
  getHolidayHomeReviewSummaryFromPostgres,
  shouldUsePostgresHolidayReviews,
} from "@/lib/holiday-homes/postgres-review-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  if (!listingId) {
    return problem(400, "MISSING_LISTING", "listingId is required.");
  }

  const summary = shouldUsePostgresHolidayReviews()
    ? await getHolidayHomeReviewSummaryFromPostgres(listingId)
    : getStore().getHolidayHomeReviewSummary(listingId);
  return ok({ summary });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to leave a review.");
  }

  const body = await request.json();
  const review = shouldUsePostgresHolidayReviews()
    ? await createHolidayHomeReviewInPostgres({
        listingId: body.listingId,
        reviewerUserId: userId,
        cleanliness: Number(body.cleanliness),
        location: Number(body.location),
        communication: Number(body.communication),
        valueForMoney: Number(body.valueForMoney),
        comment: body.comment,
      })
    : (() => {
        const store = getStore();
        const user = store.getUserById(userId);
        return store.addHolidayHomeReview({
          listingId: body.listingId,
          reviewerUserId: userId,
          reviewerName: user?.name ?? "Guest",
          cleanliness: Number(body.cleanliness),
          location: Number(body.location),
          communication: Number(body.communication),
          valueForMoney: Number(body.valueForMoney),
          comment: body.comment,
        });
      })();

  if (!review) {
    return problem(400, "INVALID_REVIEW", "Could not submit review.");
  }

  return ok({ review });
}
