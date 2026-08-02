import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { logLibraryActivity } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set(["CART_ADD_SINGLE", "CART_ADD_BUNDLE", "CART_REMOVE", "CART_QTY_CHANGE", "CART_CLEAR"]);

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
    targetId: productId || "cart",
    action,
    message: libraryEventMessage(action),
    metadata: {
      ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}),
      source: "storefront",
    },
  });

  return ok({ logged: true });
}

function libraryEventMessage(action: string) {
  if (action === "CART_ADD_BUNDLE") return "Bundle added to Library bag.";
  if (action === "CART_REMOVE") return "Product removed from Library bag.";
  if (action === "CART_QTY_CHANGE") return "Library bag quantity changed.";
  if (action === "CART_CLEAR") return "Library bag cleared.";
  return "Product added to Library bag.";
}
