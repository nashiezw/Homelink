import { ListingIntent, ListingStatus, Role, VerificationStatus, type Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import type { AgencySummary, AgentProfile, LandlordProfile } from "@/lib/admin/user-management-types";

type Actor = { id: string; name: string };

const USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  name: true,
  roles: true,
  accountStatus: true,
  identityStatus: true,
  phoneVerifiedAt: true,
  emailVerifiedAt: true,
  createdAt: true,
  lastLoginAt: true,
  agencyMemberships: { include: { agency: true } },
  listings: {
    include: {
      _count: { select: { enquiries: true, reports: true, reviews: true } },
    },
  },
} satisfies Prisma.UserSelect;

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

export async function listPostgresLandlords(filters?: { q?: string; status?: string }) {
  const prisma = getMainPrisma();
  const rows = await prisma.user.findMany({
    where: {
      roles: { has: Role.LANDLORD },
      ...(filters?.status && filters.status !== "ALL" ? { accountStatus: filters.status } : {}),
    },
    select: USER_SELECT,
    orderBy: { createdAt: "desc" },
  });
  const landlords = rows.map(toLandlordProfile).filter((landlord) => {
    if (!filters?.q?.trim()) return true;
    const term = filters.q.trim().toLowerCase();
    return (
      landlord.name.toLowerCase().includes(term) ||
      landlord.email.toLowerCase().includes(term) ||
      (landlord.city?.toLowerCase().includes(term) ?? false)
    );
  });
  const all = rows.map(toLandlordProfile);
  return {
    landlords,
    summary: {
      total: all.length,
      active: all.filter((landlord) => landlord.accountStatus === "ACTIVE").length,
      premium: all.filter((landlord) => landlord.premium).length,
      verified: all.filter((landlord) => landlord.verification.identity === "VERIFIED").length,
      avgPerformance: Math.round(
        all.reduce((sum, landlord) => sum + landlord.performanceScore, 0) / Math.max(1, all.length),
      ),
    },
  };
}

export async function listPostgresAgencies(includeDeleted = false) {
  const prisma = getMainPrisma();
  const [agencies, agents] = await Promise.all([
    prisma.agency.findMany({
      where: includeDeleted ? undefined : { accountStatus: { not: "DELETED" } },
      include: {
        agents: { include: { user: { select: USER_SELECT } } },
        listings: { include: { _count: { select: { enquiries: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { roles: { has: Role.AGENT } },
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const agencySummaries: AgencySummary[] = agencies.map((agency) => {
    const topAgents = agency.agents
      .map((membership) => ({
        name: membership.user.name,
        listings: membership.user.listings.length,
      }))
      .sort((a, b) => b.listings - a.listings)
      .slice(0, 3);
    const enquiryTotal = agency.listings.reduce((sum, listing) => sum + listing._count.enquiries, 0);
    const leadConversion = agency.listings.length
      ? Math.min(99, Math.round((enquiryTotal / Math.max(agency.listings.length, 1)) * 10))
      : agency.leadConversion;
    return {
      id: agency.id,
      name: agency.name,
      city: agency.city || inferCityFromListings(agency.listings),
      email: agency.email,
      phone: agency.phone,
      verificationStatus: agency.verificationStatus,
      subscriptionTier: agency.subscriptionTier,
      accountStatus: agency.accountStatus,
      agentCount: agency.agents.length,
      listingCount: agency.listings.filter((listing) => listing.status !== ListingStatus.DELETED).length,
      revenue: Number(agency.revenue),
      leadConversion,
      topAgents,
    };
  });

  const agentProfiles = agents.map(toAgentProfile);
  return {
    agencies: agencySummaries,
    agents: agentProfiles,
    summary: {
      agencies: agencySummaries.length,
      agents: agentProfiles.length,
      verifiedAgencies: agencySummaries.filter((agency) => agency.verificationStatus === "VERIFIED").length,
      suspendedAgencies: agencySummaries.filter((agency) => agency.accountStatus === "SUSPENDED").length,
      totalRevenue: agencySummaries.reduce((sum, agency) => sum + agency.revenue, 0),
    },
  };
}

export async function applyPostgresAgencyAction(
  agencyId: string,
  action: string,
  actor: Actor,
  input: { reason?: string; tier?: string; name?: string; email?: string; phone?: string; city?: string },
) {
  const prisma = getMainPrisma();
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) return null;

  const data: Prisma.AgencyUpdateInput = {};
  switch (action) {
    case "verify":
      data.verificationStatus = VerificationStatus.VERIFIED;
      break;
    case "reject":
      data.verificationStatus = VerificationStatus.REJECTED;
      break;
    case "suspend":
      data.accountStatus = "SUSPENDED";
      break;
    case "activate":
      data.accountStatus = "ACTIVE";
      break;
    case "delete":
      data.accountStatus = "DELETED";
      break;
    case "feature":
      data.subscriptionTier = "ENTERPRISE";
      break;
    case "update":
      if (typeof input.name === "string") data.name = input.name;
      if (typeof input.email === "string") data.email = input.email;
      if (typeof input.phone === "string") data.phone = input.phone;
      if (typeof input.city === "string") data.city = input.city;
      if (typeof input.tier === "string") data.subscriptionTier = input.tier;
      break;
    default:
      throw new Error(`Unknown agency action: ${action}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.agency.update({ where: { id: agencyId }, data });
    if (action === "delete") {
      await tx.agencyAgent.deleteMany({ where: { agencyId } });
      await tx.listing.updateMany({ where: { agencyId }, data: { agencyId: null } });
    }
    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        action: `AGENCY_${action.toUpperCase()}`,
        target: agencyId,
        metadata: { reason: input.reason ?? null, keys: Object.keys(data) },
      },
    });
    return row;
  });
  return {
    id: updated.id,
    name: updated.name,
    city: updated.city,
    email: updated.email,
    phone: updated.phone,
    verificationStatus: updated.verificationStatus,
    subscriptionTier: updated.subscriptionTier,
    accountStatus: updated.accountStatus,
    agentCount: 0,
    listingCount: 0,
    revenue: Number(updated.revenue),
    leadConversion: updated.leadConversion,
    topAgents: [],
  } satisfies AgencySummary;
}

function toLandlordProfile(user: AdminUserRow): LandlordProfile {
  const active = user.listings.filter((listing) => listing.status === ListingStatus.ACTIVE);
  const rented = user.listings.filter((listing) => listing.status === ListingStatus.RENTED);
  const totalViews = user.listings.reduce((sum, listing) => sum + listing.views, 0);
  const totalEnquiries = user.listings.reduce((sum, listing) => sum + listing._count.enquiries, 0);
  const complaints = user.listings.reduce((sum, listing) => sum + listing._count.reports, 0);
  const reviews = user.listings.reduce((sum, listing) => sum + listing._count.reviews, 0);
  const performanceScore = Math.min(100, 55 + active.length * 8 + reviews * 3 - complaints * 10);
  return {
    ...toPublicAdminUser(user),
    activeListings: active.length,
    rentedListings: rented.length,
    totalViews,
    totalEnquiries,
    avgResponseMin: Math.max(5, 35 - Math.floor(performanceScore / 4)),
    occupancyRate: user.listings.length ? Math.round((rented.length / user.listings.length) * 100) : 0,
    complaints,
    reviews,
    performanceScore,
  };
}

function toAgentProfile(user: AdminUserRow): AgentProfile {
  const agency = user.agencyMemberships[0]?.agency;
  const sales = user.listings.filter((listing) => listing.intent === ListingIntent.BUY).length;
  const rentals = user.listings.filter((listing) => listing.intent === ListingIntent.RENT).length;
  const enquiries = user.listings.reduce((sum, listing) => sum + listing._count.enquiries, 0);
  return {
    ...toPublicAdminUser(user),
    agencyName: agency?.name ?? "Independent",
    propertiesManaged: user.listings.length,
    sales,
    rentals,
    leadConversion: user.listings.length ? Math.min(99, Math.round((enquiries / user.listings.length) * 10)) : 0,
  };
}

function toPublicAdminUser(user: AdminUserRow) {
  const city = inferCityFromListings(user.listings);
  const agency = user.agencyMemberships[0]?.agency;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    city,
    roles: user.roles,
    accountStatus: user.accountStatus as "ACTIVE" | "SUSPENDED" | "BLOCKED" | "DELETED",
    premium: Boolean(agency && agency.subscriptionTier !== "FREE"),
    performanceScore: 70,
    warnings: 0,
    agencyId: agency?.id,
    agencyName: agency?.name,
    verification: {
      identity: user.identityStatus === "EXPIRED" ? "PENDING" : user.identityStatus,
      phone: user.phoneVerifiedAt ? "VERIFIED" as const : "PENDING" as const,
      email: user.emailVerifiedAt ? "VERIFIED" as const : "PENDING" as const,
    },
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: (user.lastLoginAt ?? user.createdAt).toISOString(),
    listingCount: user.listings.length,
    enquiryCount: user.listings.reduce((sum, listing) => sum + listing._count.enquiries, 0),
    revenue: 0,
  };
}

function inferCityFromListings(listings: Array<{ city?: string | null }>) {
  return listings.find((listing) => listing.city)?.city ?? "";
}
