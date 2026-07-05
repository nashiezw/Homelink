import { requireAdmin, requireAdminAsync } from "@/lib/admin/require-admin";
import {
  getPostgresHomepageAdminData,
  patchPostgresHomepageAgent,
  patchPostgresHomepageListing,
  savePostgresHomepageCms,
} from "@/lib/admin/postgres-admin-config";
import { broadcastPlatformNotification, type BroadcastAudience } from "@/lib/admin/broadcast";
import { ok, problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore, toPublicListing } from "@/lib/store/app-store";
import type { HomepageCmsConfig } from "@/lib/homepage/cms-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error) return auth.error;
  if (isPostgresStoreEnabled()) return ok(await getPostgresHomepageAdminData());

  const store = getStore();
  const cms = store.getHomepageCms();
  const listings = store
    .listListings()
    .filter((l) => l.status === "ACTIVE")
    .map((l) => ({
      id: l.id,
      title: l.title,
      city: l.city,
      type: l.type,
      price: l.price,
      featured: l.featured ?? false,
      verified: l.verified,
      trustScore: l.trustScore,
      image: l.image,
    }));
  const agents = store.listAgentProfiles().map((p) => ({
    id: p.id,
    userId: p.userId,
    name: store.getUserById(p.userId)?.name ?? p.agentIdCode,
    slug: p.publicSlug,
    level: p.level,
    status: p.status,
    averageRating: p.averageRating,
    pinned: cms.featuredAgentProfileIds.includes(p.id),
  }));

  return ok({
    cms,
    listings,
    agents,
    stats: {
      featuredListings: listings.filter((l) => l.featured).length,
      pinnedListings: cms.featuredListingIds.length,
      publishedTestimonials: cms.testimonials.filter((t) => t.published !== false).length,
      activeBanners: cms.banners.filter((b) => b.enabled).length,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request, "marketing:write") : requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const body = (await request.json()) as {
    cms?: Partial<HomepageCmsConfig>;
    featureListing?: { listingId: string; featured: boolean; pin?: boolean };
    pinListing?: { listingId: string; pinned: boolean };
    pinAgent?: { profileId: string; pinned: boolean };
    broadcast?: { channel?: string; subject: string; body: string; audience?: BroadcastAudience };
  };

  if (isPostgresStoreEnabled()) {
    if (body.broadcast) {
      return ok({ broadcast: { queued: true, recipients: 0, channel: body.broadcast.channel ?? "IN_APP" } });
    }
    if (body.featureListing) {
      await patchPostgresHomepageListing({
        listingId: body.featureListing.listingId,
        featured: body.featureListing.featured,
        pinned: body.featureListing.pin,
      });
      return ok({ listing: null });
    }
    if (body.pinListing) {
      await patchPostgresHomepageListing({ listingId: body.pinListing.listingId, pinned: body.pinListing.pinned });
      return ok({ featuredListingIds: (await getPostgresHomepageAdminData()).cms.featuredListingIds });
    }
    if (body.pinAgent) {
      const cms = await patchPostgresHomepageAgent(body.pinAgent);
      return ok({ featuredAgentProfileIds: cms.featuredAgentProfileIds });
    }
    if (body.cms) return ok({ cms: await savePostgresHomepageCms(body.cms) });
  }

  const store = getStore();
  const actor = { id: auth.user.id, name: auth.user.name };

  if (body.broadcast) {
    if (!body.broadcast.subject?.trim() || !body.broadcast.body?.trim()) {
      return problem(400, "INVALID_CAMPAIGN", "Campaign subject and body are required.");
    }
    const result = broadcastPlatformNotification(store, {
      channel: body.broadcast.channel ?? "IN_APP",
      subject: body.broadcast.subject,
      body: body.broadcast.body,
      audience: body.broadcast.audience ?? "all",
    });
    return ok({ broadcast: result });
  }

  if (body.featureListing) {
    const { listingId, featured, pin } = body.featureListing;
    if (featured) store.featureListing(listingId, 14, actor);
    else store.adminUnfeatureListing(listingId, actor);
    if (pin !== undefined) {
      const current = store.getHomepageCms();
      const ids = new Set(current.featuredListingIds);
      if (pin) ids.add(listingId);
      else ids.delete(listingId);
      store.updateHomepageCms({ featuredListingIds: [...ids] }, actor);
    }
    const listing = store.listListings().find((l) => l.id === listingId);
    return ok({ listing: listing ? toPublicListing(listing) : null });
  }

  if (body.pinListing) {
    const current = store.getHomepageCms();
    const ids = new Set(current.featuredListingIds);
    if (body.pinListing.pinned) ids.add(body.pinListing.listingId);
    else ids.delete(body.pinListing.listingId);
    const cmsUpdated = store.updateHomepageCms({ featuredListingIds: [...ids] }, actor);
    return ok({ featuredListingIds: cmsUpdated.featuredListingIds });
  }

  if (body.pinAgent) {
    const current = store.getHomepageCms();
    const ids = new Set(current.featuredAgentProfileIds);
    if (body.pinAgent.pinned) ids.add(body.pinAgent.profileId);
    else ids.delete(body.pinAgent.profileId);
    const cmsUpdated = store.updateHomepageCms({ featuredAgentProfileIds: [...ids] }, actor);
    return ok({ featuredAgentProfileIds: cmsUpdated.featuredAgentProfileIds });
  }

  if (body.cms) {
    const cms = store.updateHomepageCms(body.cms, actor);
    return ok({ cms });
  }

  return problem(400, "INVALID_INPUT", "No valid update payload.");
}
