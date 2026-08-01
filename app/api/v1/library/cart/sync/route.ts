import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { syncLibraryAbandonedCart, type LibraryCartLine } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    email?: string;
    items?: LibraryCartLine[];
    currency?: string;
    subtotal?: number;
  };
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const userId = getSessionUserIdFromRequest(request) ?? undefined;
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return problem(400, "INVALID_EMAIL", "A valid email is required to save your bag.");
  }
  if (!Array.isArray(body.items) || !body.items.length) {
    return problem(400, "EMPTY_CART", "Cart items are required.");
  }

  const row = await syncLibraryAbandonedCart({
    email,
    userId,
    items: body.items,
    currency: body.currency,
    subtotal: body.subtotal,
  });
  if (!row) return problem(500, "SYNC_FAILED", "Could not save your bag for reminders.");
  return ok({ id: row.id, email });
}
