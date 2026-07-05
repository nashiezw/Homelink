import { Role } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { listAdminListingsFromPostgres } from "@/lib/listings/postgres-listing-repository";

export function shouldUsePostgresAgents() {
  return isPostgresStoreEnabled();
}

export async function getAgentDashboardFromPostgres(userId: string) {
  const prisma = getMainPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { agencyMemberships: { include: { agency: true } } },
  });
  if (!user || !user.roles.includes(Role.AGENT)) return null;
  const [leads, commissions, listings, notifications] = await Promise.all([
    prisma.agentLeadRecord.findMany({ where: { assignedAgentId: userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.agentCommissionRecord.findMany({ where: { agentId: userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    listAdminListingsFromPostgres({ includeDeleted: false }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const agentListings = listings.filter((listing) => listing.ownerId === userId);
  return {
    profile: {
      userId: user.id,
      slug: slugify(user.name),
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.accountStatus === "ACTIVE" ? "ACTIVE" : "SUSPENDED",
      agencyId: user.agencyMemberships[0]?.agencyId,
    },
    stats: {
      activeListings: agentListings.filter((l) => l.status === "ACTIVE").length,
      leads: leads.length,
      commissions: commissions.length,
      commissionValue: commissions.reduce((sum, row) => sum + Number(row.netAgentAmount), 0),
    },
    leads,
    commissions: commissions.map(commissionRow),
    training: { modules: [], progress: [] },
    appointments: [],
    tasks: [],
    wallet: [],
    ratings: [],
    notifications,
  };
}

export async function listAgentLeadsFromPostgres(agentId: string) {
  return getMainPrisma().agentLeadRecord.findMany({
    where: { assignedAgentId: agentId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateAgentLeadInPostgres(leadId: string, agentId: string, status: string, notes?: string) {
  const lead = await getMainPrisma().agentLeadRecord.findUnique({ where: { id: leadId } });
  if (!lead || lead.assignedAgentId !== agentId) return null;
  return getMainPrisma().agentLeadRecord.update({
    where: { id: leadId },
    data: { status, notes: notes ?? lead.notes },
  });
}

export async function closeAgentLeadInPostgres(leadId: string, agentId: string, type: string, dealAmount: number) {
  const prisma = getMainPrisma();
  const lead = await prisma.agentLeadRecord.findUnique({ where: { id: leadId } });
  if (!lead || lead.assignedAgentId !== agentId) return null;
  const grossAmount = Number.isFinite(dealAmount) && dealAmount > 0 ? dealAmount : 0;
  const agentAmount = grossAmount * 0.5;
  const row = await prisma.$transaction(async (tx) => {
    await tx.agentLeadRecord.update({ where: { id: leadId }, data: { status: "CLOSED_WON" } });
    return tx.agentCommissionRecord.create({
      data: {
        leadId,
        listingId: lead.listingId,
        agentId,
        agentName: lead.assignedAgentName ?? "Agent",
        type,
        dealRef: `deal_${crypto.randomUUID()}`,
        commissionPercent: 5,
        grossAmount,
        homelinkAmount: grossAmount - agentAmount,
        agentAmount,
        taxAmount: 0,
        netAgentAmount: agentAmount,
        ruleSnapshot: {},
      },
    });
  });
  return commissionRow(row);
}

export async function listAgentCommissionsFromPostgres(agentId: string) {
  const rows = await getMainPrisma().agentCommissionRecord.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(commissionRow);
}

export async function getAgencyDashboardFromPostgres(userId: string) {
  const prisma = getMainPrisma();
  const membership = await prisma.agencyAgent.findFirst({
    where: { userId },
    include: {
      agency: {
        include: {
          agents: { include: { user: true } },
          listings: {
            include: { owner: { select: { name: true } }, _count: { select: { enquiries: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });
  if (!membership) return null;
  const totalViews = membership.agency.listings.reduce((sum, listing) => sum + listing.views, 0);
  const totalEnquiries = membership.agency.listings.reduce((sum, listing) => sum + listing._count.enquiries, 0);
  const verifiedListings = membership.agency.listings.filter((listing) => Boolean(listing.verifiedAt)).length;
  return {
    agency: {
      id: membership.agency.id,
      name: membership.agency.name,
      city: membership.agency.listings[0]?.city ?? "Zimbabwe",
      verificationStatus: membership.agency.verificationStatus,
    },
    agents: membership.agency.agents.map((agent) => ({
      id: agent.userId,
      name: agent.user.name,
      email: agent.user.email,
      title: agent.title,
      listings: membership.agency.listings.filter((listing) => listing.ownerId === agent.userId).length,
      enquiries: membership.agency.listings
        .filter((listing) => listing.ownerId === agent.userId)
        .reduce((sum, listing) => sum + listing._count.enquiries, 0),
      views: membership.agency.listings
        .filter((listing) => listing.ownerId === agent.userId)
        .reduce((sum, listing) => sum + listing.views, 0),
      performanceScore: 0,
    })),
    listings: membership.agency.listings.map((listing) => ({
      id: listing.id,
      slug: listingSlug(listing.id, listing.title),
      title: listing.title,
      suburb: listing.suburb,
      city: listing.city,
      type: listing.propertyType.toLowerCase(),
      verified: Boolean(listing.verifiedAt),
      trustScore: listing.verifiedAt ? 90 : 70,
      views: listing.views,
      enquiries: listing._count.enquiries,
      status: listing.status,
      ownerName: listing.owner.name,
    })),
    totals: {
      listings: membership.agency.listings.length,
      agents: membership.agency.agents.length,
      enquiries: totalEnquiries,
      views: totalViews,
      verifiedListings,
      approvalRate: membership.agency.listings.length ? Math.round((verifiedListings / membership.agency.listings.length) * 100) : 0,
    },
  };
}

export async function inviteAgencyAgentInPostgres(agencyAdminId: string, input: { name: string; email: string }) {
  const prisma = getMainPrisma();
  const membership = await prisma.agencyAgent.findFirst({ where: { userId: agencyAdminId } });
  if (!membership) return { error: "Agency admin access required." };
  const user = await prisma.user.upsert({
    where: { email: input.email.trim().toLowerCase() },
    create: {
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      passwordHash: hashPassword(`Temp-${crypto.randomUUID()}`),
      roles: [Role.AGENT],
    },
    update: { roles: { push: Role.AGENT } },
  });
  await prisma.agencyAgent.upsert({
    where: { agencyId_userId: { agencyId: membership.agencyId, userId: user.id } },
    create: { agencyId: membership.agencyId, userId: user.id, title: "Agent" },
    update: {},
  });
  return { user };
}

export async function getPublicAgentFromPostgres(slug: string) {
  const users = await getMainPrisma().user.findMany({
    where: { roles: { has: Role.AGENT }, accountStatus: "ACTIVE" },
    include: { agencyMemberships: { include: { agency: true } }, listings: true },
  });
  const user = users.find((candidate) => slugify(candidate.name) === slug);
  if (!user) return null;
  return {
    profile: { userId: user.id, slug: slugify(user.name), name: user.name, status: "ACTIVE" },
    user: { name: user.name, phone: user.phone, email: user.email },
    agency: user.agencyMemberships[0]?.agency
      ? {
          id: user.agencyMemberships[0].agency.id,
          name: user.agencyMemberships[0].agency.name,
          verificationStatus: user.agencyMemberships[0].agency.verificationStatus,
        }
      : null,
    territories: [],
    listings: user.listings.filter((listing) => listing.status === "ACTIVE"),
    ratings: [],
  };
}

function commissionRow(row: {
  id: string;
  agentId: string;
  type: string;
  status: string;
  paymentStatus: string;
  dealRef: string;
  grossAmount: unknown;
  homelinkAmount: unknown;
  agentAmount: unknown;
  taxAmount: unknown;
  netAgentAmount: unknown;
  currency: string;
  createdAt: Date;
}) {
  return {
    ...row,
    grossAmount: Number(row.grossAmount),
    homelinkAmount: Number(row.homelinkAmount),
    agentAmount: Number(row.agentAmount),
    taxAmount: Number(row.taxAmount),
    netAgentAmount: Number(row.netAgentAmount),
    createdAt: row.createdAt.toISOString(),
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function listingSlug(id: string, title: string) {
  const suffix = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
  const base = slugify(title) || "listing";
  return suffix ? `${base}-${suffix}` : base;
}
