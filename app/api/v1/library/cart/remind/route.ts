import { ok, problem } from "@/lib/api/response";
import { processLibraryAbandonedCartReminders } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

/** Optional cron/manual trigger for abandoned bag reminders. Protect with CRON_SECRET when set. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.HOUSELINK_CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization") || "";
    if (header !== `Bearer ${secret}`) {
      return problem(401, "UNAUTHORIZED", "Invalid cron secret.");
    }
  }
  const result = await processLibraryAbandonedCartReminders();
  return ok(result);
}
