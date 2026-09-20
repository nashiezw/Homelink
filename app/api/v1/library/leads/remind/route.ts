import { ok, problem } from "@/lib/api/response";
import { processLibraryLeadReminders } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.HOUSELINK_CRON_SECRET;
  if (!secret) return problem(503, "CRON_NOT_CONFIGURED", "Reminder scheduling is not configured.");
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return problem(401, "UNAUTHORIZED", "Invalid cron authorization.");
  return ok(await processLibraryLeadReminders());
}
