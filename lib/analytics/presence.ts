import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { ensureCoreProductionSchema, isDatabaseUnavailableError, isMissingSchemaError } from "@/lib/db/production-schema";
import { isInternalAnalyticsPath } from "@/lib/analytics/site-analytics";

export type PresenceHeartbeatInput = {
  visitorId: string;
  sessionId: string;
  path: string;
  title?: string;
  deviceType?: string;
  userId?: string;
  productId?: string;
  productTitle?: string;
  cartItemCount?: number;
  cartValue?: number;
  cartCurrency?: string;
  cartSummary?: Array<{ productId: string; title: string; quantity: number; price: number; formatLabel?: string }>;
  referrer?: string;
  utmSource?: string;
  utmCampaign?: string;
  contactEmail?: string;
  contactPhone?: string;
  country?: string;
  region?: string;
  city?: string;
};

export type LivePresenceRow = {
  visitorId: string;
  sessionId: string;
  path: string;
  title: string | null;
  deviceType: string | null;
  userId: string | null;
  productId: string | null;
  productTitle: string | null;
  cartItemCount: number;
  cartValue: number;
  cartCurrency: string | null;
  cartSummary: unknown;
  referrer: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  lastSeenAt: Date;
};

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function cuidLike() {
  return `pres_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function upsertSitePresence(input: PresenceHeartbeatInput) {
  if (!isPostgresStoreEnabled()) return { ok: false };
  const visitorId = clip(input.visitorId, 64);
  const sessionId = clip(input.sessionId, 64);
  const path = clip(input.path, 320) || "/";
  if (!visitorId || !sessionId) return { ok: false };
  if (isInternalAnalyticsPath(path)) return { ok: false, ignored: true };

  const title = clip(input.title, 200) || null;
  const deviceType = clip(input.deviceType, 32) || null;
  const userId = input.userId ? clip(input.userId, 64) : null;
  const productId = input.productId ? clip(input.productId, 64) : null;
  const productTitle = input.productTitle ? clip(input.productTitle, 200) : null;
  const cartItemCount = Math.max(0, Math.min(999, Math.round(Number(input.cartItemCount) || 0)));
  const cartValue = Math.max(0, Math.min(1_000_000, Number(input.cartValue) || 0));
  const cartCurrency = input.cartCurrency ? clip(input.cartCurrency, 8) : null;
  const cartSummary = JSON.stringify(input.cartSummary ?? []);
  const referrer = input.referrer ? clip(input.referrer, 320) : null;
  const utmSource = input.utmSource ? clip(input.utmSource, 80) : null;
  const utmCampaign = input.utmCampaign ? clip(input.utmCampaign, 120) : null;
  const contactEmail = input.contactEmail ? clip(input.contactEmail.toLowerCase(), 160) : null;
  const contactPhone = input.contactPhone ? clip(input.contactPhone, 40) : null;
  const country = input.country ? clip(input.country, 80) : null;
  const region = input.region ? clip(input.region, 120) : null;
  const city = input.city ? clip(input.city, 120) : null;
  const id = cuidLike();

  try {
    await ensureCoreProductionSchema();
    const prisma = getMainPrisma();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "SitePresence" (
        "id", "visitorId", "sessionId", "path", "title", "deviceType", "userId",
        "productId", "productTitle", "cartItemCount", "cartValue", "cartCurrency", "cartSummary",
        "referrer", "utmSource", "utmCampaign", "contactEmail", "contactPhone", "country", "region", "city",
        "lastSeenAt", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13::jsonb,
        $14, $15, $16, $17, $18, $19, $20, $21,
        NOW(), NOW(), NOW()
      )
      ON CONFLICT ("visitorId") DO UPDATE SET
        "sessionId" = EXCLUDED."sessionId",
        "path" = EXCLUDED."path",
        "title" = EXCLUDED."title",
        "deviceType" = EXCLUDED."deviceType",
        "userId" = EXCLUDED."userId",
        "productId" = EXCLUDED."productId",
        "productTitle" = EXCLUDED."productTitle",
        "cartItemCount" = EXCLUDED."cartItemCount",
        "cartValue" = EXCLUDED."cartValue",
        "cartCurrency" = EXCLUDED."cartCurrency",
        "cartSummary" = EXCLUDED."cartSummary",
        "referrer" = COALESCE(EXCLUDED."referrer", "SitePresence"."referrer"),
        "utmSource" = COALESCE(EXCLUDED."utmSource", "SitePresence"."utmSource"),
        "utmCampaign" = COALESCE(EXCLUDED."utmCampaign", "SitePresence"."utmCampaign"),
        "contactEmail" = COALESCE(EXCLUDED."contactEmail", "SitePresence"."contactEmail"),
        "contactPhone" = COALESCE(EXCLUDED."contactPhone", "SitePresence"."contactPhone"),
        "country" = COALESCE(EXCLUDED."country", "SitePresence"."country"),
        "region" = COALESCE(EXCLUDED."region", "SitePresence"."region"),
        "city" = COALESCE(EXCLUDED."city", "SitePresence"."city"),
        "lastSeenAt" = NOW(),
        "updatedAt" = NOW()
      `,
      id,
      visitorId,
      sessionId,
      path,
      title,
      deviceType,
      userId,
      productId,
      productTitle,
      cartItemCount,
      cartValue,
      cartCurrency,
      cartSummary,
      referrer,
      utmSource,
      utmCampaign,
      contactEmail,
      contactPhone,
      country,
      region,
      city,
    );
    return { ok: true };
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) return { ok: false };
    throw error;
  }
}

export async function listLivePresence(withinMs = 5 * 60 * 1000): Promise<LivePresenceRow[]> {
  if (!isPostgresStoreEnabled()) return [];
  const since = new Date(Date.now() - withinMs);
  try {
    await ensureCoreProductionSchema();
    const prisma = getMainPrisma();
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        visitorId: string;
        sessionId: string;
        path: string;
        title: string | null;
        deviceType: string | null;
        userId: string | null;
        productId: string | null;
        productTitle: string | null;
        cartItemCount: number;
        cartValue: number;
        cartCurrency: string | null;
        cartSummary: unknown;
        referrer: string | null;
        utmSource: string | null;
        utmCampaign: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        country: string | null;
        region: string | null;
        city: string | null;
        lastSeenAt: Date;
      }>
    >(
      `
      SELECT
        "visitorId", "sessionId", "path", "title", "deviceType", "userId",
        "productId", "productTitle", "cartItemCount", "cartValue", "cartCurrency", "cartSummary",
        "referrer", "utmSource", "utmCampaign", "contactEmail", "contactPhone", "country", "region", "city", "lastSeenAt"
      FROM "SitePresence"
      WHERE "lastSeenAt" >= $1
      ORDER BY "lastSeenAt" DESC
      LIMIT 200
      `,
      since,
    );
    return rows
      .filter((row) => !isInternalAnalyticsPath(row.path))
      .map((row) => ({
        ...row,
        cartItemCount: Number(row.cartItemCount) || 0,
        cartValue: Number(row.cartValue) || 0,
        lastSeenAt: row.lastSeenAt instanceof Date ? row.lastSeenAt : new Date(row.lastSeenAt),
      }));
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) return [];
    throw error;
  }
}
