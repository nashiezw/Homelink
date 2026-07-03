import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view notifications.");
  }
  return ok(getStore().getNotifications(userId));
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to create notifications.");
  }
  const body = await request.json();
  if (!body.subject || !body.body) {
    return problem(400, "INVALID_NOTIFICATION", "subject and body are required.");
  }
  return created(
    getStore().createNotification(userId, {
      channel: body.channel ?? "email",
      subject: body.subject,
      body: body.body,
    }),
  );
}
