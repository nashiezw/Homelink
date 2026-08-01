import { ok, problem } from "@/lib/api/response";
import {
  suggestLibraryDigitalUpsellPack,
  suggestLibraryDigitalUpsells,
} from "@/lib/library/catalog";
import { listLibraryProducts } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

/** Public digital-only upsell suggestions / checkout pack from FBT companions / series. */
export async function POST(request: Request) {
  let body: {
    seedProductIds?: unknown;
    excludeProductIds?: unknown;
    cartProductIds?: unknown;
    max?: unknown;
    maxItems?: unknown;
    preferPromoCompanions?: unknown;
    digitalPromoEligible?: unknown;
    mode?: unknown;
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
    return ok({ suggestions: [], pack: null });
  }
  const excludeProductIds = Array.isArray(body.excludeProductIds)
    ? body.excludeProductIds.map(String).filter(Boolean)
    : [];
  const cartProductIds = Array.isArray(body.cartProductIds)
    ? body.cartProductIds.map(String).filter(Boolean)
    : seedProductIds;
  const max = Number(body.max);
  const maxItems = Number(body.maxItems);
  const catalog = await listLibraryProducts({});
  const mode = String(body.mode || "list").toLowerCase();

  if (mode === "pack") {
    const pack = suggestLibraryDigitalUpsellPack({
      catalog,
      seedProductIds,
      excludeProductIds,
      cartProductIds,
      maxItems: Number.isFinite(maxItems) ? maxItems : 4,
      digitalPromoEligible: body.digitalPromoEligible !== false,
    });
    return ok({ pack, suggestions: pack?.items ?? [] });
  }

  const suggestions = suggestLibraryDigitalUpsells({
    catalog,
    seedProductIds,
    excludeProductIds,
    cartProductIds,
    max: Number.isFinite(max) ? max : 2,
    preferPromoCompanions: Boolean(body.preferPromoCompanions),
  });
  return ok({ suggestions, pack: null });
}
