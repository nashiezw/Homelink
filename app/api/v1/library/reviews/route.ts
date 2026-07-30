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
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to leave a Library review.");
  let body: { productId?: string; rating?: number; title?: string; body?: string };
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
  });
  if (!result) return problem(400, "INVALID_REVIEW", "A valid rating and purchased product are required.");
  if ("error" in result && result.error === "REVIEWS_DISABLED") {
    return problem(403, "REVIEWS_DISABLED", "Library reviews are currently disabled.");
  }
  if ("error" in result && result.error === "PURCHASE_REQUIRED") {
    return problem(403, "PURCHASE_REQUIRED", "You can review products after purchasing digital or printed formats.");
  }
  return created({ review: result });
}
