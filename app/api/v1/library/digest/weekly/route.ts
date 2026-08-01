import { ok, problem } from "@/lib/api/response";
import { sendLibraryWeeklyDigest } from "@/lib/library/repository";

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

/** Monday weekly Library ops digest (Vercel cron GET). */
export async function GET(request: Request) {
  const authError = authorizeCron(request);
  if (authError) return authError;
  const result = await sendLibraryWeeklyDigest();
  return ok(result);
}

export async function POST(request: Request) {
  const authError = authorizeCron(request);
  if (authError) return authError;
  const result = await sendLibraryWeeklyDigest();
  return ok(result);
}
