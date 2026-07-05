import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import {
  createNotificationInPostgres,
  listNotificationsFromPostgres,
  shouldUsePostgresPersistence,
} from "@/lib/db/postgres-app-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view notifications.");
  }
  if (shouldUsePostgresPersistence()) {
    return ok(await listNotificationsFromPostgres(userId));
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
  if (shouldUsePostgresPersistence()) {
    try {
      return created(
        await createNotificationInPostgres(userId, {
          channel: body.channel ?? "email",
          subject: body.subject,
          body: body.body,
        }),
      );
    } catch (error) {
      console.error("Failed to create notification", error);
      return problem(500, "NOTIFICATION_CREATE_FAILED", "Notification could not be created.");
    }
  }
  return created(
    getStore().createNotification(userId, {
      channel: body.channel ?? "email",
      subject: body.subject,
      body: body.body,
    }),
  );
}
