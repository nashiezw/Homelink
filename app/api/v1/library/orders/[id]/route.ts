import { ok, problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getStore } from "@/lib/store/app-store";
import { getLibraryOrderForUser } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view this Library order.");
  const user = shouldUsePostgresAuth() ? await getPostgresPublicUserById(userId) : getStore().getUserById(userId);
  const { id } = await context.params;
  const order = await getLibraryOrderForUser(id, userId, user?.roles);
  if (!order) return problem(404, "ORDER_NOT_FOUND", "Library order not found.");
  if (order === "FORBIDDEN") return problem(403, "ACCESS_DENIED", "You do not have access to this order.");
  return ok(order);
}
