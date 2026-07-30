import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { isLibraryWishlisted, toggleLibraryWishlist } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view your wishlist.");
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  if (!productId) return problem(400, "INVALID_PRODUCT", "productId is required.");
  return ok({ wished: await isLibraryWishlisted(userId, productId), productId });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to manage your wishlist.");
  let body: { productId?: string };
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  if (!body.productId) return problem(400, "INVALID_PRODUCT", "productId is required.");
  const result = await toggleLibraryWishlist(userId, body.productId);
  if (!result) return problem(404, "PRODUCT_NOT_FOUND", "Library product not found.");
  return ok(result);
}
