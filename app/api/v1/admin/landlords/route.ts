import { requireAdmin } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? "ALL";

  const store = getStore();
  let landlords = store.listLandlords();

  if (status !== "ALL") {
    landlords = landlords.filter((l) => l.accountStatus === status);
  }
  if (q?.trim()) {
    const term = q.toLowerCase();
    landlords = landlords.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.email.toLowerCase().includes(term) ||
        (l.city?.toLowerCase().includes(term) ?? false),
    );
  }

  return ok({
    landlords,
    summary: {
      total: store.listLandlords().length,
      active: store.listLandlords().filter((l) => l.accountStatus === "ACTIVE").length,
      premium: store.listLandlords().filter((l) => l.premium).length,
      verified: store.listLandlords().filter((l) => l.verification.identity === "VERIFIED").length,
      avgPerformance: Math.round(
        store.listLandlords().reduce((s, l) => s + l.performanceScore, 0) /
          Math.max(1, store.listLandlords().length),
      ),
    },
  });
}
