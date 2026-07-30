import { ok, problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getStore } from "@/lib/store/app-store";
import { getLibraryOrderForUser, sendLibraryOrderNotification } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to resend Library order email.");
  const user = shouldUsePostgresAuth() ? await getPostgresPublicUserById(userId) : getStore().getUserById(userId);
  const { id } = await context.params;
  const order = await getLibraryOrderForUser(id, userId, user?.roles);
  if (!order) return problem(404, "ORDER_NOT_FOUND", "Library order not found.");
  if (order === "FORBIDDEN") return problem(403, "ACCESS_DENIED", "You do not have access to this order.");
  const result = await sendLibraryOrderNotification(id, "invoice", undefined, userId);
  if (!result) return problem(404, "ORDER_NOT_FOUND", "Library order not found.");
  return ok({ queued: Boolean(result.notification), message: "Invoice email queued to your HouseLink account." });
}
