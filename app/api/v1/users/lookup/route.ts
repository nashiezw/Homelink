import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in required.");
  }

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return problem(400, "INVALID_INPUT", "email query parameter required.");
  }

  const user = Array.from(getStore().listUsers()).find((u) => u.email.toLowerCase() === email);
  if (!user) {
    return problem(404, "NOT_FOUND", "No user found with that email.");
  }

  return ok({ id: user.id, name: user.name, email: user.email });
}
