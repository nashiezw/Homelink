import { ok } from "@/lib/api/response";
import { getPublicAgentFromPostgres, shouldUsePostgresAgents } from "@/lib/agents/postgres-agent-repository";
import { getStore } from "@/lib/store/app-store";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (shouldUsePostgresAgents()) {
    return ok(await getPublicAgentFromPostgres(slug));
  }
  const store = getStore();
  const profile = store.getAgentProfileBySlug(slug);
  if (!profile || profile.status !== "ACTIVE") {
    return ok(null);
  }
  const user = store.getUserById(profile.userId);
  const agency = user?.agencyId ? store.getAgency(user.agencyId) : null;
  const territories = store
    .listAgentTerritories()
    .filter((t) => profile.territoryIds.includes(t.id) || t.agentIds.includes(profile.userId));
  const listings = store.listListings().filter((l) => l.ownerId === profile.userId && l.status === "ACTIVE");

  return ok({
    profile,
    user: user
      ? {
          name: user.name,
          city: user.city,
          email: user.email,
        }
      : null,
    agency: agency
      ? {
          id: agency.id,
          name: agency.name,
          city: agency.city,
          verificationStatus: agency.verificationStatus,
        }
      : null,
    territories: territories.map((t) => ({
      id: t.id,
      name: t.name,
      province: t.province,
      city: t.city,
      suburbs: t.suburbs,
    })),
    listings: listings.map((l) => {
      const { ownerId: _o, ...pub } = l;
      return pub;
    }),
    ratings: store.listAgentRatings(profile.userId).slice(0, 10),
  });
}
