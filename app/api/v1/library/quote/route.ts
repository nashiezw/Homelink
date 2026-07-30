import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { quoteLibraryCart, type LibraryCartLine } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  let body: { items?: LibraryCartLine[]; couponCode?: string };
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return problem(400, "EMPTY_CART", "Add at least one Library product to quote.");
  try {
    const quote = await quoteLibraryCart(items, body.couponCode, userId ?? undefined);
    return ok(quote);
  } catch (error) {
    console.error("[library/quote] failed", error);
    return problem(500, "LIBRARY_QUOTE_FAILED", "Library cart quote could not be calculated.");
  }
}
