import { listListings } from "@/lib/api/listing-service";
import type { HomepageCmsConfig } from "@/lib/homepage/cms-types";
import type { HomepageData, HomeFeaturedAgent, HomePropertyType, HomeTrustMetric } from "@/lib/homepage/types";
import { getStore, toPublicListing } from "@/lib/store/app-store";

function resolveTrustMetrics(
  cms: HomepageCmsConfig,
  live: HomeTrustMetric[],
): HomeTrustMetric[] {
  const liveMap = new Map(live.map((m) => [m.id, m]));
  return cms.trustMetrics
    .filter((m) => m.enabled)
    .map((m) => {
      const base = liveMap.get(m.id);
      if (m.mode === "manual" && m.manualValue !== undefined) {
        return {
          id: m.id,
          label: m.label,
          value: m.manualValue,
          suffix: m.suffix,
          prefix: m.prefix,
          decimals: m.decimals,
        };
      }
      return base ?? { id: m.id, label: m.label, value: 0, suffix: m.suffix, prefix: m.prefix, decimals: m.decimals };
    });
}

function resolvePropertyTypes(
  cms: HomepageCmsConfig,
  listings: ReturnType<typeof listListings>,
  roommateCount: number,
): HomePropertyType[] {
  return cms.propertyTypes
    .filter((t) => t.enabled)
    .map((t) => {
      let count = 0;
      if (t.mode === "manual" && t.manualCount !== undefined) {
        count = t.manualCount;
      } else if (t.id === "roommates") {
        count = Math.max(roommateCount, 3);
      } else if (t.comingSoon) {
        count = 0;
      } else if (t.listingTypes?.length) {
        count = listings.filter((l) => t.listingTypes!.includes(l.type)).length;
      }
      return {
        id: t.id,
        label: t.label,
        href: t.href,
        comingSoon: t.comingSoon,
        count,
      };
    });
}

function takeWithUniqueImages<T extends { id: string; image: string }>(items: T[], limit: number) {
  const selected: T[] = [];
  const seenImages = new Set<string>();

  for (const item of items) {
    if (seenImages.has(item.image)) continue;
    selected.push(item);
    seenImages.add(item.image);
    if (selected.length >= limit) return selected;
  }

  for (const item of items) {
    if (selected.some((selectedItem) => selectedItem.id === item.id)) continue;
    selected.push(item);
    if (selected.length >= limit) break;
  }

  return selected;
}

function resolveFeaturedListings(cms: HomepageCmsConfig, listings: ReturnType<typeof listListings>) {
  if (cms.featuredListingIds.length > 0) {
    const pinnedListings = cms.featuredListingIds
      .map((id) => listings.find((l) => l.id === id))
      .filter((l): l is NonNullable<typeof l> => Boolean(l));
    const pinnedIds = new Set(pinnedListings.map((l) => l.id));
    const replacementPool = listings
      .filter((l) => !pinnedIds.has(l.id))
      .sort((a, b) => b.trustScore - a.trustScore || b.views - a.views);
    return takeWithUniqueImages([...pinnedListings, ...replacementPool], Math.min(cms.featuredListingIds.length, 6));
  }
  const flagged = listings.filter((l) => l.featured);
  const pool = flagged.length > 0 ? flagged : [...listings];
  const sorted = pool.sort((a, b) => b.trustScore - a.trustScore || b.views - a.views);
  return takeWithUniqueImages(sorted, 3);
}

function resolveFeaturedAgents(cms: HomepageCmsConfig, store: ReturnType<typeof getStore>): HomeFeaturedAgent[] {
  const activeAgents = store.listAgentProfiles().filter((p) => p.status === "ACTIVE");

  const toAgent = (profile: (typeof activeAgents)[number]): HomeFeaturedAgent => {
    const user = store.getUserById(profile.userId);
    const listingsManaged = store.listListings().filter((l) => l.ownerId === profile.userId && l.status === "ACTIVE").length;
    const app = store.listAgentApplications().find((a) => a.id === profile.applicationId);
    return {
      id: profile.id,
      name: user?.name ?? profile.agentIdCode,
      slug: profile.publicSlug,
      photoUrl: profile.photoUrl,
      level: profile.level,
      averageRating: profile.averageRating,
      ratingCount: profile.ratingCount,
      yearsExperience: profile.yearsExperience,
      province: app?.professional?.province ?? profile.areasServed[0] ?? user?.city ?? "Zimbabwe",
      responseTime: profile.averageRating >= 4.8 ? "Under 1 hour" : "Under 2 hours",
      listingsManaged,
      verified: profile.status === "ACTIVE",
    };
  };

  if (cms.featuredAgentProfileIds.length > 0) {
    return cms.featuredAgentProfileIds
      .map((id) => activeAgents.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map(toAgent)
      .slice(0, 6);
  }

  return activeAgents
    .map(toAgent)
    .sort((a, b) => b.averageRating - a.averageRating || b.listingsManaged - a.listingsManaged)
    .slice(0, 4);
}

export function getHomepageData(): HomepageData {
  const store = getStore();
  const cms = store.getHomepageCms();
  const listings = listListings({ verifiedOnly: false });
  const verifiedListings = listings.filter((l) => l.verified);
  const activeAgents = store.listAgentProfiles().filter((p) => p.status === "ACTIVE");
  const cities = new Set(listings.map((l) => l.city).filter(Boolean));
  const snapshot = store.getHomepageSnapshot();
  const allRatings = snapshot.agentRatings;
  const avgRating =
    allRatings.length > 0 ? allRatings.reduce((s, r) => s + r.overall, 0) / allRatings.length : 4.9;

  const liveTrustMetrics: HomeTrustMetric[] = [
    { id: "verified-properties", label: "Verified properties", value: verifiedListings.length },
    { id: "verified-agents", label: "Verified agents", value: activeAgents.length },
    { id: "cities", label: "Cities covered", value: Math.max(cities.size, 5) },
    { id: "buyers", label: "Active buyers", value: store.listUsers().filter((u) => u.roles.includes("SEEKER")).length },
    { id: "rentals", label: "Successful rentals", value: Math.max(snapshot.verifiedTenancyCount, 12) },
    {
      id: "customers",
      label: "Happy customers",
      value: cms.testimonials.filter((t) => t.published !== false).length + allRatings.length,
    },
    { id: "rating", label: "Average rating", value: avgRating, decimals: 1, suffix: "★" },
  ];

  const testimonials = cms.testimonials.filter((t) => t.published !== false);

  return {
    trustMetrics: resolveTrustMetrics(cms, liveTrustMetrics),
    featuredListings: resolveFeaturedListings(cms, listings),
    propertyTypes: resolvePropertyTypes(cms, listings, snapshot.roommateProfileCount),
    featuredAgents: resolveFeaturedAgents(cms, store),
    testimonials,
    content: {
      hero: cms.hero,
      finalCta: cms.finalCta,
      agentPromo: cms.agentPromo,
      banners: cms.banners.filter((b) => b.enabled),
    },
  };
}

export function getHomepageSeo() {
  return getStore().getHomepageCms().seo;
}

/** For API consumers that need raw listing conversion */
export function getFeaturedListingsFromStore(limit = 6) {
  return getStore()
    .listListings()
    .filter((l) => l.status === "ACTIVE" || l.status === "PENDING_REVIEW")
    .sort((a, b) => b.trustScore - a.trustScore)
    .slice(0, limit)
    .map(toPublicListing);
}
