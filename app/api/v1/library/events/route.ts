import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { logLibraryActivity } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set(["CART_ADD_SINGLE", "CART_ADD_BUNDLE"]);

export async function POST(request: Request) {
  let body: { action?: string; productId?: string; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const action = String(body.action || "").trim();
  const productId = String(body.productId || "").trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return problem(400, "INVALID_ACTION", "Unsupported Library event action.");
  }
  if (!productId) {
    return problem(400, "INVALID_PRODUCT", "productId is required.");
  }

  const actorId = getSessionUserIdFromRequest(request) ?? undefined;
  await logLibraryActivity({
    actorId,
    targetType: "product",
    targetId: productId,
    action,
    message: action === "CART_ADD_BUNDLE" ? "Bundle added to Library bag." : "Product added to Library bag.",
    metadata: {
      ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}),
      source: "storefront",
    },
  });

  return ok({ logged: true });
}
