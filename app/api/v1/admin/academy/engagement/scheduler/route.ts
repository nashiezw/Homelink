import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { runAcademyEngagementScheduler } from "@/lib/academy/engagement-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.ACADEMY_ENGAGEMENT_CRON_SECRET;
  const suppliedSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && suppliedSecret === secret) {
    return ok(await runAcademyEngagementScheduler({ id: "academy-engagement-cron", name: "Academy Engagement Scheduler" }));
  }

  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  try {
    return ok(await runAcademyEngagementScheduler({ id: auth.user.id, name: auth.user.name }));
  } catch (error) {
    console.error("Failed to run Academy engagement scheduler", error);
    return problem(500, "ACADEMY_ENGAGEMENT_SCHEDULER_FAILED", "Academy engagement scheduler could not run.");
  }
}
