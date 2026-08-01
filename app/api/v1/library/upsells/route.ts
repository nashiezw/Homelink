import { ok, problem } from "@/lib/api/response";
import { suggestLibraryDigitalUpsells } from "@/lib/library/catalog";
import { listLibraryProducts } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

/** Public digital-only upsell suggestions from FBT companions / series. */
export async function POST(request: Request) {
  let body: {
    seedProductIds?: unknown;
    excludeProductIds?: unknown;
    max?: unknown;
    preferPromoCompanions?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const seedProductIds = Array.isArray(body.seedProductIds)
    ? body.seedProductIds.map(String).filter(Boolean)
    : [];
  if (!seedProductIds.length) {
    return ok({ suggestions: [] });
  }
  const excludeProductIds = Array.isArray(body.excludeProductIds)
    ? body.excludeProductIds.map(String).filter(Boolean)
    : [];
  const max = Number(body.max);
  const catalog = await listLibraryProducts({});
  const suggestions = suggestLibraryDigitalUpsells({
    catalog,
    seedProductIds,
    excludeProductIds,
    max: Number.isFinite(max) ? max : 2,
    preferPromoCompanions: Boolean(body.preferPromoCompanions),
  });
  return ok({ suggestions });
}
