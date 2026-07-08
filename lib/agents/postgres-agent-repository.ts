import { Role } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  listAdminListingsFromPostgres,
  listListingsFromPostgres,
  toPublicPostgresListing,
} from "@/lib/listings/postgres-listing-repository";
import { DEFAULT_AGENT_PERMISSIONS } from "@/lib/agents/defaults";
import {
  getPostgresAgentTrainingCertificates,
  hasCompletedRequiredTraining,
  listPostgresAgentTrainingModules,
  listPostgresAgentTrainingProgress,
} from "@/lib/agents/postgres-training-repository";
import type { AgentApplication, AgentLevel, AgentProfile } from "@/lib/agents/types";

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
  const [leads, commissions, listings, notifications, trainingModules, trainingProgress, trainingCertificates] = await Promise.all([
    prisma.agentLeadRecord.findMany({ where: { assignedAgentId: userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.agentCommissionRecord.findMany({ where: { agentId: userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    listAdminListingsFromPostgres({ includeDeleted: false }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    listPostgresAgentTrainingModules(),
    listPostgresAgentTrainingProgress(userId),
    getPostgresAgentTrainingCertificates(userId),
  ]);
  const agentListings = listings.filter((listing) => listing.ownerId === userId);
  const trainingCompleted = await hasCompletedRequiredTraining(userId);
  return {
    profile: {
      userId: user.id,
      slug: slugify(user.name),
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.accountStatus === "ACTIVE" ? "ACTIVE" : "SUSPENDED",
      agencyId: user.agencyMemberships[0]?.agencyId,
      trainingCompleted,
      certificateUrl: trainingCertificates.find((certificate) => certificate.completed)?.certificateUrl,
    },
    stats: {
      activeListings: agentListings.filter((l) => l.status === "ACTIVE").length,
      leads: leads.length,
      commissions: commissions.length,
      commissionValue: commissions.reduce((sum, row) => sum + Number(row.netAgentAmount), 0),
    },
    leads,
    commissions: commissions.map(commissionRow),
    training: { modules: trainingModules, progress: trainingProgress, certificates: trainingCertificates },
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
  const prisma = getMainPrisma();
  const users = await prisma.user.findMany({
    where: { roles: { has: Role.AGENT }, accountStatus: "ACTIVE" },
    include: { agencyMemberships: { include: { agency: true } } },
  });
  const user = users.find((candidate) => slugify(candidate.name) === slug);
  if (!user) return null;
  const [trainingCompleted, applicationRecord, listings] = await Promise.all([
    hasCompletedRequiredTraining(user.id),
    prisma.agentApplicationRecord.findUnique({ where: { userId: user.id } }).catch(() => null),
    listListingsFromPostgres({ status: "ACTIVE" }),
  ]);
  const application = applicationRecord ? toPublicAgentApplication(applicationRecord) : undefined;
  const activeListings = listings.filter((listing) => listing.ownerId === user.id).map(toPublicPostgresListing);
  return {
    profile: toPublicAgentProfile(user, application, trainingCompleted),
    user: { name: user.name, email: user.email },
    agency: user.agencyMemberships[0]?.agency
      ? {
          id: user.agencyMemberships[0].agency.id,
          name: user.agencyMemberships[0].agency.name,
          city: user.agencyMemberships[0].agency.city,
          verificationStatus: user.agencyMemberships[0].agency.verificationStatus,
        }
      : null,
    territories: [],
    listings: activeListings,
    ratings: [],
  };
}

function toPublicAgentApplication(row: { id: string; userId: string; status: string; payload: unknown; createdAt: Date; updatedAt: Date }): AgentApplication {
  const payload = readObject(row.payload);
  const professional = readObject(payload.professional);
  const personal = readObject(payload.personal);
  return {
    id: row.id,
    userId: row.userId,
    status: row.status as AgentApplication["status"],
    personal: {
      fullName: stringValue(personal.fullName) ?? "",
      dateOfBirth: stringValue(personal.dateOfBirth) ?? "",
      gender: stringValue(personal.gender) ?? "",
      nationalId: stringValue(personal.nationalId) ?? "",
      passport: stringValue(personal.passport) ?? "",
      phone: stringValue(personal.phone) ?? "",
      whatsapp: stringValue(personal.whatsapp) ?? "",
      email: stringValue(personal.email) ?? "",
      residentialAddress: stringValue(personal.residentialAddress) ?? "",
    },
    professional: {
      yearsExperience: numberValue(professional.yearsExperience) ?? 0,
      currentEmployer: stringValue(professional.currentEmployer) ?? "",
      previousEmployer: stringValue(professional.previousEmployer) ?? stringValue(professional.agencyName) ?? "",
      hasDriversLicence: Boolean(professional.hasDriversLicence),
      hasOwnVehicle: Boolean(professional.hasOwnVehicle),
      city: stringValue(professional.city) ?? "Harare",
      province: stringValue(professional.province) ?? "Harare",
      areasCovered: stringArray(professional.areasCovered),
      languages: stringArray(professional.languages),
      specialisations: stringArray(professional.specialisations),
      propertyTypes: stringArray(professional.propertyTypes),
    },
    documents: readObject(payload.documents),
    banking: {
      bank: "",
      branch: "",
      accountName: "",
      accountNumber: "",
      ecocash: "",
      onemoney: "",
      innbucks: "",
    },
    references: [],
    emergencyContact: { name: "", phone: "", relationship: "" },
    declarationAccepted: true,
    termsAccepted: true,
    privacyAccepted: true,
    agentContractAccepted: Boolean(payload.agentContractAccepted),
    agentContractSignedAt: stringValue(payload.agentContractSignedAt),
    adminNotes: [],
    submittedAt: stringValue(payload.submittedAt) ?? row.createdAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPublicAgentProfile(
  user: { id: string; name: string; email: string; phone: string | null; accountStatus: string; createdAt: Date; updatedAt: Date },
  application: AgentApplication | undefined,
  trainingCompleted: boolean,
): AgentProfile {
  const professional = application?.professional;
  const areas = professional?.areasCovered?.length ? professional.areasCovered : [professional?.city || "Harare"];
  const yearsExperience = Number(professional?.yearsExperience ?? 0);
  return {
    id: `agent_profile_${user.id}`,
    userId: user.id,
    applicationId: application?.id ?? `agent_application_${user.id}`,
    agentNumber: `HLZ-AG-${user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`,
    agentIdCode: `AG-${user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`,
    qrCodeData: `homelink-agent:${user.id}`,
    level: agentLevel(yearsExperience),
    status: user.accountStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    biography: `${user.name} is a verified HomeLink Zimbabwe agent serving ${areas.join(", ")}.`,
    photoUrl: application?.documents.profilePictureUrl ?? fallbackAgentPhoto(user.name),
    areasServed: areas,
    languages: professional?.languages?.length ? professional.languages : ["English", "Shona"],
    specialisations: professional?.specialisations?.length ? professional.specialisations : ["Residential rentals", "Property sales", "Client viewings"],
    propertyTypes: professional?.propertyTypes?.length ? professional.propertyTypes : ["house", "flat", "cottage"],
    yearsExperience,
    completedDeals: 0,
    permissions: DEFAULT_AGENT_PERMISSIONS,
    territoryIds: [],
    trainingCompleted,
    certificateUrl: trainingCompleted ? "/dashboard/admin?tab=academy" : undefined,
    averageRating: 0,
    ratingCount: 0,
    publicSlug: slugify(user.name || user.email || user.id),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function agentLevel(yearsExperience: number): AgentLevel {
  if (yearsExperience >= 10) return "PLATINUM";
  if (yearsExperience >= 6) return "GOLD";
  if (yearsExperience >= 3) return "SILVER";
  return "BRONZE";
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

function readObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
}

function listingSlug(id: string, title: string) {
  const suffix = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
  const base = slugify(title) || "listing";
  return suffix ? `${base}-${suffix}` : base;
}

function fallbackAgentPhoto(name: string) {
  const slug = slugify(name);
  if (slug.includes("blessing")) return "/images/roommates/portrait-blessing.jpg";
  if (slug.includes("tendai")) return "/images/roommates/portrait-tendai.jpg";
  return "/images/roommates/portrait-member.jpg";
}
