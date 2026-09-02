import { created, ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { createLibraryCustomerReview, listApprovedLibraryProductReviews } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId")?.trim();
  if (!productId) return problem(400, "INVALID_PRODUCT", "productId is required.");
  const reviews = await listApprovedLibraryProductReviews(productId);
  return ok({ reviews });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  let body: {
    productId?: string;
    rating?: number;
    title?: string;
    body?: string;
    displayName?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    purchaseSource?: string;
  };
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  if (!body.productId) return problem(400, "INVALID_PRODUCT", "productId is required.");
  const result = await createLibraryCustomerReview({
    userId,
    productId: body.productId,
    rating: Number(body.rating),
    title: body.title,
    body: body.body,
    displayName: body.displayName,
    guestName: body.guestName,
    guestEmail: body.guestEmail,
    guestPhone: body.guestPhone,
    purchaseSource: body.purchaseSource,
  });
  if (!result) return problem(400, "INVALID_REVIEW", "A valid rating and purchased product are required.");
  if ("error" in result) {
    if (result.error === "REVIEWS_DISABLED") {
      return problem(403, "REVIEWS_DISABLED", "Library reviews are currently disabled.");
    }
    if (result.error === "INVALID_RATING") {
      const min = "minRating" in result && typeof result.minRating === "number" ? result.minRating : 1;
      return problem(400, "INVALID_RATING", `Choose a rating between ${min} and 5.`);
    }
    if (result.error === "INVALID_TITLE") {
      const min = "minLength" in result && typeof result.minLength === "number" ? result.minLength : 3;
      return problem(400, "INVALID_TITLE", `Add a review title of at least ${min} characters.`);
    }
    if (result.error === "INVALID_BODY") {
      const min = "minLength" in result && typeof result.minLength === "number" ? result.minLength : 20;
      return problem(400, "INVALID_BODY", `Write a review of at least ${min} characters.`);
    }
    if (result.error === "INVALID_DISPLAY_NAME") {
      return problem(400, "INVALID_DISPLAY_NAME", "Display name must be at least 2 characters.");
    }
    if (result.error === "GUEST_CONTACT_REQUIRED") {
      return problem(400, "GUEST_CONTACT_REQUIRED", "Add your name and either a phone number or email so HouseLink can verify the review privately.");
    }
    return problem(400, "INVALID_REVIEW", "A valid rating and product are required.");
  }
  return created({
    review: result,
    autoApproved: Boolean(result.autoApproved),
    productRating: "productRating" in result ? result.productRating : undefined,
  });
}
