import { ok, problem } from "@/lib/api/response";
import { processLibraryAbandonedCartReminders } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.HOUSELINK_CRON_SECRET;
  if (!secret) return null;
  const header = request.headers.get("authorization") || "";
  if (header !== `Bearer ${secret}`) {
    return problem(401, "UNAUTHORIZED", "Invalid cron secret.");
  }
  return null;
}

/** Vercel Cron uses GET; manual/ops triggers may use POST. Protect with CRON_SECRET when set. */
export async function GET(request: Request) {
  const authError = authorizeCron(request);
  if (authError) return authError;
  const result = await processLibraryAbandonedCartReminders();
  return ok(result);
}

export async function POST(request: Request) {
  const authError = authorizeCron(request);
  if (authError) return authError;
  const result = await processLibraryAbandonedCartReminders();
  return ok(result);
}
