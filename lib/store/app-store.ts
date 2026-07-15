import { featuredListings } from "@/lib/listings";
import { roommateMedia, roommatePortraits } from "@/lib/roommates/media";
import type { PropertyType } from "@/lib/types";
import { EnquiryPlatform } from "@/lib/enquiries/platform";
import type { CreateEnquiryInput, CreateRoommateEnquiryInput, EnquiryListFilters, EnquiryStatus } from "@/lib/enquiries/types";
import { syncEnquiryToPrisma } from "@/lib/enquiries/prisma-sync";
import { dispatchEnquiryCreatedNotifications } from "@/lib/notifications/dispatch";
import { defaultPaymentSettings, defaultPlatformSettings } from "@/lib/settings/defaults";
import { renderNotificationTemplate } from "@/lib/settings/runtime";
import { matchRoommates, matchRooms } from "@/lib/roommates/matching";
import { hashPassword } from "@/lib/auth/password";
import { getPlanPrice } from "@/lib/payments/plans";
import { isPublicListingStatus } from "@/lib/listings/status";
import * as AdminPlatform from "@/lib/store/admin-platform";
import * as PMStore from "@/lib/store/property-management-store";
import type { SubmitPMRequestInput } from "@/lib/property-management/types";
import type { ResidenceRecord, TenancyDispute, TenancyReference } from "@/lib/residence/types";
import {
  applyAddressConsent,
  confirmTenancyRecord,
  createTenancyPair,
  markTenancyDisputed,
  resolveDisputeRemoved,
  resolveDisputeUpheld,
  sanitizeResidenceRecord,
  syncPairConfirmation,
} from "@/lib/residence/tenancy-service";
import type {
  Agency,
  AuditLogEntry,
  Conversation,
  Enquiry,
  ListingRecord,
  Message,
  Notification,
  Payment,
  PublicAdminUser,
  Report,
  ReviewQueueItem,
  RoommateMatch,
  RoommateProfile,
  SavedSearch,
  StoreUser,
  UserRole,
  AccountStatus,
} from "@/lib/store/types";
import type { PaymentSettings, PlatformSettings } from "@/lib/settings/types";
import { mergePaymentSettings, mergePlatformSettings } from "@/lib/settings/merge";
import * as AgentPlatform from "@/lib/agents/platform";
import type { AgentPlatformState } from "@/lib/agents/types";
import { createDefaultHomepageCms } from "@/lib/homepage/cms-defaults";
import type { HomepageCmsConfig } from "@/lib/homepage/cms-types";
import type { HomeTestimonial } from "@/lib/homepage/types";
import { loadPersistedSettingsSync } from "@/lib/settings/persist";
import {
  loadPersistedStore,
  loadPersistedStoreSync,
  persistStoreState,
  scheduleStorePersist,
} from "@/lib/store/persist";
import { syncGeoToFlatLists } from "@/lib/settings/geo";
import { getAdminPermissions } from "@/lib/settings/rbac";
import * as HolidayPlatform from "@/lib/holiday-homes/platform";
import * as EnterpriseOps from "@/lib/admin/enterprise-ops";
import type { EnterpriseOpsState } from "@/lib/admin/enterprise-types";
import type { HolidayBookingStatus, HolidayHomeSettings } from "@/lib/holiday-homes/types";

type Session = {
  id: string;
  userId: string;
  createdAt: string;
};

const listingCoordinates: Record<string, { lat: number; lng: number }> = {
  "harare-avondale-cottage": { lat: -17.8008, lng: 31.0353 },
  "bulawayo-hillside-house": { lat: -20.17, lng: 28.58 },
  "gweru-senga-room": { lat: -19.45, lng: 29.8167 },
  "kwekwe-cbd-flat": { lat: -18.9281, lng: 29.8149 },
  "mutare-murambi-land": { lat: -18.9707, lng: 32.6709 },
  "harare-cbd-office-suite": { lat: -17.8292, lng: 31.0522 },
  "victoria-falls-riverside-lodge": { lat: -17.9243, lng: 25.8572 },
};

function fallbackListingImage(type?: PropertyType) {
  switch (type) {
    case "room":
      return roommateMedia.room;
    case "flat":
      return roommateMedia.flat2;
    case "cottage":
      return roommateMedia.cottage;
    case "house":
      return roommateMedia.room5;
    case "commercial":
      return roommateMedia.office;
    case "land":
      return roommateMedia.land;
    case "holiday_home":
      return roommateMedia.lodge;
    default:
      return roommateMedia.cottage;
  }
}

function seedListings(): ListingRecord[] {
  return featuredListings.map((listing) => {
    const coords = listingCoordinates[listing.id] ?? { lat: -17.8292, lng: 31.0522 };
    return {
      ...listing,
      ownerId: "user_seeker_tinashe",
      status: "ACTIVE",
      latitude: coords.lat,
      longitude: coords.lng,
    };
  });
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function baseUser(
  partial: Omit<StoreUser, "verification" | "accountStatus" | "premium" | "performanceScore" | "warnings" | "lastLoginAt"> &
    Partial<Pick<StoreUser, "verification" | "accountStatus" | "premium" | "performanceScore" | "warnings" | "lastLoginAt" | "city" | "agencyId">>,
): StoreUser {
  return {
    accountStatus: "ACTIVE",
    premium: false,
    performanceScore: 75,
    warnings: 0,
    lastLoginAt: hoursAgo(2),
    verification: {
      identity: "PENDING",
      phone: "PENDING",
      email: "VERIFIED",
    },
    ...partial,
  };
}

function seedPassword(envKey: string, localFallback = "HomeLink2026!") {
  return process.env[envKey] ?? localFallback;
}

function createInitialStore() {
  const primarySeekerUser = baseUser({
    id: "user_seeker_tinashe",
    email: "tinashe.dube@homelinkzim.co.zw",
    passwordHash: hashPassword(seedPassword("SEED_TINASHE_PASSWORD")),
    name: "Tinashe Dube",
    phone: "+263770000000",
    city: "Harare",
    roles: ["SEEKER", "LANDLORD"],
    verification: {
      identity: "PENDING",
      phone: "VERIFIED",
      email: "VERIFIED",
    },
    createdAt: daysAgo(120),
  });

  const landlordUser = baseUser({
    id: "user_landlord",
    email: "landlord@homelinkzim.co.zw",
    passwordHash: hashPassword(seedPassword("SEED_LANDLORD_PASSWORD", "HomeLinkOwner2026!")),
    name: "Tariro Moyo",
    phone: "+263771234567",
    city: "Harare",
    roles: ["LANDLORD"],
    premium: true,
    performanceScore: 92,
    verification: {
      identity: "VERIFIED",
      phone: "VERIFIED",
      email: "VERIFIED",
    },
    createdAt: daysAgo(200),
    lastLoginAt: hoursAgo(1),
  });

  const adminUser = baseUser({
    id: "user_admin",
    email: "admin@homelinkzim.co.zw",
    passwordHash: hashPassword(seedPassword("SEED_ADMIN_PASSWORD", "HomeLinkAdmin2026!")),
    name: "HomeLink Admin",
    phone: "+263770000001",
    city: "Harare",
    roles: ["ADMIN", "SEEKER"],
    verification: {
      identity: "VERIFIED",
      phone: "VERIFIED",
      email: "VERIFIED",
    },
    createdAt: daysAgo(365),
    lastLoginAt: hoursAgo(0.5),
  });

  const agencies: Agency[] = [
    {
      id: "ag_harare_prime",
      name: "Harare Prime Estates",
      email: "info@harareprime.co.zw",
      phone: "+263242123456",
      city: "Harare",
      verificationStatus: "VERIFIED",
      subscriptionTier: "ENTERPRISE",
      accountStatus: "ACTIVE",
      agentCount: 2,
      listingCount: 18,
      revenue: 4200,
      leadConversion: 34,
      createdAt: daysAgo(400),
    },
    {
      id: "ag_ndlovu",
      name: "Ndlovu Property Group",
      email: "contact@ndlovuproperties.co.zw",
      phone: "+263292765432",
      city: "Bulawayo",
      verificationStatus: "VERIFIED",
      subscriptionTier: "PRO",
      accountStatus: "ACTIVE",
      agentCount: 1,
      listingCount: 34,
      revenue: 6100,
      leadConversion: 41,
      createdAt: daysAgo(300),
    },
    {
      id: "ag_eastern",
      name: "Eastern Highlands Realty",
      email: "hello@easternhighlands.co.zw",
      phone: "+263206543210",
      city: "Mutare",
      verificationStatus: "PENDING",
      subscriptionTier: "FREE",
      accountStatus: "ACTIVE",
      agentCount: 1,
      listingCount: 21,
      revenue: 1800,
      leadConversion: 22,
      createdAt: daysAgo(90),
    },
  ];

  const extraUsers: StoreUser[] = [
    baseUser({
      id: "user_landlord_chipo",
      email: "chipo.nyathi@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Chipo Nyathi",
      phone: "+263772345678",
      city: "Harare",
      roles: ["LANDLORD"],
      premium: true,
      performanceScore: 88,
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(60),
    }),
    baseUser({
      id: "user_landlord_farai",
      email: "farai.dube@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Farai Dube",
      phone: "+263773456789",
      city: "Bulawayo",
      roles: ["LANDLORD"],
      accountStatus: "SUSPENDED",
      performanceScore: 45,
      warnings: 2,
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(150),
      lastLoginAt: daysAgo(14),
    }),
    baseUser({
      id: "user_landlord_grace",
      email: "grace.mutasa@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Grace Mutasa",
      phone: "+263774567890",
      city: "Gweru",
      roles: ["LANDLORD"],
      performanceScore: 62,
      warnings: 1,
      verification: { identity: "PENDING", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(30),
    }),
    baseUser({
      id: "user_agent_blessing",
      email: "blessing@harareprime.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Blessing Muzenda",
      phone: "+263775678901",
      city: "Harare",
      roles: ["AGENT"],
      agencyId: "ag_harare_prime",
      performanceScore: 91,
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(180),
    }),
    baseUser({
      id: "user_agent_rudo",
      email: "rudo@harareprime.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Rudo Chikwanha",
      phone: "+263776789012",
      city: "Harare",
      roles: ["AGENT"],
      agencyId: "ag_harare_prime",
      performanceScore: 86,
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(100),
    }),
    baseUser({
      id: "user_agent_tendai",
      email: "tendai@ndlovuproperties.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Tendai Sithole",
      phone: "+263777890123",
      city: "Bulawayo",
      roles: ["AGENT"],
      agencyId: "ag_ndlovu",
      premium: true,
      performanceScore: 94,
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(220),
    }),
    baseUser({
      id: "user_agent_kudzai",
      email: "kudzai@easternhighlands.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Kudzai Mhlanga",
      phone: "+263778901234",
      city: "Mutare",
      roles: ["AGENT"],
      agencyId: "ag_eastern",
      performanceScore: 71,
      verification: { identity: "PENDING", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(45),
    }),
    baseUser({
      id: "user_seeker_nyasha",
      email: "nyasha.m@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Nyasha Moyo",
      phone: "+263779012345",
      city: "Harare",
      roles: ["SEEKER"],
      createdAt: daysAgo(7),
      lastLoginAt: hoursAgo(3),
    }),
    baseUser({
      id: "user_seeker_tanaka",
      email: "tanaka.g@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Tanaka Gumbo",
      phone: "+263770123456",
      city: "Bulawayo",
      roles: ["SEEKER"],
      accountStatus: "BLOCKED",
      warnings: 3,
      createdAt: daysAgo(40),
      lastLoginAt: daysAgo(30),
    }),
    baseUser({
      id: "user_consultant_sarah",
      email: "sarah.consultant@homelinkzim.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_CONSULTANT_PASSWORD", "HomeLinkConsultant2026!")),
      name: "Sarah Chigwada",
      phone: "+263771111111",
      city: "Harare",
      roles: ["CONSULTANT"],
      performanceScore: 93,
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(300),
    }),
    baseUser({
      id: "user_consultant_john",
      email: "john.consultant@homelinkzim.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_CONSULTANT_PASSWORD", "HomeLinkConsultant2026!")),
      name: "John Mafukidze",
      phone: "+263772222222",
      city: "Bulawayo",
      roles: ["CONSULTANT"],
      agencyId: "ag_ndlovu",
      performanceScore: 89,
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(250),
    }),
    baseUser({
      id: "user_agency_admin_harare",
      email: "agency@harareprime.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Patience Hwachi",
      phone: "+263243333333",
      city: "Harare",
      roles: ["AGENCY_ADMIN", "LANDLORD"],
      agencyId: "ag_harare_prime",
      premium: true,
      performanceScore: 88,
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(200),
    }),
    baseUser({
      id: "user_seeker_rudo",
      email: "rudo.m@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Rudo M.",
      phone: "+263771000001",
      city: "Harare",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(14),
      lastLoginAt: hoursAgo(2),
    }),
    baseUser({
      id: "user_seeker_taku",
      email: "taku.n@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Taku N.",
      phone: "+263771000002",
      city: "Gweru",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(21),
      lastLoginAt: hoursAgo(5),
    }),
    baseUser({
      id: "user_seeker_noma",
      email: "noma.s@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Noma S.",
      phone: "+263771000003",
      city: "Bulawayo",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(10),
      lastLoginAt: hoursAgo(8),
    }),
    baseUser({
      id: "user_seeker_farai",
      email: "farai.m@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Farai T.",
      phone: "+263771000004",
      city: "Mutare",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(18),
      lastLoginAt: daysAgo(1),
    }),
    baseUser({
      id: "user_seeker_chipo",
      email: "chipo.d@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Chipo D.",
      phone: "+263771000005",
      city: "Harare",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(16),
      lastLoginAt: hoursAgo(9),
    }),
    baseUser({
      id: "user_seeker_grace",
      email: "grace.m@example.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Grace M.",
      phone: "+263771000006",
      city: "Harare",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(12),
      lastLoginAt: hoursAgo(4),
    }),
  ];

  const listings = seedListings();
  listings[0] = { ...listings[0], ownerId: "user_landlord" };
  if (listings[1]) listings[1] = { ...listings[1], ownerId: "user_landlord_chipo" };
  if (listings[2]) listings[2] = { ...listings[2], ownerId: "user_agent_tendai" };
  if (listings[3]) listings[3] = { ...listings[3], ownerId: "user_landlord_grace" };
  if (listings[4]) listings[4] = { ...listings[4], ownerId: "user_agent_kudzai" };
  if (listings[5]) listings[5] = { ...listings[5], ownerId: "user_agent_blessing" };
  if (listings[6]) listings[6] = { ...listings[6], ownerId: "user_landlord" };

  const conversationId = "conv_1";
  const now = new Date().toISOString();

  return {
    users: new Map<string, StoreUser>([
      [primarySeekerUser.id, primarySeekerUser],
      [landlordUser.id, landlordUser],
      [adminUser.id, adminUser],
      ...extraUsers.map((u) => [u.id, u] as const),
    ]),
    agencies: new Map<string, Agency>(agencies.map((a) => [a.id, a])),
    auditLog: [
      {
        id: "aud_seed_1",
        actorId: adminUser.id,
        actorName: adminUser.name,
        action: "VERIFY_LANDLORD",
        target: landlordUser.id,
        targetType: "USER",
        metadata: { email: landlordUser.email },
        ip: "196.168.1.10",
        createdAt: daysAgo(5),
      },
      {
        id: "aud_seed_2",
        actorId: adminUser.id,
        actorName: adminUser.name,
        action: "SUSPEND_USER",
        target: "user_landlord_farai",
        targetType: "USER",
        metadata: { reason: "Repeated policy violations" },
        ip: "196.168.1.10",
        createdAt: daysAgo(3),
      },
    ] as AuditLogEntry[],
    sessions: new Map<string, Session>(),
    listings,
    favourites: new Map<string, Set<string>>([[primarySeekerUser.id, new Set(["harare-avondale-cottage"])]]),
    savedSearches: [
      {
        id: "saved_harare_cottage",
        userId: primarySeekerUser.id,
        name: "Harare cottages under $500",
        channels: ["email", "whatsapp"],
        filters: { city: "Harare", type: "cottage", maxPrice: 500 },
        enabled: true,
        createdAt: now,
      },
    ] as SavedSearch[],
    enquiries: [] as Enquiry[],
    reports: [] as Report[],
    conversations: [
      {
        id: conversationId,
        listingId: "harare-avondale-cottage",
        listingTitle: listings[0].title,
        participantIds: [primarySeekerUser.id, landlordUser.id],
        participantNames: [primarySeekerUser.name, landlordUser.name],
        updatedAt: now,
      },
    ] as Conversation[],
    messages: [
      {
        id: "msg_1",
        conversationId,
        senderId: primarySeekerUser.id,
        senderName: primarySeekerUser.name,
        body: "Hi, I am interested in viewing the cottage. Is it still available?",
        createdAt: now,
      },
      {
        id: "msg_2",
        conversationId,
        senderId: landlordUser.id,
        senderName: landlordUser.name,
        body: "Yes, it is available. You can view today after 3pm.",
        createdAt: now,
      },
    ] as Message[],
    roommateProfiles: new Map<string, RoommateProfile>(),
    residenceRecords: [] as ResidenceRecord[],
    tenancyReferences: [] as TenancyReference[],
    tenancyDisputes: [
      {
        id: "dispute_1",
        tenancyId: "tenancy_seed_1",
        reportedByUserId: "user_seeker_nyasha",
        reportedByName: "Nyasha Moyo",
        reason: "Incorrect move-out date on public record",
        details: "The tenancy ended in March but the record still shows an active lease period.",
        status: "open",
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: "dispute_2",
        tenancyId: "tenancy_seed_2",
        reportedByUserId: "user_landlord_chipo",
        reportedByName: "Chipo Nhando",
        reason: "Disputed damage claim",
        details: "Tenant disputes the damage notes attached to the residence history.",
        status: "under_review",
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ] as TenancyDispute[],
    payments: [] as Payment[],
    notifications: [] as Notification[],
    reviewQueue: [
      {
        id: "review_identity_1",
        type: "IDENTITY_VERIFICATION",
        priority: "HIGH",
        title: "Landlord identity document",
        status: "OPEN",
        targetId: "user_landlord_chipo",
        targetType: "USER",
        details: [
          { label: "Submitted document", value: "National ID awaiting verification" },
          { label: "Account", value: "Chipo Nhando - landlord profile" },
          { label: "Required check", value: "View the submitted document in Verification Queue before approval." },
        ],
      },
      {
        id: "review_duplicate_1",
        type: "DUPLICATE_LISTING",
        priority: "MEDIUM",
        title: "Similar listing and phone number detected",
        status: "OPEN",
        targetId: "listing_family_home_hillside",
        targetType: "LISTING",
        details: [
          { label: "Possible duplicate", value: "Family home with borehole in Hillside" },
          { label: "Matched signal", value: "Similar title, contact phone, suburb, and exterior photo pattern" },
          { label: "Admin action", value: "Compare the listings in Listings Hub before resolving." },
        ],
      },
    ] as ReviewQueueItem[],
    pmRequests: [] as import("@/lib/property-management/types").PropertyManagementRequest[],
    crmLeads: [] as import("@/lib/property-management/types").CRMLead[],
    pmRequestCounter: 0,
    agents: AgentPlatform.createEmptyAgentPlatformState(),
    homepage: {
      cms: createDefaultHomepageCms(),
    },
    holidayHomes: HolidayPlatform.createEmptyHolidayHomeState(),
    enterpriseOps: EnterpriseOps.createEnterpriseOpsState(),
    ...AdminPlatform.seedAdminPlatformState(),
  };
}

function migrateStoreState(state: ReturnType<typeof createInitialStore>) {
  const base = createInitialStore();
  return {
    ...base,
    ...state,
    platformSettings: syncGeoToFlatLists(mergePlatformSettings(defaultPlatformSettings, state.platformSettings ?? base.platformSettings)),
    paymentSettings: mergePaymentSettings(defaultPaymentSettings, state.paymentSettings ?? base.paymentSettings),
    users: state.users ?? base.users,
    agencies: state.agencies ?? base.agencies,
    sessions: state.sessions ?? base.sessions,
    favourites: state.favourites ?? base.favourites,
    roommateProfiles: state.roommateProfiles ?? base.roommateProfiles,
    userCredits: state.userCredits ?? base.userCredits,
    userSubscriptions: state.userSubscriptions ?? base.userSubscriptions,
  };
}

function finalizeStoreState(state: ReturnType<typeof createInitialStore>, options?: { skipSeeds?: boolean }) {
  state = migrateStoreState(state);
  const persisted = loadPersistedSettingsSync();
  if (persisted) {
    state.platformSettings = syncGeoToFlatLists(persisted.platformSettings);
    state.paymentSettings = persisted.paymentSettings;
  }
  backfillSeedUsers(state);
  backfillSeedFixtures(state);
  if (!options?.skipSeeds) {
    AdminPlatform.seedPayments(state as AdminPlatform.AdminPlatformState);
    seedRoommateSeekers(state);
    seedVerifiedTenancies(state);
    seedDemoPMRequest(state);
    seedDemoHolidayBooking(state);
    const users = [...state.users.values()];
    AgentPlatform.seedAgentPlatform(state.agents, users);
  }
  return state;
}

function backfillSeedFixtures(state: ReturnType<typeof createInitialStore>) {
  if (!state.roommateProfiles.has("user_seeker_tinashe")) {
    state.roommateProfiles.set("user_seeker_tinashe", {
      id: "rm_profile_seed_tinashe",
      userId: "user_seeker_tinashe",
      lookingFor: "room",
      budgetMin: 150,
      budgetMax: 350,
      occupation: "Software developer",
      preferredLocations: ["Avondale", "Borrowdale"],
      suburb: "Avondale",
      lifestyle: "quiet",
      smoking: false,
      pets: false,
      furnished: true,
      availableNow: true,
      gender: "female",
      genderPreference: "any",
      age: 28,
      preferredAgeMin: 22,
      preferredAgeMax: 35,
      religion: "christian",
      religionPreference: "any",
      maritalStatus: "single",
      maritalStatusPreference: "any",
      householdType: "single",
      householdSize: 1,
      bio: "Software developer seeking a calm, secure home near Avondale or Borrowdale.",
      photos: [],
      active: true,
      verified: true,
      moderationStatus: "active",
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    });
  }

  if (!state.residenceRecords.some((record) => record.tenancyId === "tenancy_seed_1")) {
    const listing = state.listings.find((candidate) => candidate.id === "harare-avondale-cottage");
    if (listing) {
      const confirmedAt = daysAgo(85);
      const [landlordRec, tenantRec] = createTenancyPair({
        listingId: listing.id,
        landlordUserId: "user_landlord",
        tenantUserId: "user_seeker_tinashe",
        propertyTitle: listing.title,
        fullAddress: "12 Acacia Drive, Avondale, Harare",
        city: listing.city,
        suburb: listing.suburb,
        verificationSource: "payment",
        paymentId: "pay_seed_tenancy",
        startDate: daysAgo(90).slice(0, 10),
        notes: "Verified via HomeLink rent payment",
      });
      landlordRec.userConfirmed = true;
      landlordRec.userConfirmedAt = confirmedAt;
      tenantRec.userConfirmed = true;
      tenantRec.userConfirmedAt = confirmedAt;
      syncPairConfirmation(landlordRec, tenantRec);
      state.residenceRecords.push(landlordRec, tenantRec);
    }
  }

  if (!state.tenancyReferences.some((reference) => reference.id === "ref_seed_1")) {
    state.tenancyReferences.push({
      id: "ref_seed_1",
      tenancyId: "tenancy_seed_1",
      authorUserId: "user_landlord",
      authorName: "Tariro Moyo",
      targetUserId: "user_seeker_tinashe",
      authorRole: "landlord",
      note: "Reliable tenant - paid on time and kept the property in great condition.",
      createdAt: daysAgo(30),
    });
  }

  if (!state.agents.leads.some((lead) => lead.id === "lead_seed_rating")) {
    state.agents.leads.push({
      id: "lead_seed_rating",
      listingId: "harare-avondale-cottage",
      listingTitle: "Verified garden cottage near Avondale shops",
      clientUserId: "user_seeker_tinashe",
      clientName: "Tinashe Dube",
      clientEmail: "tinashe.dube@homelinkzim.co.zw",
      clientType: "TENANT",
      source: "LISTING_ENQUIRY",
      status: "CLOSED_WON",
      assignedAgentId: "user_agent_blessing",
      assignedAgentName: "Blessing Muzenda",
      city: "Harare",
      suburb: "Avondale",
      province: "Harare",
      notes: "Rental completed via HomeLink - please rate your agent.",
      dealRef: "deal_seed_rating",
      closedAt: daysAgo(3),
      ratingSubmitted: false,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(3),
    });
  }
}

function backfillSeedUsers(state: ReturnType<typeof createInitialStore>) {
  const users: StoreUser[] = [
    baseUser({
      id: "user_seeker_tinashe",
      email: "tinashe.dube@homelinkzim.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_TINASHE_PASSWORD")),
      name: "Tinashe Dube",
      phone: "+263770000000",
      city: "Harare",
      roles: ["SEEKER", "LANDLORD"],
      verification: { identity: "PENDING", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(120),
    }),
    baseUser({
      id: "user_seeker_rudo",
      email: "rudo.moyo@homelinkzim.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Rudo M.",
      phone: "+263772000101",
      city: "Harare",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(45),
    }),
    baseUser({
      id: "user_seeker_taku",
      email: "taku.moyo@homelinkzim.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Taku N.",
      phone: "+263772000102",
      city: "Gweru",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(40),
    }),
    baseUser({
      id: "user_seeker_noma",
      email: "noma.ncube@homelinkzim.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Noma S.",
      phone: "+263772000103",
      city: "Bulawayo",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(38),
    }),
    baseUser({
      id: "user_seeker_farai",
      email: "farai.chigwedere@homelinkzim.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Farai T.",
      phone: "+263772000104",
      city: "Mutare",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(36),
    }),
    baseUser({
      id: "user_seeker_chipo",
      email: "chipo.dube@homelinkzim.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Chipo D.",
      phone: "+263772000105",
      city: "Harare",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(34),
    }),
    baseUser({
      id: "user_seeker_grace",
      email: "grace.moyo@homelinkzim.co.zw",
      passwordHash: hashPassword(seedPassword("SEED_STANDARD_PASSWORD")),
      name: "Grace M.",
      phone: "+263772000106",
      city: "Harare",
      roles: ["SEEKER"],
      verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" },
      createdAt: daysAgo(32),
    }),
  ];

  for (const user of users) {
    if (!state.users.has(user.id)) {
      state.users.set(user.id, user);
    }
  }
}

function seedDemoPMRequest(state: ReturnType<typeof createInitialStore>) {
  if (state.pmRequests.length > 0) return;

  const pmState = {
    pmRequests: state.pmRequests,
    crmLeads: state.crmLeads,
    pmRequestCounter: state.pmRequestCounter,
    auditLog: state.auditLog,
    users: state.users,
  };

  const result = PMStore.submitRequest(
    pmState,
    {
      ownerId: "user_landlord",
      ownerName: "Tariro Moyo",
      ownerEmail: "landlord@homelinkzim.co.zw",
      ownerPhone: "+263771234567",
      propertyAddress: "12 Acacia Drive, Avondale",
      city: "Harare",
      suburb: "Avondale",
      propertyType: "cottage",
      serviceType: "full_management",
      bedrooms: 1,
      description: "Garden cottage requiring full property management — tenant sourcing, rent collection, and maintenance coordination.",
    },
    () => {},
    { id: "user_landlord", name: "Tariro Moyo" },
  );

  if (result.request) {
    PMStore.assignConsultant(pmState, result.request.id, "user_consultant_sarah", {
      id: "user_admin",
      name: "HomeLink Admin",
    });
    PMStore.setStatus(pmState, result.request.id, "IN_PROGRESS", { id: "user_consultant_sarah", name: "Sarah Chigwada" });
  }
}

function seedDemoHolidayBooking(state: ReturnType<typeof createInitialStore>) {
  if (state.holidayHomes.bookingEnquiries.length > 0) return;

  const listing = state.listings.find((l) => l.id === "victoria-falls-riverside-lodge");
  if (!listing) return;

  const checkIn = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const checkOut = new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  HolidayPlatform.createHolidayBookingEnquiry(state.holidayHomes, {
    listing,
    guestUserId: "user_seeker_tinashe",
    guestName: "Tinashe Dube",
    guestEmail: "tinashe.dube@homelinkzim.co.zw",
    guestPhone: "+263770000000",
    checkIn,
    checkOut,
    guests: 2,
    message: "Weekend getaway for two — interested in sunset cruise recommendations.",
  });
}

function seedRoommateSeekers(state: ReturnType<typeof createInitialStore>) {
  const profiles: Array<{ userId: string; suburb: string; budgetMin: number; budgetMax: number; gender: string; age: number; occupation: string; lifestyle: string; smoking: boolean; pets: boolean; bio: string; religion: string; maritalStatus: string; genderPreference: string; religionPreference: string; maritalStatusPreference: string; preferredAgeMin: number; preferredAgeMax: number; photoUrl: string; moveInDate?: string; availableNow?: boolean }> = [
    {
      userId: "user_seeker_rudo",
      suburb: "Avondale",
      budgetMin: 220,
      budgetMax: 320,
      gender: "female",
      age: 27,
      occupation: "Professional",
      lifestyle: "quiet",
      smoking: false,
      pets: false,
      bio: "Professional looking for a quiet room in Avondale. Early mornings, non-smoker, loves Wi-Fi and peaceful households.",
      religion: "christian",
      maritalStatus: "single",
      genderPreference: "any",
      religionPreference: "christian",
      maritalStatusPreference: "any",
      preferredAgeMin: 23,
      preferredAgeMax: 32,
      photoUrl: roommatePortraits.rudo,
      moveInDate: "2026-08-01",
    },
    {
      userId: "user_seeker_taku",
      suburb: "Senga",
      budgetMin: 120,
      budgetMax: 180,
      gender: "male",
      age: 22,
      occupation: "MSU student",
      lifestyle: "student",
      smoking: false,
      pets: false,
      bio: "MSU student seeking affordable shared accommodation near campus with reliable transport.",
      religion: "christian",
      maritalStatus: "single",
      genderPreference: "any",
      religionPreference: "any",
      maritalStatusPreference: "any",
      preferredAgeMin: 20,
      preferredAgeMax: 28,
      photoUrl: roommatePortraits.taku,
      availableNow: true,
    },
    {
      userId: "user_seeker_noma",
      suburb: "Hillside",
      budgetMin: 180,
      budgetMax: 260,
      gender: "female",
      age: 29,
      occupation: "Hybrid worker",
      lifestyle: "professional",
      smoking: false,
      pets: true,
      bio: "Hybrid worker with a small dog. Looking for pet-friendly Hillside accommodation with parking.",
      religion: "christian",
      maritalStatus: "single",
      genderPreference: "female",
      religionPreference: "any",
      maritalStatusPreference: "single",
      preferredAgeMin: 24,
      preferredAgeMax: 35,
      photoUrl: roommatePortraits.noma,
      moveInDate: "2026-07-15",
    },
    {
      userId: "user_seeker_chipo",
      suburb: "Belvedere",
      budgetMin: 150,
      budgetMax: 220,
      gender: "female",
      age: 24,
      occupation: "Nurse",
      lifestyle: "professional",
      smoking: false,
      pets: false,
      bio: "Nurse looking for a furnished, quiet room in Belvedere with safe parking and night-shift friendly housemates.",
      religion: "christian",
      maritalStatus: "single",
      genderPreference: "female",
      religionPreference: "any",
      maritalStatusPreference: "any",
      preferredAgeMin: 22,
      preferredAgeMax: 34,
      photoUrl: roommatePortraits.chipo,
      availableNow: true,
    },
    {
      userId: "user_seeker_farai",
      suburb: "Chikanga",
      budgetMin: 90,
      budgetMax: 140,
      gender: "male",
      age: 21,
      occupation: "Intern",
      lifestyle: "student",
      smoking: false,
      pets: false,
      bio: "Intern looking for budget-friendly shared accommodation in Chikanga with Wi-Fi and shared kitchen access.",
      religion: "christian",
      maritalStatus: "single",
      genderPreference: "any",
      religionPreference: "any",
      maritalStatusPreference: "any",
      preferredAgeMin: 18,
      preferredAgeMax: 30,
      photoUrl: roommatePortraits.farai,
      moveInDate: "2026-09-01",
    },
    {
      userId: "user_seeker_grace",
      suburb: "Borrowdale",
      budgetMin: 280,
      budgetMax: 400,
      gender: "female",
      age: 31,
      occupation: "Accountant",
      lifestyle: "professional",
      smoking: false,
      pets: false,
      bio: "Accountant looking for a secure Borrowdale house share with parking, strong security, and a calm professional household.",
      religion: "christian",
      maritalStatus: "single",
      genderPreference: "any",
      religionPreference: "any",
      maritalStatusPreference: "any",
      preferredAgeMin: 25,
      preferredAgeMax: 40,
      photoUrl: roommatePortraits.grace,
      moveInDate: "2026-08-20",
    },
  ];

  for (const p of profiles) {
    const seededProfile: RoommateProfile = {
      id: `rm_${p.userId}`,
      userId: p.userId,
      lookingFor: "roommate",
      budgetMin: p.budgetMin,
      budgetMax: p.budgetMax,
      occupation: p.occupation,
      preferredLocations: [p.suburb, state.users.get(p.userId)?.city ?? ""].filter(Boolean),
      suburb: p.suburb,
      lifestyle: p.lifestyle,
      smoking: p.smoking,
      pets: p.pets,
      furnished: true,
      availableNow: p.availableNow ?? false,
      gender: p.gender,
      genderPreference: p.genderPreference,
      age: p.age,
      preferredAgeMin: p.preferredAgeMin,
      preferredAgeMax: p.preferredAgeMax,
      religion: p.religion,
      religionPreference: p.religionPreference,
      maritalStatus: p.maritalStatus,
      maritalStatusPreference: p.maritalStatusPreference,
      householdType: "single",
      householdSize: 1,
      moveInDate: p.moveInDate,
      bio: p.bio,
      photoUrl: p.photoUrl,
      photos: [p.photoUrl],
      active: true,
      verified: true,
      moderationStatus: "active" as const,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(1),
    };
    const existing = state.roommateProfiles.get(p.userId);
    if (existing) {
      state.roommateProfiles.set(p.userId, {
        ...existing,
        photoUrl: existing.photoUrl || seededProfile.photoUrl,
        photos: existing.photos?.length ? existing.photos : seededProfile.photos,
        active: existing.active ?? true,
        verified: existing.verified ?? true,
        moderationStatus: existing.moderationStatus ?? "active",
      });
    } else {
      state.roommateProfiles.set(p.userId, seededProfile);
    }
  }
}

function seedVerifiedTenancies(state: ReturnType<typeof createInitialStore>) {
  const listing = state.listings.find((l) => l.id === "harare-avondale-cottage");
  if (!listing) return;

  const confirmedAt = daysAgo(85);
  const [landlordRec, tenantRec] = createTenancyPair({
    listingId: listing.id,
    landlordUserId: "user_landlord",
    tenantUserId: "user_seeker_tinashe",
    propertyTitle: listing.title,
    fullAddress: "12 Acacia Drive, Avondale, Harare",
    city: listing.city,
    suburb: listing.suburb,
    verificationSource: "payment",
    paymentId: "pay_seed_tenancy",
    startDate: daysAgo(90).slice(0, 10),
    notes: "Verified via HomeLink rent payment",
  });
  landlordRec.userConfirmed = true;
  landlordRec.userConfirmedAt = confirmedAt;
  tenantRec.userConfirmed = true;
  tenantRec.userConfirmedAt = confirmedAt;
  syncPairConfirmation(landlordRec, tenantRec);

  state.residenceRecords.push(landlordRec, tenantRec);
  state.tenancyReferences.push({
    id: "ref_seed_1",
    tenancyId: landlordRec.tenancyId,
    authorUserId: "user_landlord",
    authorName: "Tariro Moyo",
    targetUserId: "user_seeker_tinashe",
    authorRole: "landlord",
    note: "Reliable tenant — paid on time and kept the property in great condition.",
    createdAt: daysAgo(30),
  });

  state.roommateProfiles.set("user_seeker_tinashe", {
    id: "rm_profile_seed_tinashe",
    userId: "user_seeker_tinashe",
    lookingFor: "room",
    budgetMin: 150,
    budgetMax: 350,
    occupation: "Software developer",
    preferredLocations: ["Avondale", "Borrowdale"],
    lifestyle: "quiet",
    smoking: false,
    pets: false,
    furnished: true,
    availableNow: true,
    gender: "female",
    genderPreference: "any",
    age: 28,
    preferredAgeMin: 22,
    preferredAgeMax: 35,
    religion: "christian",
    religionPreference: "any",
    maritalStatus: "single",
    maritalStatusPreference: "any",
    householdType: "single",
    householdSize: 1,
    bio: "Looking for a quiet room near the city.",
    active: true,
    suburb: "Avondale",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(5),
  });
}

type StoreState = ReturnType<typeof createInitialStore>;

export type { StoreState };

class AppStore {
  private state: StoreState;

  constructor(initialState?: StoreState) {
    this.state = initialState
      ? finalizeStoreState(initialState, { skipSeeds: true })
      : finalizeStoreState(createInitialStore());
  }

  markDirty() {
    if (isStrictProduction() && !globalStore.__homelinkStoreHydrated) {
      globalStore.__homelinkStorePersistPending = true;
      return;
    }
    scheduleStorePersist(this.state, STORE_VERSION);
  }

  async flushPersistence() {
    if (isStrictProduction() && !globalStore.__homelinkStoreHydrated) {
      await globalStore.__homelinkStoreHydratePromise;
    }
    await persistStoreState(this.state, STORE_VERSION);
  }

  private touch() {
    this.markDirty();
  }

  private persistResult<T>(result: T) {
    this.touch();
    return result;
  }

  private adminState() {
    return this.state as unknown as AdminPlatform.AdminPlatformState;
  }

  private pmState() {
    return this.state as unknown as PMStore.PMStoreState;
  }

  private pmNotify(userId: string, channels: Array<{ channel: string; subject: string; body: string }>) {
    for (const n of channels) {
      this.createNotification(userId, n);
    }
  }

  getSession(sessionId: string) {
    return this.state.sessions.get(sessionId) ?? null;
  }

  createSession(userId: string) {
    const session: Session = {
      id: `sess_${crypto.randomUUID()}`,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.state.sessions.set(session.id, session);
    this.touch();
    return session;
  }

  deleteSession(sessionId: string) {
    if (this.state.sessions.delete(sessionId)) {
      this.touch();
    }
  }

  getUserById(id: string) {
    return this.state.users.get(id) ?? null;
  }

  getUserByEmail(email: string) {
    const normalized = email.toLowerCase().trim();
    for (const user of this.state.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  createUser(input: { email: string; passwordHash: string; name: string; phone?: string; city?: string }) {
    const user = baseUser({
      id: `user_${crypto.randomUUID()}`,
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
      name: input.name.trim(),
      phone: input.phone,
      city: input.city,
      roles: ["SEEKER"],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
    this.state.users.set(user.id, user);
    this.state.favourites.set(user.id, new Set());
    this.createNotification(user.id, {
      channel: "email",
      subject: "Welcome",
      body: "",
      templateKey: "welcome",
      templateVars: { name: user.name },
    });
    return user;
  }

  recordLogin(userId: string) {
    const user = this.getUserById(userId);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      this.touch();
    }
  }

  publicUser(user: StoreUser) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      accountStatus: user.accountStatus,
      verification: user.verification,
    };
  }

  getAgency(id: string) {
    return this.state.agencies.get(id) ?? null;
  }

  listAgencies(includeDeleted = false) {
    return [...this.state.agencies.values()]
      .filter((agency) => includeDeleted || agency.accountStatus !== "DELETED")
      .map((agency) => {
      const agents = [...this.state.users.values()].filter((u) => u.agencyId === agency.id);
      const agentListings = this.state.listings.filter((l) =>
        agents.some((a) => a.id === l.ownerId),
      );
      return {
        ...agency,
        accountStatus: agency.accountStatus ?? "ACTIVE",
        agentCount: agents.length,
        listingCount: agentListings.length,
        topAgents: agents
          .map((agent) => ({
            name: agent.name,
            listings: this.state.listings.filter((l) => l.ownerId === agent.id).length,
          }))
          .sort((a, b) => b.listings - a.listings)
          .slice(0, 3),
      };
    });
  }

  toPublicAdminUser(user: StoreUser): PublicAdminUser {
    const agency = user.agencyId ? this.getAgency(user.agencyId) : null;
    const userListings = this.state.listings.filter((l) => l.ownerId === user.id);
    const userPayments = this.state.payments.filter(
      (p) => p.userId === user.id && p.status === "PAID",
    );
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      roles: user.roles,
      accountStatus: user.accountStatus,
      premium: user.premium,
      performanceScore: user.performanceScore,
      warnings: user.warnings,
      agencyId: user.agencyId,
      agencyName: agency?.name,
      verification: user.verification,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      listingCount: userListings.length,
      enquiryCount: userListings.reduce((sum, l) => sum + l.enquiries, 0),
      revenue: userPayments.reduce((sum, p) => sum + p.amount, 0),
    };
  }

  listUsers(filters?: { role?: UserRole | "ALL"; status?: AccountStatus | "ALL"; q?: string }) {
    let users = [...this.state.users.values()];
    if (filters?.role && filters.role !== "ALL") {
      users = users.filter((u) => u.roles.includes(filters.role as UserRole));
    }
    if (filters?.status && filters.status !== "ALL") {
      users = users.filter((u) => u.accountStatus === filters.status);
    }
    if (filters?.q?.trim()) {
      const q = filters.q.toLowerCase().trim();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone?.includes(q) ?? false) ||
          (u.city?.toLowerCase().includes(q) ?? false),
      );
    }
    return users
      .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
      .map((u) => this.toPublicAdminUser(u));
  }

  listLandlords() {
    return this.listUsers({ role: "LANDLORD" }).map((user) => {
      const listings = this.state.listings.filter((l) => l.ownerId === user.id);
      const active = listings.filter((l) => l.status === "ACTIVE");
      const rented = listings.filter((l) => l.status === "RENTED");
      const totalViews = listings.reduce((s, l) => s + l.views, 0);
      const totalEnquiries = listings.reduce((s, l) => s + l.enquiries, 0);
      const reports = this.state.reports.filter((r) => r.listingId && listings.some((l) => l.id === r.listingId));
      return {
        ...user,
        activeListings: active.length,
        rentedListings: rented.length,
        totalViews,
        totalEnquiries,
        avgResponseMin: Math.max(5, 30 - Math.floor(user.performanceScore / 4)),
        occupancyRate: listings.length ? Math.round((rented.length / listings.length) * 100) : 0,
        complaints: reports.filter((r) => r.status === "OPEN").length,
        reviews: Math.floor(user.performanceScore / 10),
      };
    });
  }

  listAgents() {
    return this.listUsers({ role: "AGENT" }).map((user) => {
      const listings = this.state.listings.filter((l) => l.ownerId === user.id);
      return {
        ...user,
        agencyName: user.agencyName ?? "Independent",
        propertiesManaged: listings.length,
        sales: listings.filter((l) => l.type === "house" || l.type === "land").length,
        rentals: listings.filter((l) => l.type !== "house" && l.type !== "land").length,
        leadConversion: Math.min(99, user.performanceScore),
      };
    });
  }

  recordAudit(entry: Omit<AuditLogEntry, "id" | "createdAt">) {
    const log: AuditLogEntry = {
      ...entry,
      id: `aud_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    this.state.auditLog.unshift(log);
    this.touch();
    return log;
  }

  getAuditLog(limit = 50) {
    return this.state.auditLog.slice(0, limit);
  }

  updateUser(
    userId: string,
    updates: Partial<Pick<StoreUser, "name" | "phone" | "city" | "premium" | "performanceScore" | "warnings" | "accountStatus" | "roles" | "verification" | "agencyId">>,
    actor: { id: string; name: string },
    options?: { ip?: string; skipAudit?: boolean },
  ) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const before = { accountStatus: user.accountStatus, roles: [...user.roles], premium: user.premium };
    Object.assign(user, updates);
    if (!options?.skipAudit) {
      this.recordAudit({
        actorId: actor.id,
        actorName: actor.name,
        action: "UPDATE_USER",
        target: userId,
        targetType: "USER",
        metadata: { before, after: updates },
        ip: options?.ip ?? "127.0.0.1",
      });
    }
    return user;
  }

  suspendUser(userId: string, actor: { id: string; name: string }, reason?: string) {
    const user = this.updateUser(userId, { accountStatus: "SUSPENDED" }, actor, { skipAudit: true });
    if (user) {
      this.recordAudit({
        actorId: actor.id,
        actorName: actor.name,
        action: "SUSPEND_USER",
        target: userId,
        targetType: "USER",
        metadata: { reason },
        ip: "127.0.0.1",
      });
    }
    return user;
  }

  blockUser(userId: string, actor: { id: string; name: string }, reason?: string) {
    const user = this.updateUser(userId, { accountStatus: "BLOCKED" }, actor, { skipAudit: true });
    if (user) {
      this.recordAudit({
        actorId: actor.id,
        actorName: actor.name,
        action: "BLOCK_USER",
        target: userId,
        targetType: "USER",
        metadata: { reason },
        ip: "127.0.0.1",
      });
    }
    return user;
  }

  activateUser(userId: string, actor: { id: string; name: string }) {
    const user = this.updateUser(userId, { accountStatus: "ACTIVE" }, actor, { skipAudit: true });
    if (user) {
      this.recordAudit({
        actorId: actor.id,
        actorName: actor.name,
        action: "ACTIVATE_USER",
        target: userId,
        targetType: "USER",
        metadata: {},
        ip: "127.0.0.1",
      });
    }
    return user;
  }

  assignRole(userId: string, role: UserRole, actor: { id: string; name: string }) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const roles = user.roles.includes(role) ? user.roles : [...user.roles, role];
    return this.updateUser(userId, { roles }, actor);
  }

  removeRole(userId: string, role: UserRole, actor: { id: string; name: string }) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const roles = user.roles.filter((r) => r !== role);
    if (roles.length === 0) roles.push("SEEKER");
    return this.updateUser(userId, { roles }, actor);
  }

  verifyLandlord(userId: string, actor: { id: string; name: string }) {
    const user = this.updateUser(
      userId,
      { verification: { identity: "VERIFIED", phone: "VERIFIED", email: "VERIFIED" } },
      actor,
      { skipAudit: true },
    );
    if (user) {
      this.recordAudit({
        actorId: actor.id,
        actorName: actor.name,
        action: "VERIFY_LANDLORD",
        target: userId,
        targetType: "USER",
        metadata: {},
        ip: "127.0.0.1",
      });
    }
    return user;
  }

  warnUser(userId: string, actor: { id: string; name: string }, reason?: string) {
    const user = this.getUserById(userId);
    if (!user) return null;
    user.warnings += 1;
    this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      action: "WARN_USER",
      target: userId,
      targetType: "USER",
      metadata: { reason, warnings: user.warnings },
      ip: "127.0.0.1",
    });
    return user;
  }

  setPremium(userId: string, premium: boolean, actor: { id: string; name: string }) {
    return this.updateUser(userId, { premium }, actor);
  }

  listListings() {
    return [...this.state.listings];
  }

  getListing(id: string) {
    return this.state.listings.find((listing) => listing.id === id) ?? null;
  }

  updateListing(id: string, updates: Partial<ListingRecord>) {
    const index = this.state.listings.findIndex((listing) => listing.id === id);
    if (index === -1) {
      return null;
    }
    const current = this.state.listings[index];
    const type = updates.type ?? current.type;
    const isHoliday = type === "holiday_home";
    const holidayHome = isHoliday
      ? HolidayPlatform.normalizeHolidayHomeDetails(
          updates.holidayHome ?? current.holidayHome,
          updates.price ?? current.price,
        )
      : updates.holidayHome ?? current.holidayHome;
    const price = isHoliday ? (holidayHome?.nightlyRate ?? updates.price ?? current.price) : (updates.price ?? current.price);

    this.state.listings[index] = {
      ...current,
      ...updates,
      id,
      type,
      price,
      holidayHome,
      intent: isHoliday ? "rent" : (updates.intent ?? current.intent),
    };
    this.touch();
    return this.state.listings[index];
  }

  createListing(input: Partial<ListingRecord>, ownerId: string) {
    const owner = this.getUserById(ownerId);
    const isHoliday = input.type === "holiday_home";
    const fallbackImage = fallbackListingImage(input.type);
    const holidayHome = isHoliday
      ? HolidayPlatform.normalizeHolidayHomeDetails(input.holidayHome, input.price ?? 0)
      : input.holidayHome;
    const nightlyRate = holidayHome?.nightlyRate ?? input.price ?? 0;
    const isAgent = Boolean(owner?.roles?.includes("AGENT"));
    const leadSource = isAgent ? ((input.leadSource as "HOMELINK" | "AGENT" | undefined) ?? "HOMELINK") : (input.leadSource as "HOMELINK" | "AGENT" | undefined);
    const ownerEmail = input.propertyOwnerEmail?.trim().toLowerCase();
    const ownerPhone = input.propertyOwnerPhone?.trim();
    const duplicateOwner = leadSource === "AGENT"
      ? this.state.listings.find((listing) => {
          const existingEmail = listing.propertyOwnerEmail?.trim().toLowerCase();
          const existingPhone = listing.propertyOwnerPhone?.trim();
          return (
            (ownerEmail && existingEmail && ownerEmail === existingEmail) ||
            (ownerPhone && existingPhone && ownerPhone === existingPhone)
          );
        })
      : undefined;

    const listing: ListingRecord = {
      id: `listing_${crypto.randomUUID()}`,
      title: input.title ?? "New listing",
      city: input.city ?? "Harare",
      suburb: input.suburb ?? "CBD",
      price: isHoliday ? nightlyRate : (input.price ?? 0),
      currency: "USD",
      intent: isHoliday ? "rent" : (input.intent ?? "rent"),
      type: input.type ?? "room",
      bedrooms: input.bedrooms ?? 1,
      bathrooms: input.bathrooms ?? 1,
      image: input.image ?? input.images?.[0] ?? fallbackImage,
      images: input.images?.length ? input.images : input.image ? [input.image] : [fallbackImage],
      videos: input.videos ?? [],
      verified: false,
      availableFrom: input.availableFrom ?? "Available now",
      amenities: input.amenities ?? [],
      description: input.description ?? "",
      landlordName: input.landlordName ?? owner?.name ?? "Landlord",
      landlordVerified: false,
      phone: input.phone ?? owner?.phone ?? "",
      whatsapp: input.whatsapp ?? owner?.phone ?? "",
      distanceToCbdKm: input.distanceToCbdKm ?? 5,
      nearby: input.nearby ?? [],
      views: 0,
      saves: 0,
      enquiries: 0,
      trustScore: 70,
      highlight: input.highlight ?? (isHoliday ? "Holiday home" : "New listing"),
      listingDetails: input.listingDetails,
      tenantPreferences: input.tenantPreferences,
      holidayHome,
      ownerId,
      status: input.status ?? "PENDING_REVIEW",
      latitude: input.latitude ?? -17.8292,
      longitude: input.longitude ?? 31.0522,
      leadSource,
      leadCreatedById: ownerId,
      assignedAgentId: isAgent ? ownerId : input.assignedAgentId,
      propertyOwnerName: input.propertyOwnerName ?? input.landlordName ?? owner?.name,
      propertyOwnerEmail: input.propertyOwnerEmail,
      propertyOwnerPhone: input.propertyOwnerPhone ?? input.phone ?? owner?.phone,
      duplicateOwnerReviewStatus: duplicateOwner ? "PENDING_ADMIN_REVIEW" : "NOT_REQUIRED",
      duplicateOwnerMatchId: duplicateOwner?.id,
      ownerAgreementAccepted: Boolean(input.ownerAgreementAccepted),
      ownerAgreementSignedAt: input.ownerAgreementAccepted ? (input.ownerAgreementSignedAt ?? new Date().toISOString()) : undefined,
      ownerAgreementSignerName: input.ownerAgreementSignerName,
      ownerAgreementVersion: input.ownerAgreementAccepted ? input.ownerAgreementVersion : undefined,
    };
    this.state.listings.unshift(listing);
    this.state.reviewQueue.unshift({
      id: `review_${listing.id}`,
      type: "NEW_LISTING",
      priority: duplicateOwner ? "HIGH" : "MEDIUM",
      title: `Review: ${listing.title}`,
      status: "OPEN",
      targetId: listing.id,
      targetType: "LISTING",
      details: [
        { label: "Lead source", value: listing.leadSource ?? "HOMELINK" },
        { label: "Assigned agent", value: listing.assignedAgentId ? owner?.name ?? listing.assignedAgentId : "HomeLink" },
        { label: "Owner", value: listing.propertyOwnerName ?? listing.landlordName },
        ...(duplicateOwner ? [{ label: "Owner match", value: `${duplicateOwner.title} (${duplicateOwner.id})` }] : []),
      ],
    });
    if (isAgent) {
      const now = new Date().toISOString();
      this.state.agents.leads.unshift({
        id: `lead_${crypto.randomUUID()}`,
        listingId: listing.id,
        listingTitle: listing.title,
        clientName: listing.propertyOwnerName ?? listing.landlordName,
        clientEmail: listing.propertyOwnerEmail,
        clientPhone: listing.propertyOwnerPhone,
        clientType: "LANDLORD",
        source: leadSource === "AGENT" ? "AGENT_PROSPECTING" : "HOMELINK_WEBSITE",
        leadSource: leadSource ?? "HOMELINK",
        acquisitionChannel: leadSource === "AGENT" ? "AGENT_PROSPECTING" : "HOMELINK_WEBSITE",
        status: duplicateOwner ? "NEW" : "ASSIGNED",
        createdById: ownerId,
        createdByName: owner?.name,
        assignedAgentId: ownerId,
        assignedAgentName: owner?.name,
        propertyOwnerName: listing.propertyOwnerName,
        propertyOwnerEmail: listing.propertyOwnerEmail,
        propertyOwnerPhone: listing.propertyOwnerPhone,
        ownershipLocked: true,
        duplicateOwnerReview: {
          status: duplicateOwner ? "PENDING_ADMIN_REVIEW" : "NOT_REQUIRED",
          matchedListingId: duplicateOwner?.id,
          reason: duplicateOwner ? "Possible existing HomeLink owner. Admin review required before ownership is confirmed." : undefined,
        },
        city: listing.city,
        suburb: listing.suburb,
        notes: duplicateOwner
          ? "Agent-sourced listing is awaiting admin ownership review because the owner appears to already exist."
          : "Agent-created listing lead.",
        createdAt: now,
        updatedAt: now,
      });
    }
    this.touch();
    return listing;
  }

  markListingRented(id: string, tenantUserId?: string, fullAddress?: string) {
    const listing = this.getListing(id);
    if (!listing) return null;
    const updated = this.updateListing(id, { status: "RENTED", availableFrom: "Rented" });

    if (tenantUserId) {
      this.createTenancy({
        listingId: listing.id,
        landlordUserId: listing.ownerId,
        tenantUserId,
        propertyTitle: listing.title,
        fullAddress: fullAddress ?? `${listing.suburb}, ${listing.city}`,
        city: listing.city,
        suburb: listing.suburb,
        tenantRole: listing.type === "room" ? "roommate" : "tenant",
        landlordRole: listing.type === "room" ? "landlord" : "owner",
        verificationSource: "manual",
        notes: "Marked as rented — awaiting mutual confirmation (unverified until payment or lease)",
      });
      this.notifyTenancyParties(tenantUserId, listing.ownerId, listing.title);
    }

    return updated;
  }

  createTenancy(input: Parameters<typeof createTenancyPair>[0]) {
    const [landlordRecord, tenantRecord] = createTenancyPair(input);
    this.state.residenceRecords.unshift(tenantRecord, landlordRecord);
    this.touch();
    return { tenancyId: landlordRecord.tenancyId, landlordRecord, tenantRecord };
  }

  getTenancyRecords(tenancyId: string) {
    return this.state.residenceRecords.filter((r) => r.tenancyId === tenancyId);
  }

  getResidenceRecord(id: string) {
    return this.state.residenceRecords.find((r) => r.id === id) ?? null;
  }

  getUserRecordForTenancy(tenancyId: string, userId: string) {
    return this.state.residenceRecords.find((r) => r.tenancyId === tenancyId && r.userId === userId) ?? null;
  }

  confirmTenancy(tenancyId: string, userId: string) {
    const records = this.getTenancyRecords(tenancyId);
    const mine = records.find((r) => r.userId === userId);
    const theirs = records.find((r) => r.userId !== userId);
    if (!mine || !theirs) return null;
    confirmTenancyRecord(mine, theirs);
    this.touch();
    return { records: this.getTenancyRecords(tenancyId) };
  }

  setTenancyAddressConsent(tenancyId: string, userId: string, consent: boolean) {
    const records = this.getTenancyRecords(tenancyId);
    const mine = records.find((r) => r.userId === userId);
    const theirs = records.find((r) => r.userId !== userId);
    if (!mine || !theirs) return null;
    applyAddressConsent(mine, theirs, consent);
    this.touch();
    return { records: this.getTenancyRecords(tenancyId) };
  }

  addTenancyReference(
    tenancyId: string,
    authorUserId: string,
    input: { note: string; rating?: number; targetUserId?: string },
  ) {
    const records = this.getTenancyRecords(tenancyId);
    const mine = records.find((r) => r.userId === authorUserId);
    if (!mine) return null;
    const author = this.getUserById(authorUserId);
    const targetUserId = input.targetUserId ?? mine.counterpartyUserId;
    const ref: TenancyReference = {
      id: `ref_${crypto.randomUUID()}`,
      tenancyId,
      authorUserId,
      authorName: author?.name ?? "User",
      targetUserId,
      authorRole: mine.role,
      note: input.note,
      rating: input.rating,
      createdAt: new Date().toISOString(),
    };
    this.state.tenancyReferences.unshift(ref);
    this.touch();
    return ref;
  }

  addTenancyDispute(tenancyId: string, reportedByUserId: string, reason: string, details: string) {
    const records = this.getTenancyRecords(tenancyId);
    const mine = records.find((r) => r.userId === reportedByUserId);
    if (!mine) return null;
    const reporter = this.getUserById(reportedByUserId);
    const dispute: TenancyDispute = {
      id: `disp_${crypto.randomUUID()}`,
      tenancyId,
      reportedByUserId,
      reportedByName: reporter?.name ?? "User",
      reason,
      details,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    this.state.tenancyDisputes.unshift(dispute);
    markTenancyDisputed(records);
    if (mine.counterpartyUserId) {
      this.pmNotify(mine.counterpartyUserId, [
        {
          channel: "email",
          subject: "Tenancy record disputed",
          body: `A stay record for ${mine.suburb}, ${mine.city} has been disputed and is under review.`,
        },
      ]);
    }
    this.touch();
    return dispute;
  }

  resolveTenancyDispute(disputeId: string, resolution: "upheld" | "removed", adminId: string, adminNote?: string) {
    const dispute = this.state.tenancyDisputes.find((d) => d.id === disputeId);
    if (!dispute) return null;
    const records = this.getTenancyRecords(dispute.tenancyId);
    dispute.status = resolution === "upheld" ? "resolved_upheld" : "resolved_removed";
    dispute.resolvedAt = new Date().toISOString();
    dispute.resolvedBy = adminId;
    dispute.adminNote = adminNote;
    if (resolution === "removed") resolveDisputeRemoved(records);
    else resolveDisputeUpheld(records);
    this.touch();
    return dispute;
  }

  listTenancyReferences(tenancyId: string) {
    return this.state.tenancyReferences.filter((r) => r.tenancyId === tenancyId);
  }

  listTenancyDisputesForTenancy(tenancyId: string) {
    return this.state.tenancyDisputes.filter((d) => d.tenancyId === tenancyId);
  }

  getTenancyDetail(tenancyId: string, userId: string) {
    const records = this.getTenancyRecords(tenancyId);
    if (!records.some((r) => r.userId === userId)) return null;
    const references = this.listTenancyReferences(tenancyId);
    const disputes = this.listTenancyDisputesForTenancy(tenancyId);
    return {
      tenancyId,
      records: records.map((r) => this.sanitizeResidenceForViewer(r, userId, references, disputes)),
      references,
      disputes,
    };
  }

  listTenancyDisputes(status?: TenancyDispute["status"] | "open") {
    if (status === "open") {
      return this.state.tenancyDisputes.filter((d) => d.status === "open" || d.status === "under_review");
    }
    return status
      ? this.state.tenancyDisputes.filter((d) => d.status === status)
      : this.state.tenancyDisputes;
  }

  listUserTenancies(userId: string) {
    const records = this.state.residenceRecords.filter((r) => r.userId === userId);
    const tenancyIds = [...new Set(records.map((r) => r.tenancyId))];
    return tenancyIds.map((tenancyId) => {
      const pair = this.getTenancyRecords(tenancyId);
      const mine = pair.find((r) => r.userId === userId)!;
      const counterparty = mine.counterpartyUserId ? this.getUserById(mine.counterpartyUserId) : null;
      const references = this.state.tenancyReferences.filter((r) => r.tenancyId === tenancyId);
      const disputes = this.state.tenancyDisputes.filter((d) => d.tenancyId === tenancyId);
      return {
        tenancyId,
        record: this.sanitizeResidenceForViewer(mine, userId, references, disputes),
        counterparty: counterparty ? { id: counterparty.id, name: counterparty.name } : null,
        needsMyConfirmation: Boolean(mine.counterpartyUserId) && !mine.userConfirmed && mine.status !== "rejected",
        needsAddressConsent: !mine.userAddressConsent,
        references,
        disputes,
      };
    });
  }

  onTenancyPaymentCompleted(payment: import("@/lib/store/types").Payment) {
    if (!payment.listingId || !payment.tenantUserId || !payment.landlordUserId) return null;
    const listing = this.getListing(payment.listingId);
    if (!listing) return null;

    const existing = this.state.residenceRecords.find(
      (r) =>
        r.listingId === payment.listingId &&
        r.userId === payment.tenantUserId &&
        r.verificationSource === "payment" &&
        r.status !== "rejected",
    );
    if (existing) {
      const pair = this.getTenancyRecords(existing.tenancyId);
      for (const r of pair) {
        r.paymentId = payment.id;
        if (r.userId === payment.tenantUserId) {
          r.userConfirmed = true;
          r.userConfirmedAt = new Date().toISOString();
        }
      }
      syncPairConfirmation(pair[0], pair[1]);
      this.touch();
      return pair;
    }

    const result = this.createTenancy({
      listingId: payment.listingId,
      landlordUserId: payment.landlordUserId,
      tenantUserId: payment.tenantUserId,
      propertyTitle: listing.title,
      fullAddress: `${listing.suburb}, ${listing.city}`,
      city: listing.city,
      suburb: listing.suburb,
      tenantRole: listing.type === "room" ? "roommate" : "tenant",
      verificationSource: "payment",
      paymentId: payment.id,
      notes: `Rent/deposit paid via HomeLink (${payment.receiptNumber ?? payment.id})`,
    });
    const tenantRecord = result.tenantRecord;
    tenantRecord.userConfirmed = true;
    tenantRecord.userConfirmedAt = new Date().toISOString();
    syncPairConfirmation(result.landlordRecord, tenantRecord);
    this.touch();
    this.notifyTenancyParties(payment.tenantUserId, payment.landlordUserId, listing.title);
    return [result.landlordRecord, tenantRecord];
  }

  signTenancyLease(input: {
    listingId: string;
    landlordUserId: string;
    tenantUserId: string;
    fullAddress: string;
    startDate?: string;
    signedByUserId: string;
  }) {
    const listing = this.getListing(input.listingId);
    if (!listing) return null;
    const leaseSignedAt = new Date().toISOString();
    const result = this.createTenancy({
      listingId: input.listingId,
      landlordUserId: input.landlordUserId,
      tenantUserId: input.tenantUserId,
      propertyTitle: listing.title,
      fullAddress: input.fullAddress,
      city: listing.city,
      suburb: listing.suburb,
      tenantRole: listing.type === "room" ? "roommate" : "tenant",
      verificationSource: "lease",
      leaseSignedAt,
      startDate: input.startDate,
      notes: "Lease signed digitally on HomeLink",
    });
    this.confirmTenancy(result.tenancyId, input.signedByUserId);
    this.notifyTenancyParties(input.tenantUserId, input.landlordUserId, listing.title);
    return result;
  }

  notifyTenancyParties(tenantUserId: string, landlordUserId: string, propertyTitle: string) {
    const msg = {
      channel: "email" as const,
      subject: "Confirm your tenancy on HomeLink",
      body: `Please confirm your stay at "${propertyTitle}" so it can appear on your verified history.`,
    };
    this.createNotification(tenantUserId, msg);
    this.createNotification(landlordUserId, msg);
  }

  addManualResidenceHistory(
    userId: string,
    input: {
      propertyTitle: string;
      city: string;
      suburb: string;
      role: ResidenceRecord["role"];
      startDate: string;
      endDate?: string;
      visibility?: ResidenceRecord["visibility"];
      notes?: string;
    },
  ) {
    const record: ResidenceRecord = {
      id: `res_${crypto.randomUUID()}`,
      tenancyId: `ten_manual_${crypto.randomUUID()}`,
      userId,
      counterpartyUserId: "",
      propertyTitle: input.propertyTitle,
      fullAddress: `${input.suburb}, ${input.city}`,
      city: input.city,
      suburb: input.suburb,
      role: input.role,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "active",
      verificationSource: "manual",
      userConfirmed: true,
      counterpartyConfirmed: false,
      verified: false,
      userAddressConsent: false,
      counterpartyAddressConsent: false,
      visibility: input.visibility ?? "public",
      createdAt: new Date().toISOString(),
      notes: input.notes ?? "Self-reported — not verified",
    };
    this.state.residenceRecords.unshift(record);
    this.touch();
    return record;
  }

  sanitizeResidenceForViewer(
    record: ResidenceRecord,
    viewerId: string | undefined,
    references?: TenancyReference[],
    disputes?: TenancyDispute[],
  ) {
    return sanitizeResidenceRecord(
      record,
      viewerId,
      references ?? this.state.tenancyReferences.filter((r) => r.tenancyId === record.tenancyId),
      disputes ?? this.state.tenancyDisputes.filter((d) => d.tenancyId === record.tenancyId),
    );
  }

  listResidenceHistory(userId: string, viewerId?: string) {
    return this.state.residenceRecords
      .filter((r) => r.userId === userId)
      .filter((r) => {
        if (r.status === "rejected") return viewerId === userId;
        if (viewerId === userId) return true;
        if (r.visibility === "private") return false;
        if (r.visibility === "matches_only") return Boolean(viewerId);
        return true;
      })
      .map((r) =>
        this.sanitizeResidenceForViewer(r, viewerId, undefined, undefined),
      )
      .sort((a, b) => (b.startDate > a.startDate ? 1 : -1));
  }

  getPublicRoommateProfile(userId: string) {
    const profile = this.getRoommateProfile(userId);
    if (!profile || profile.active === false) return null;
    if (profile.moderationStatus === "suspended") return null;
    const user = this.getUserById(userId);
    if (!user || user.accountStatus === "BLOCKED" || user.accountStatus === "SUSPENDED") return null;
    return {
      userId,
      name: user.name,
      city: user.city,
      profile: {
        lookingFor: profile.lookingFor,
        budgetMin: profile.budgetMin,
        budgetMax: profile.budgetMax,
        occupation: profile.occupation,
        preferredLocations: profile.preferredLocations,
        suburb: profile.suburb,
        lifestyle: profile.lifestyle,
        smoking: profile.smoking,
        pets: profile.pets,
        furnished: profile.furnished,
        availableNow: profile.availableNow,
        gender: profile.gender,
        age: profile.age,
        religion: profile.religion,
        maritalStatus: profile.maritalStatus,
        householdType: profile.householdType,
        householdSize: profile.householdSize,
        moveInDate: profile.moveInDate,
        bio: profile.bio,
        photoUrl: profile.photoUrl,
        photos: profile.photos,
        verified: profile.verified ?? false,
        featured: profile.featured ?? false,
        genderPreference: profile.genderPreference,
        religionPreference: profile.religionPreference,
        maritalStatusPreference: profile.maritalStatusPreference,
        preferredAgeMin: profile.preferredAgeMin,
        preferredAgeMax: profile.preferredAgeMax,
      },
      residenceHistory: [],
      listings: this.state.listings
        .filter((l) => l.ownerId === userId && isPublicListingStatus(l.status))
        .map(toPublicListing),
    };
  }

  incrementListingMetric(id: string, metric: "views" | "saves" | "enquiries") {
    const listing = this.getListing(id);
    if (!listing) {
      return null;
    }
    return this.updateListing(id, { [metric]: listing[metric] + 1 });
  }

  getFavourites(userId: string) {
    const ids = this.state.favourites.get(userId) ?? new Set();
    return this.state.listings.filter((listing) => ids.has(listing.id));
  }

  addFavourite(userId: string, listingId: string) {
    const set = this.state.favourites.get(userId) ?? new Set();
    set.add(listingId);
    this.state.favourites.set(userId, set);
    this.incrementListingMetric(listingId, "saves");
    return { userId, listingId, createdAt: new Date().toISOString() };
  }

  removeFavourite(userId: string, listingId: string) {
    const set = this.state.favourites.get(userId);
    if (set?.delete(listingId)) {
      this.touch();
    }
    return { removed: true };
  }

  isFavourite(userId: string, listingId: string) {
    return this.state.favourites.get(userId)?.has(listingId) ?? false;
  }

  getSavedSearches(userId: string) {
    return this.state.savedSearches.filter((search) => search.userId === userId);
  }

  createSavedSearch(userId: string, input: { name: string; channels?: string[]; filters?: Record<string, unknown> }) {
    const saved: SavedSearch = {
      id: `saved_${crypto.randomUUID()}`,
      userId,
      name: input.name,
      channels: input.channels ?? ["email"],
      filters: input.filters ?? {},
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    this.state.savedSearches.unshift(saved);
    this.touch();
    return saved;
  }

  createEnquiry(input: CreateEnquiryInput) {
    const enquiry = EnquiryPlatform.create(this.state, input, this.enquiryDeps());
    this.touch();
    return enquiry;
  }

  createRoommateEnquiry(input: CreateRoommateEnquiryInput) {
    const enquiry = EnquiryPlatform.createRoommate(this.state, input, this.enquiryDeps());
    this.touch();
    return enquiry;
  }

  private afterEnquiryCreated(enquiry: import("@/lib/enquiries/types").PropertyEnquiry) {
    void syncEnquiryToPrisma(enquiry);
    const admins = this.listUsers({ role: "ADMIN" });
    const agent = enquiry.assignedAgentId ? this.getUserById(enquiry.assignedAgentId) : null;
    const owner = enquiry.ownerId ? this.getUserById(enquiry.ownerId) : null;
    const seeker = enquiry.seekerId !== "guest" ? this.getUserById(enquiry.seekerId) : null;
    void dispatchEnquiryCreatedNotifications(enquiry, {
      admin: admins.map((u) => ({ email: u.email, name: u.name })),
      agent: agent ? { email: agent.email, name: agent.name } : undefined,
      owner: owner ? { email: owner.email, name: owner.name } : undefined,
      seeker: seeker?.email ? { email: seeker.email, name: seeker.name } : enquiry.seekerEmail ? { email: enquiry.seekerEmail, name: enquiry.seekerName } : undefined,
    });
  }

  private enquiryDeps() {
    return {
      getListing: (id: string) => this.getListing(id) ?? undefined,
      getUserById: (id: string) => this.getUserById(id) ?? undefined,
      getAdminUserIds: () =>
        [...this.state.users.values()].filter((u) => u.roles.includes("ADMIN")).map((u) => u.id),
      getEnquirySettings: () => ({
        ...defaultPlatformSettings.enquiries,
        ...this.getPlatformSettings().enquiries,
      }),
      incrementListingMetric: (id: string, metric: "enquiries") =>
        this.incrementListingMetric(id, metric),
      agents: this.state.agents,
      createNotification: (userId: string, n: { channel: Notification["channel"]; subject: string; body: string }) =>
        this.createNotification(userId, n),
      ensureConversation: (input: {
        listingId: string;
        listingTitle: string;
        seekerId: string;
        seekerName: string;
        ownerId: string;
        ownerName: string;
        message: string;
        createdAt: string;
      }) => {
        const existing = this.state.conversations.find(
          (c) => c.listingId === input.listingId && c.participantIds.includes(input.seekerId),
        );
        if (existing) {
          this.state.messages.push({
            id: `msg_${crypto.randomUUID()}`,
            conversationId: existing.id,
            senderId: input.seekerId,
            senderName: input.seekerName,
            body: input.message,
            createdAt: input.createdAt,
          });
          existing.updatedAt = input.createdAt;
          return existing.id;
        }
        const conversationId = `conv_${crypto.randomUUID()}`;
        this.state.conversations.unshift({
          id: conversationId,
          listingId: input.listingId,
          listingTitle: input.listingTitle,
          participantIds: [input.seekerId, input.ownerId],
          participantNames: [input.seekerName, input.ownerName],
          updatedAt: input.createdAt,
        });
        this.state.messages.push({
          id: `msg_${crypto.randomUUID()}`,
          conversationId,
          senderId: input.seekerId,
          senderName: input.seekerName,
          body: input.message,
          createdAt: input.createdAt,
        });
        return conversationId;
      },
      renderTemplate: (key: string, vars: Record<string, string>) =>
        renderNotificationTemplate("whatsapp", key, vars) ??
        renderNotificationTemplate("email", key, vars),
      onEnquiryCreated: (enquiry: import("@/lib/enquiries/types").PropertyEnquiry) => this.afterEnquiryCreated(enquiry),
    };
  }

  listEnquiries(filters?: EnquiryListFilters) {
    return EnquiryPlatform.list(this.state.enquiries, filters);
  }

  getEnquiryById(id: string) {
    return EnquiryPlatform.getById(this.state, id);
  }

  getEnquiryAnalytics() {
    return EnquiryPlatform.analytics(this.state.enquiries);
  }

  updateEnquiryStatus(id: string, status: EnquiryStatus, actor: { id: string; name: string }, reason?: string) {
    const updated = EnquiryPlatform.updateStatus(this.state, id, status, actor, reason);
    void syncEnquiryToPrisma(updated);
    this.touch();
    return updated;
  }

  assignEnquiryAgent(id: string, agentId: string, actor: { id: string; name: string }) {
    const agent = this.getUserById(agentId);
    const enquiry = EnquiryPlatform.assignAgent(this.state, id, agentId, actor, agent?.name);
    if (agentId) {
      this.createNotification(agentId, {
        channel: "IN_APP",
        subject: "Enquiry assigned to you",
        body: `You have been assigned enquiry on ${enquiry.listingTitle}.`,
      });
    }
    void syncEnquiryToPrisma(enquiry);
    this.touch();
    return enquiry;
  }

  addEnquiryNote(
    id: string,
    note: { authorId: string; authorName: string; body: string; internal: boolean },
  ) {
    const enquiry = EnquiryPlatform.addNote(this.state, id, note);
    this.touch();
    return enquiry;
  }

  scheduleEnquiryViewing(
    id: string,
    viewing: { scheduledAt: string; location: string; agentId?: string; agentName?: string },
    actor: { id: string; name: string },
  ) {
    const enquiry = EnquiryPlatform.scheduleViewing(this.state, id, viewing, actor);
    this.touch();
    return enquiry;
  }

  completeEnquiryViewing(
    id: string,
    viewingId: string,
    outcome: "COMPLETED" | "NO_SHOW" | "RESCHEDULED" | "CANCELLED",
    feedback: string,
    actor: { id: string; name: string },
    extras?: { followUpDate?: string; clientInterested?: boolean; followUpReminderHours?: number },
  ) {
    const enquiry = EnquiryPlatform.completeViewing(this.state, id, viewingId, outcome, feedback, actor, extras);
    const openTask = enquiry.followUpTasks.find((task) => task.viewingId === viewingId && task.status === "OPEN");
    if (openTask && enquiry.assignedAgentId) {
      AgentPlatform.addAgentTask(this.state.agents, {
        agentId: enquiry.assignedAgentId,
        title: openTask.title,
        dueAt: openTask.dueAt,
        priority: "HIGH",
        enquiryId: enquiry.id,
        viewingId: openTask.viewingId,
        referenceNumber: openTask.referenceNumber,
      });
    }
    this.touch();
    return enquiry;
  }

  completeEnquiryFollowUpTask(id: string, taskId: string, actor: { id: string; name: string }) {
    const enquiry = EnquiryPlatform.completeFollowUpTask(this.state, id, taskId, actor);
    const task = enquiry.followUpTasks.find((row) => row.id === taskId);
    if (task && enquiry.assignedAgentId) {
      const agentTask = this.state.agents.tasks.find(
        (row) => row.enquiryId === enquiry.id && row.viewingId === task.viewingId && row.status === "OPEN",
      );
      if (agentTask) agentTask.status = "DONE";
    }
    this.touch();
    return enquiry;
  }

  submitEnquiryOffer(
    id: string,
    offer: { amount: number; currency: string; terms?: string; submittedById: string; submittedByName: string },
    actor: { id: string; name: string },
  ) {
    const enquiry = EnquiryPlatform.submitOffer(this.state, id, offer, actor);
    this.touch();
    return enquiry;
  }

  respondEnquiryOffer(id: string, offerId: string, accepted: boolean, actor: { id: string; name: string }) {
    const enquiry = EnquiryPlatform.respondOffer(this.state, id, offerId, accepted, actor);
    this.touch();
    return enquiry;
  }

  addEnquiryDocument(
    id: string,
    doc: { name: string; url: string; uploadedById: string; uploadedByName: string },
    actor: { id: string; name: string },
  ) {
    const enquiry = EnquiryPlatform.addDocument(this.state, id, doc, actor);
    this.touch();
    return enquiry;
  }

  recordEnquiryCommission(id: string, amount: number, actor: { id: string; name: string }) {
    const enquiry = EnquiryPlatform.recordCommission(this.state, id, amount, actor);
    this.touch();
    return enquiry;
  }

  mergeEnquiries(targetId: string, sourceId: string, actor: { id: string; name: string }) {
    const enquiry = EnquiryPlatform.merge(this.state, targetId, sourceId, actor);
    this.touch();
    return enquiry;
  }

  getEnquiriesForOwner(ownerId: string) {
    return EnquiryPlatform.list(this.state.enquiries, { ownerId });
  }

  getEnquiriesForSeeker(seekerId: string) {
    return EnquiryPlatform.list(this.state.enquiries, { seekerId });
  }

  getEnquiriesForAgent(agentId: string) {
    return EnquiryPlatform.list(this.state.enquiries, { assignedAgentId: agentId });
  }

  createReport(input: {
    listingId: string;
    reporterId?: string;
    reason: string;
    details?: string;
  }) {
    const report: Report = {
      id: `report_${crypto.randomUUID()}`,
      listingId: input.listingId,
      reporterId: input.reporterId,
      reason: input.reason,
      details: input.details ?? "",
      status: "OPEN",
      priority: input.reason === "scam" ? "HIGH" : "MEDIUM",
      createdAt: new Date().toISOString(),
    };
    this.state.reports.unshift(report);
    this.state.reviewQueue.unshift({
      id: `review_${report.id}`,
      type: "REPORT",
      priority: report.priority,
      title: `Report: ${input.reason}`,
      status: "OPEN",
    });
    this.touch();
    return report;
  }

  getConversations(userId: string) {
    return this.state.conversations.filter((conversation) =>
      conversation.participantIds.includes(userId),
    );
  }

  getMessages(conversationId: string) {
    return this.state.messages.filter((message) => message.conversationId === conversationId);
  }

  sendMessage(input: {
    conversationId: string;
    senderId: string;
    senderName: string;
    body: string;
  }) {
    const message: Message = {
      id: `msg_${crypto.randomUUID()}`,
      conversationId: input.conversationId,
      senderId: input.senderId,
      senderName: input.senderName,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.state.messages.push(message);
    const conversation = this.state.conversations.find((item) => item.id === input.conversationId);
    if (conversation) {
      conversation.updatedAt = message.createdAt;
    }
    this.touch();
    return message;
  }

  saveRoommateProfile(userId: string, input: Partial<RoommateProfile>) {
    const existing = this.state.roommateProfiles.get(userId);
    const profile: RoommateProfile = {
      id: `roommate_${userId}`,
      userId,
      lookingFor: input.lookingFor ?? existing?.lookingFor ?? "roommate",
      budgetMin: input.budgetMin ?? existing?.budgetMin ?? 100,
      budgetMax: input.budgetMax ?? existing?.budgetMax ?? 300,
      occupation: input.occupation ?? existing?.occupation ?? "",
      preferredLocations: input.preferredLocations ?? existing?.preferredLocations ?? [],
      lifestyle: input.lifestyle ?? existing?.lifestyle ?? "",
      smoking: input.smoking ?? existing?.smoking ?? false,
      pets: input.pets ?? existing?.pets ?? false,
      furnished: input.furnished ?? existing?.furnished ?? false,
      availableNow: input.availableNow ?? existing?.availableNow ?? false,
      gender: input.gender ?? existing?.gender ?? "prefer_not_to_say",
      genderPreference: input.genderPreference ?? existing?.genderPreference ?? "any",
      age: input.age ?? existing?.age ?? 25,
      preferredAgeMin: input.preferredAgeMin ?? existing?.preferredAgeMin ?? 20,
      preferredAgeMax: input.preferredAgeMax ?? existing?.preferredAgeMax ?? 35,
      religion: input.religion ?? existing?.religion ?? "prefer_not_to_say",
      religionPreference: input.religionPreference ?? existing?.religionPreference ?? "any",
      maritalStatus: input.maritalStatus ?? existing?.maritalStatus ?? "single",
      maritalStatusPreference: input.maritalStatusPreference ?? existing?.maritalStatusPreference ?? "any",
      householdType: input.householdType ?? existing?.householdType ?? "single",
      householdSize: input.householdSize ?? existing?.householdSize ?? 1,
      moveInDate: input.moveInDate ?? existing?.moveInDate,
      bio: input.bio ?? existing?.bio ?? "",
      photoUrl: input.photoUrl ?? existing?.photoUrl,
      photos: input.photos ?? existing?.photos ?? [],
      active: input.active ?? existing?.active ?? true,
      verified: input.verified ?? existing?.verified ?? false,
      featured: input.featured ?? existing?.featured ?? false,
      moderationStatus: input.moderationStatus ?? existing?.moderationStatus ?? "pending",
      moderationNotes: input.moderationNotes ?? existing?.moderationNotes,
      suburb: input.suburb ?? existing?.suburb ?? "",
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.roommateProfiles.set(userId, profile);
    this.touch();
    return profile;
  }

  getRoommateProfile(userId: string) {
    return this.state.roommateProfiles.get(userId) ?? null;
  }

  listRoommateProfilesAdmin(filters?: { q?: string; status?: string; lookingFor?: string }) {
    const q = filters?.q?.toLowerCase().trim();
    return Array.from(this.state.roommateProfiles.values())
      .map((profile) => {
        const user = this.getUserById(profile.userId);
        return {
          ...profile,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email,
          userCity: user?.city,
          accountStatus: user?.accountStatus ?? "ACTIVE",
        };
      })
      .filter((p) => {
        if (filters?.status && filters.status !== "all" && p.moderationStatus !== filters.status) return false;
        if (filters?.lookingFor && p.lookingFor !== filters.lookingFor) return false;
        if (!q) return true;
        return (
          p.userName.toLowerCase().includes(q) ||
          (p.userEmail?.toLowerCase().includes(q) ?? false) ||
          (p.bio?.toLowerCase().includes(q) ?? false) ||
          p.userId.includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
  }

  moderateRoommateProfile(
    userId: string,
    action: "verify" | "suspend" | "activate" | "feature" | "unfeature" | "update_bio" | "delete",
    actor: { id: string; name: string },
    extra?: { bio?: string; notes?: string },
  ) {
    const profile = this.getRoommateProfile(userId);
    if (!profile && action !== "delete") return null;

    if (action === "delete") {
      this.state.roommateProfiles.delete(userId);
      this.recordAudit({
        actorId: actor.id,
        actorName: actor.name,
        action: "DELETE_ROOMMATE_PROFILE",
        target: userId,
        targetType: "ROOMMATE_PROFILE",
        metadata: {},
        ip: "admin",
      });
      return { deleted: true };
    }

    if (!profile) return null;

    switch (action) {
      case "verify":
        profile.verified = true;
        profile.moderationStatus = "active";
        profile.active = true;
        break;
      case "suspend":
        profile.moderationStatus = "suspended";
        profile.active = false;
        if (extra?.notes) profile.moderationNotes = extra.notes;
        break;
      case "activate":
        profile.moderationStatus = "active";
        profile.active = true;
        break;
      case "feature":
        profile.featured = true;
        break;
      case "unfeature":
        profile.featured = false;
        break;
      case "update_bio":
        if (extra?.bio !== undefined) profile.bio = extra.bio;
        break;
    }
    profile.updatedAt = new Date().toISOString();
    this.state.roommateProfiles.set(userId, profile);
    this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      action: `ROOMMATE_${action.toUpperCase()}`,
      target: userId,
      targetType: "ROOMMATE_PROFILE",
      metadata: { notes: extra?.notes },
      ip: "admin",
    });
    return profile;
  }

  getRoommateAdminAnalytics() {
    const profiles = [...this.state.roommateProfiles.values()];
    return {
      total: profiles.length,
      verified: profiles.filter((p) => p.verified).length,
      pending: profiles.filter((p) => (p.moderationStatus ?? "pending") === "pending").length,
      suspended: profiles.filter((p) => p.moderationStatus === "suspended").length,
      featured: profiles.filter((p) => p.featured).length,
      seekingRoom: profiles.filter((p) => p.lookingFor === "room").length,
      seekingRoommate: profiles.filter((p) => p.lookingFor === "roommate").length,
    };
  }

  hydratePersistedState(state: StoreState) {
    this.state = finalizeStoreState(state, { skipSeeds: true });
  }

  snapshotState(): StoreState {
    return this.state;
  }

  getRoommateMatches(userId: string): RoommateMatch[] {
    const profile = this.getRoommateProfile(userId);
    if (!profile) return [];

    if (profile.lookingFor === "room") {
      const listings = this.listListings()
        .filter((l) => isPublicListingStatus(l.status))
        .map(toPublicListing);
      return matchRooms(listings, profile);
    }

    const extraCandidates = Array.from(this.state.roommateProfiles.values())
      .filter((p) => p.userId !== userId && p.active !== false && p.lookingFor === "roommate")
      .map((p) => {
        const user = this.getUserById(p.userId);
        return {
          id: p.userId,
          name: user?.name?.split(" ")[0] ?? "Roommate",
          budgetMin: p.budgetMin,
          budgetMax: p.budgetMax,
          city: p.preferredLocations[0] ?? user?.city ?? "Harare",
          lifestyle: p.lifestyle || p.occupation || "Looking for a roommate",
          smoking: p.smoking,
          pets: p.pets,
          gender: p.gender,
          age: p.age,
          religion: p.religion,
          maritalStatus: p.maritalStatus,
          genderPreference: p.genderPreference as import("@/lib/roommates/types").GenderPreference,
          religionPreference: p.religionPreference as import("@/lib/roommates/types").ReligionPreference,
          maritalStatusPreference: p.maritalStatusPreference,
          preferredAgeMin: p.preferredAgeMin,
          preferredAgeMax: p.preferredAgeMax,
          photoUrl: p.photoUrl,
        };
      });

    return matchRoommates(profile, extraCandidates);
  }

  addListingImages(listingId: string, ownerId: string, urls: string[]) {
    const listing = this.getListing(listingId);
    if (!listing || listing.ownerId !== ownerId) return null;
    const images = [...(listing.images ?? [listing.image]), ...urls].filter(
      (url, i, arr) => url && arr.indexOf(url) === i,
    );
    return this.updateListing(listingId, {
      images,
      image: images[0] ?? listing.image,
    });
  }

  createPayment(
    userId: string,
    input: {
      provider: string;
      plan: string;
      amount?: number;
      listingId?: string;
      tenantUserId?: string;
      landlordUserId?: string;
      method?: Payment["method"];
    },
  ) {
    const amount = input.amount ?? getPlanPrice(input.plan, this.adminState().paymentSettings.fees);
    const method = input.method ?? (input.provider as Payment["method"]);
    const gateway = this.adminState().paymentSettings.gateways.find((g) => g.id === input.provider);
    const isManual = ["bank_transfer", "cash", "zipit", "manual"].includes(method);
    const autoComplete = !isManual && gateway?.enabled && !this.adminState().paymentSettings.sandboxMode;

    const payment = AdminPlatform.createPaymentRecord(this.adminState(), {
      userId,
      provider: input.provider,
      method,
      plan: input.plan,
      amount,
      listingId: input.listingId,
    });

    if (input.tenantUserId) payment.tenantUserId = input.tenantUserId;
    if (input.landlordUserId) payment.landlordUserId = input.landlordUserId;

    if (autoComplete) {
      AdminPlatform.completePaymentRecord(this.adminState(), payment.id);
      const completed = this.getPaymentById(payment.id);
      if (completed?.plan === "tenancy_payment") {
        this.onTenancyPaymentCompleted(completed);
      }
    }
    this.touch();
    return payment;
  }

  completePayment(paymentId: string, actor?: { id: string; name: string }) {
    const payment = AdminPlatform.completePaymentRecord(this.adminState(), paymentId, actor);
    if (payment?.plan === "tenancy_payment") {
      this.onTenancyPaymentCompleted(payment);
    }
    this.touch();
    return payment;
  }

  getPayments(userId: string) {
    return this.state.payments.filter((payment) => payment.userId === userId);
  }

  getNotifications(userId: string) {
    return this.state.notifications.filter((notification) => notification.userId === userId);
  }

  createNotification(userId: string, input: { channel: string; subject: string; body: string; templateKey?: string; templateVars?: Record<string, string> }) {
    let subject = input.subject;
    let body = input.body;
    if (input.templateKey) {
      const channel = input.channel.toLowerCase().includes("sms")
        ? "sms"
        : input.channel.toLowerCase().includes("whatsapp")
          ? "whatsapp"
          : "email";
      const rendered = renderNotificationTemplate(channel, input.templateKey, {
        platformName: this.getPlatformSettings().platformName,
        ...input.templateVars,
      });
      if (rendered) body = rendered;
    }
    const notification: Notification = {
      id: `notif_${crypto.randomUUID()}`,
      userId,
      channel: input.channel,
      subject,
      body,
      status: "SENT",
      createdAt: new Date().toISOString(),
    };
    this.state.notifications.unshift(notification);
    this.touch();
    return notification;
  }

  getLandlordAnalytics(ownerId: string) {
    const listings = this.state.listings.filter(
      (listing) => listing.ownerId === ownerId && listing.status !== "DRAFT",
    );
    const holidayAnalytics = this.getHolidayHomeAnalytics(ownerId);
    return {
      totals: {
        listings: listings.length,
        views: listings.reduce((sum, listing) => sum + listing.views, 0),
        saves: listings.reduce((sum, listing) => sum + listing.saves, 0),
        enquiries: listings.reduce((sum, listing) => sum + listing.enquiries, 0),
        holidayBookings: holidayAnalytics.bookingEnquiries,
      },
      holidayAnalytics,
      listings: listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        suburb: listing.suburb,
        city: listing.city,
        intent: listing.intent,
        type: listing.type,
        views: listing.views,
        saves: listing.saves,
        enquiries: listing.enquiries,
        status: listing.status,
      })),
    };
  }

  getReviewQueue() {
    return this.state.reviewQueue.filter((item) => item.status === "OPEN");
  }

  getAdminAnalytics() {
    return {
      totals: {
        users: this.state.users.size,
        listings: this.state.listings.length,
        openReports: this.state.reports.filter((report) => report.status === "OPEN").length,
        revenue: this.state.payments
          .filter((payment) => payment.status === "PAID")
          .reduce((sum, payment) => sum + payment.amount, 0),
      },
      reports: this.state.reports.slice(0, 10),
      payments: this.state.payments.slice(0, 10),
    };
  }

  resolveReviewItem(id: string, reason?: string) {
    const item = this.state.reviewQueue.find((entry) => entry.id === id);
    if (item) {
      item.status = "RESOLVED";
      item.resolutionNote = reason;
      this.touch();
    }
    const report = this.state.reports.find((entry) => entry.id === id);
    if (report) {
      report.status = "RESOLVED";
      if (reason) report.adminNotes = reason;
      this.touch();
    }
    return item ?? report ?? null;
  }

  dismissModerationItem(id: string, reason?: string) {
    const queueIdx = this.state.reviewQueue.findIndex((entry) => entry.id === id);
    if (queueIdx >= 0) {
      this.state.reviewQueue[queueIdx].resolutionNote = reason;
      this.state.reviewQueue.splice(queueIdx, 1);
      this.touch();
      return { id, dismissed: true };
    }
    const report = this.state.reports.find((entry) => entry.id === id);
    if (report) {
      report.status = "DISMISSED";
      if (reason) report.adminNotes = reason;
      this.touch();
      return { id, dismissed: true };
    }
    return null;
  }

  applyPersistedSettings(persisted: { platformSettings: PlatformSettings; paymentSettings: PaymentSettings }) {
    this.state.platformSettings = syncGeoToFlatLists(persisted.platformSettings);
    this.state.paymentSettings = persisted.paymentSettings;
  }

  getPlatformSettings() {
    return AdminPlatform.getPlatformSettings(this.adminState());
  }

  updatePlatformSettings(
    updates: Partial<PlatformSettings>,
    actor: { id: string; name: string },
    options?: { ip?: string; preserveSecrets?: boolean },
  ) {
    const settings = AdminPlatform.updatePlatformSettings(this.adminState(), updates, actor, options);
    this.touch();
    return settings;
  }

  getPaymentSettings() {
    return AdminPlatform.getPaymentSettings(this.adminState());
  }

  updatePaymentSettings(
    updates: Partial<PaymentSettings>,
    actor: { id: string; name: string },
    options?: { ip?: string; preserveSecrets?: boolean },
  ) {
    const settings = AdminPlatform.updatePaymentSettings(this.adminState(), updates, actor, options);
    this.touch();
    return settings;
  }

  getPaymentHealth() {
    return AdminPlatform.getPaymentHealth(this.adminState());
  }

  listAllPayments(filters?: Parameters<typeof AdminPlatform.listAllPayments>[1]) {
    return AdminPlatform.listAllPayments(this.adminState(), filters);
  }

  getPaymentById(id: string) {
    return AdminPlatform.getPaymentById(this.adminState(), id);
  }

  approveManualPayment(paymentId: string, actor: { id: string; name: string }, note?: string) {
    const payment = AdminPlatform.approveManualPayment(this.adminState(), paymentId, actor, note);
    this.touch();
    return payment;
  }

  rejectManualPayment(paymentId: string, actor: { id: string; name: string }, reason?: string) {
    const payment = AdminPlatform.rejectManualPayment(this.adminState(), paymentId, actor, reason);
    this.touch();
    return payment;
  }

  requestPaymentProof(paymentId: string, actor: { id: string; name: string }) {
    const payment = AdminPlatform.requestPaymentProof(this.adminState(), paymentId, actor);
    this.touch();
    return payment;
  }

  uploadPaymentProof(paymentId: string, proofUrl: string) {
    const payment = AdminPlatform.uploadPaymentProof(this.adminState(), paymentId, proofUrl);
    this.touch();
    return payment;
  }

  addFinanceNote(paymentId: string, actor: { id: string; name: string }, note: string) {
    return this.persistResult(AdminPlatform.addFinanceNote(this.adminState(), paymentId, actor, note));
  }

  reversePayment(paymentId: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.reversePayment(this.adminState(), paymentId, actor, reason));
  }

  refundPayment(paymentId: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.refundPayment(this.adminState(), paymentId, actor, reason));
  }

  recordManualPayment(
    input: Parameters<typeof AdminPlatform.recordManualPayment>[1],
    actor: { id: string; name: string },
  ) {
    return this.persistResult(AdminPlatform.recordManualPayment(this.adminState(), input, actor));
  }

  grantComplimentary(input: Parameters<typeof AdminPlatform.grantComplimentary>[1], actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.grantComplimentary(this.adminState(), input, actor));
  }

  adjustUserCredits(userId: string, delta: number, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.adjustUserCredits(this.adminState(), userId, delta, actor, reason));
  }

  getSupportTickets() {
    return AdminPlatform.getSupportTickets(this.adminState());
  }

  resolveSupportTicket(ticketId: string, actor: { id: string; name: string }, reason?: string) {
    const ticket = AdminPlatform.resolveSupportTicket(this.adminState(), ticketId, actor, reason);
    if (ticket?.userId) {
      this.createNotification(ticket.userId, {
        channel: "email",
        subject: `Support ticket resolved: ${ticket.subject}`,
        body: ticket.resolutionNote ?? "Your support ticket has been resolved.",
      });
    }
    return ticket;
  }

  createSupportTicket(
    input: Omit<import("@/lib/store/types").SupportTicket, "id" | "createdAt" | "updatedAt">,
    actor: { id: string; name: string },
  ) {
    return this.persistResult(AdminPlatform.createSupportTicket(this.adminState(), input, actor));
  }

  escalateSupportTicket(ticketId: string, actor: { id: string; name: string }, escalation?: { team?: string; reason?: string }) {
    return this.persistResult(AdminPlatform.escalateSupportTicket(this.adminState(), ticketId, actor, escalation));
  }

  assignSupportTicket(ticketId: string, assignee: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.assignSupportTicket(this.adminState(), ticketId, assignee, actor));
  }

  getVerificationRequests() {
    return AdminPlatform.getVerificationRequests(this.adminState());
  }

  approveVerification(id: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.approveVerification(this.adminState(), id, actor));
  }

  rejectVerification(id: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.rejectVerification(this.adminState(), id, actor, reason));
  }

  adminApproveListing(
    listingId: string,
    actor: { id: string; name: string; email?: string },
    options?: { bypassOwnerAgreement?: boolean; bypassReason?: string },
  ) {
    return this.persistResult(AdminPlatform.adminApproveListing(this.adminState(), listingId, actor, options));
  }

  adminRejectListing(listingId: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.adminRejectListing(this.adminState(), listingId, actor, reason));
  }

  adminEditListing(listingId: string, updates: Partial<ListingRecord>, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.adminEditListing(this.adminState(), listingId, updates, actor));
  }

  adminSetListingStatus(
    listingId: string,
    status: ListingRecord["status"],
    actor: { id: string; name: string },
    reason?: string,
  ) {
    return this.persistResult(AdminPlatform.adminSetListingStatus(this.adminState(), listingId, status, actor, reason));
  }

  transferListingOwnership(listingId: string, newOwnerId: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.transferListingOwnership(this.adminState(), listingId, newOwnerId, actor));
  }

  featureListing(listingId: string, days: number, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.featureListing(this.adminState(), listingId, days, actor));
  }

  featureAgency(agencyId: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.featureAgency(this.adminState(), agencyId, actor));
  }

  listListingsAdmin(filters?: { q?: string; status?: string; type?: string; intent?: string; includeDeleted?: boolean }) {
    let items = [...this.state.listings];
    if (filters?.status) {
      items = items.filter((l) => l.status === filters.status);
    } else if (!filters?.includeDeleted) {
      items = items.filter((l) => l.status !== "DELETED");
    }
    if (filters?.type) {
      items = items.filter((l) => l.type === filters.type);
    }
    if (filters?.intent) {
      items = items.filter((l) => l.intent === filters.intent);
    }
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.suburb.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q),
      );
    }
    return items.map((l) => {
      const owner = this.getUserById(l.ownerId);
      return {
        id: l.id,
        title: l.title,
        city: l.city,
        suburb: l.suburb,
        type: l.type,
        intent: l.intent,
        price: l.price,
        status: l.status,
        verified: l.verified,
        featured: l.featured ?? false,
        views: l.views,
        saves: l.saves,
        enquiries: l.enquiries,
        ownerId: l.ownerId,
        ownerName: owner?.name ?? "Unknown",
        ownerEmail: owner?.email,
        ownerAgreementAccepted: l.ownerAgreementAccepted ?? false,
        ownerAgreementSignerName: l.ownerAgreementSignerName,
        ownerAgreementSignedAt: l.ownerAgreementSignedAt,
        ownerAgreementBypassedAt: l.ownerAgreementBypassedAt,
        ownerAgreementBypassedByName: l.ownerAgreementBypassedByName,
        ownerAgreementBypassedByEmail: l.ownerAgreementBypassedByEmail,
        ownerAgreementBypassReason: l.ownerAgreementBypassReason,
        virtualTour: l.virtualTour,
        virtualTourStatus: l.virtualTour?.status,
        virtualTourSceneCount: l.virtualTour?.scenes.length ?? 0,
        virtualTourVerified: Boolean(l.virtualTour?.adminVerifiedAt),
        createdAt: l.availableFrom,
      };
    });
  }

  adminDeleteListing(listingId: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.adminDeleteListing(this.adminState(), listingId, actor, reason));
  }

  adminArchiveListing(listingId: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.adminArchiveListing(this.adminState(), listingId, actor, reason));
  }

  adminRestoreListing(listingId: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.adminRestoreListing(this.adminState(), listingId, actor));
  }

  adminUnfeatureListing(listingId: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.adminUnfeatureListing(this.adminState(), listingId, actor));
  }

  adminSetListingVerified(listingId: string, verified: boolean, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.adminSetListingVerified(this.adminState(), listingId, verified, actor));
  }

  adminBulkListingAction(
    listingIds: string[],
    action: string,
    actor: { id: string; name: string },
    params?: { reason?: string; days?: number },
  ) {
    const results: Array<{ id: string; ok: boolean }> = [];
    for (const id of listingIds) {
      let result = null;
      switch (action) {
        case "approve":
          result = this.adminApproveListing(id, actor);
          break;
        case "mark_available":
          result = this.adminSetListingStatus(id, "ACTIVE", actor, params?.reason);
          break;
        case "mark_viewing":
          result = this.adminSetListingStatus(id, "VIEWING_IN_PROGRESS", actor, params?.reason);
          break;
        case "mark_let":
        case "mark_rented":
          result = this.adminSetListingStatus(id, "RENTED", actor, params?.reason);
          break;
        case "mark_sold":
          result = this.adminSetListingStatus(id, "SOLD", actor, params?.reason);
          break;
        case "reject":
          result = this.adminRejectListing(id, actor, params?.reason);
          break;
        case "delete":
          result = this.adminDeleteListing(id, actor, params?.reason);
          break;
        case "archive":
          result = this.adminArchiveListing(id, actor, params?.reason);
          break;
        case "restore":
          result = this.adminRestoreListing(id, actor);
          break;
        case "feature":
          result = this.featureListing(id, params?.days ?? 7, actor);
          break;
        case "verify":
          result = this.adminSetListingVerified(id, true, actor);
          break;
        default:
          break;
      }
      results.push({ id, ok: Boolean(result) });
    }
    return results;
  }

  updateAgency(
    agencyId: string,
    updates: Partial<Pick<Agency, "name" | "email" | "phone" | "city" | "subscriptionTier">>,
    actor: { id: string; name: string },
  ) {
    return this.persistResult(AdminPlatform.updateAgency(this.adminState(), agencyId, updates, actor));
  }

  suspendAgency(agencyId: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.suspendAgency(this.adminState(), agencyId, actor, reason));
  }

  activateAgency(agencyId: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.activateAgency(this.adminState(), agencyId, actor));
  }

  deleteAgency(agencyId: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.deleteAgency(this.adminState(), agencyId, actor, reason));
  }

  verifyAgency(agencyId: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.verifyAgency(this.adminState(), agencyId, actor));
  }

  rejectAgency(agencyId: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.rejectAgency(this.adminState(), agencyId, actor, reason));
  }

  deleteUser(userId: string, actor: { id: string; name: string }, reason?: string) {
    return this.persistResult(AdminPlatform.deleteUser(this.adminState(), userId, actor, reason));
  }

  terminateUserSessions(userId: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.terminateUserSessions(this.adminState(), userId, actor));
  }

  terminateAllSessions(actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.terminateAllSessions(this.adminState(), actor));
  }

  resetUserVerification(userId: string, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.resetUserVerification(this.adminState(), userId, actor));
  }

  extendSubscription(userId: string, days: number, actor: { id: string; name: string }) {
    return this.persistResult(AdminPlatform.extendSubscription(this.adminState(), userId, days, actor));
  }

  private enterpriseState(): EnterpriseOpsState {
    return this.state.enterpriseOps;
  }

  listEscrowHolds() {
    return EnterpriseOps.listEscrowHolds(this.enterpriseState());
  }

  updateEscrowHold(id: string, status: import("@/lib/admin/enterprise-types").EscrowHold["status"], actor: { id: string; name: string }) {
    const result = EnterpriseOps.updateEscrowHold(this.enterpriseState(), id, status);
    if (result) {
      this.recordAudit({ actorId: actor.id, actorName: actor.name, action: "UPDATE_ESCROW", target: id, targetType: "PAYMENT", metadata: { status }, ip: "admin" });
      this.touch();
    }
    return result;
  }

  listChargebacks() {
    return EnterpriseOps.listChargebacks(this.enterpriseState());
  }

  updateChargeback(id: string, status: import("@/lib/admin/enterprise-types").Chargeback["status"], actor: { id: string; name: string }) {
    const result = EnterpriseOps.updateChargeback(this.enterpriseState(), id, status);
    if (result) {
      this.recordAudit({ actorId: actor.id, actorName: actor.name, action: "UPDATE_CHARGEBACK", target: id, targetType: "PAYMENT", metadata: { status }, ip: "admin" });
      this.touch();
    }
    return result;
  }

  listCoupons() {
    return EnterpriseOps.listCoupons(this.enterpriseState());
  }

  upsertCoupon(coupon: Parameters<typeof EnterpriseOps.upsertCoupon>[1]) {
    const result = EnterpriseOps.upsertCoupon(this.enterpriseState(), coupon);
    this.touch();
    return result;
  }

  removeCoupon(id: string) {
    const result = EnterpriseOps.removeCoupon(this.enterpriseState(), id);
    this.touch();
    return result;
  }

  listScheduledCampaigns() {
    return EnterpriseOps.listScheduledCampaigns(this.enterpriseState());
  }

  upsertScheduledCampaign(campaign: Parameters<typeof EnterpriseOps.upsertCampaign>[1]) {
    const result = EnterpriseOps.upsertCampaign(this.enterpriseState(), campaign);
    this.touch();
    return result;
  }

  cancelScheduledCampaign(id: string) {
    const result = EnterpriseOps.cancelCampaign(this.enterpriseState(), id);
    this.touch();
    return result;
  }

  listBlogPosts() {
    return EnterpriseOps.listBlogPosts(this.enterpriseState());
  }

  upsertBlogPost(post: Parameters<typeof EnterpriseOps.upsertBlogPost>[1]) {
    const result = EnterpriseOps.upsertBlogPost(this.enterpriseState(), post);
    this.touch();
    return result;
  }

  removeBlogPost(id: string) {
    const result = EnterpriseOps.removeBlogPost(this.enterpriseState(), id);
    this.touch();
    return result;
  }

  listCmsFaqs() {
    return EnterpriseOps.listFaqs(this.enterpriseState());
  }

  upsertCmsFaq(faq: Parameters<typeof EnterpriseOps.upsertFaq>[1]) {
    const result = EnterpriseOps.upsertFaq(this.enterpriseState(), faq);
    this.touch();
    return result;
  }

  removeCmsFaq(id: string) {
    const result = EnterpriseOps.removeFaq(this.enterpriseState(), id);
    this.touch();
    return result;
  }

  listMediaAssets() {
    return EnterpriseOps.listMediaAssets(this.enterpriseState());
  }

  addMediaAsset(asset: Parameters<typeof EnterpriseOps.addMediaAsset>[1]) {
    const result = EnterpriseOps.addMediaAsset(this.enterpriseState(), asset);
    this.touch();
    return result;
  }

  removeMediaAsset(id: string) {
    const result = EnterpriseOps.removeMediaAsset(this.enterpriseState(), id);
    this.touch();
    return result;
  }

  listAgentDocuments() {
    return EnterpriseOps.listAgentDocuments(this.enterpriseState());
  }

  updateAgentDocument(id: string, status: import("@/lib/admin/enterprise-types").AgentDocument["status"]) {
    const result = EnterpriseOps.updateAgentDocument(this.enterpriseState(), id, status);
    this.touch();
    return result;
  }

  listAgentBranches() {
    return EnterpriseOps.listAgentBranches(this.enterpriseState());
  }

  upsertAgentBranch(branch: Parameters<typeof EnterpriseOps.upsertAgentBranch>[1]) {
    const result = EnterpriseOps.upsertAgentBranch(this.enterpriseState(), branch);
    this.touch();
    return result;
  }

  listSeasonalRates() {
    return EnterpriseOps.listSeasonalRates(this.enterpriseState());
  }

  upsertSeasonalRate(rate: Parameters<typeof EnterpriseOps.upsertSeasonalRate>[1]) {
    const result = EnterpriseOps.upsertSeasonalRate(this.enterpriseState(), rate);
    this.touch();
    return result;
  }

  listRefundRequests() {
    return EnterpriseOps.listRefundRequests(this.enterpriseState());
  }

  updateRefundRequest(id: string, status: import("@/lib/admin/enterprise-types").RefundRequest["status"], actor: { id: string; name: string }) {
    const result = EnterpriseOps.updateRefundRequest(this.enterpriseState(), id, status);
    if (result) {
      this.recordAudit({ actorId: actor.id, actorName: actor.name, action: "UPDATE_REFUND", target: id, targetType: "PAYMENT", metadata: { status }, ip: "admin" });
      this.touch();
    }
    return result;
  }

  getAdminPermissionsForUser(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return [];
    return getAdminPermissions(user, this.getPlatformSettings());
  }

  generateReportData(type: string) {
    if (type === "commissions") {
      AgentPlatform.normalizeCommissionRecords(this.state.agents);
      return {
        type,
        generatedAt: new Date().toISOString(),
        rows: this.state.agents.commissions.map((c) => ({
          id: c.id,
          agent: c.agentName,
          leadSource: c.leadSource ?? "HOMELINK",
          rule: c.commissionRuleLabel ?? c.ruleSnapshot.ruleLabel,
          split: `HomeLink ${c.ruleSnapshot.homelinkSplitPercent}% / Agent ${c.ruleSnapshot.agentSplitPercent}%`,
          homelinkShare: c.homelinkAmount,
          agentGross: c.agentAmount,
          agentNetPayout: c.netAgentAmount,
          status: c.status,
          type: c.type,
        })),
      };
    }
    const enterpriseTypes = ["bookings", "agents", "occupancy", "tax"];
    if (enterpriseTypes.includes(type)) {
      return EnterpriseOps.generateEnterpriseReport(this.enterpriseState(), type);
    }
    return AdminPlatform.generateReportData(this.adminState(), type);
  }

  getWebhookLogs() {
    return this.adminState().webhookLogs;
  }

  logWebhook(gateway: import("@/lib/settings/types").GatewayId, event: string, payload: Record<string, unknown>, status: "SUCCESS" | "FAILED" | "PENDING") {
    return this.persistResult(AdminPlatform.logWebhook(this.adminState(), gateway, event, payload, status));
  }

  getUserCredits(userId: string) {
    return this.adminState().userCredits.get(userId) ?? 0;
  }

  getUserSubscription(userId: string) {
    return this.adminState().userSubscriptions.get(userId) ?? null;
  }

  listAllSessions() {
    return [...this.state.sessions.values()];
  }

  submitPMRequest(input: SubmitPMRequestInput, ip?: string) {
    PMStore.checkSLABreaches(this.pmState());
    return this.persistResult(PMStore.submitRequest(this.pmState(), input, (userId, channels) => this.pmNotify(userId, channels), { id: input.ownerId, name: input.ownerName, ip }));
  }

  listPMRequests(filters?: Parameters<typeof PMStore.listRequests>[1]) {
    PMStore.checkSLABreaches(this.pmState());
    return PMStore.listRequests(this.pmState(), filters);
  }

  getPMRequest(id: string) {
    return PMStore.getRequest(this.pmState(), id);
  }

  listCRMLeads() {
    return PMStore.listCRMLeads(this.pmState());
  }

  pmAssignConsultant(requestId: string, consultantId: string, actor: { id: string; name: string }, ip?: string) {
    const r = PMStore.assignConsultant(this.pmState(), requestId, consultantId, { ...actor, ip });
    if (r?.consultantId) {
      this.pmNotify(r.consultantId, [{ channel: "email", subject: `Assigned: ${r.requestNumber}`, body: `You have been assigned to request ${r.requestNumber}.` }]);
    }
    this.touch();
    return r;
  }

  pmAssignAgency(requestId: string, agencyId: string, actor: { id: string; name: string }, ip?: string) {
    const agency = this.getAgency(agencyId);
    return this.persistResult(PMStore.assignAgency(this.pmState(), requestId, agencyId, agency?.name ?? agencyId, { ...actor, ip }));
  }

  pmSetStatus(requestId: string, status: import("@/lib/property-management/types").PMRequestStatus, actor: { id: string; name: string }, reason?: string, ip?: string) {
    const r = PMStore.setStatus(this.pmState(), requestId, status, { ...actor, ip }, reason);
    if (r) {
      this.pmNotify(r.ownerId, [{ channel: "email", subject: `Request ${r.requestNumber} updated`, body: `Status changed to ${status}.` }]);
    }
    this.touch();
    return r;
  }

  pmAddNote(requestId: string, body: string, internal: boolean, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.addNote(this.pmState(), requestId, { authorId: actor.id, authorName: actor.name, body, internal }, { ...actor, ip }));
  }

  pmUploadDocument(requestId: string, name: string, type: string, url: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.uploadDocument(this.pmState(), requestId, { name, type, url, uploadedBy: actor.id }, { ...actor, ip }));
  }

  pmReviewDocument(requestId: string, docId: string, approved: boolean, actor: { id: string; name: string }, reason?: string, ip?: string) {
    return this.persistResult(PMStore.reviewDocument(this.pmState(), requestId, docId, approved, { ...actor, ip }, reason));
  }

  pmRequestDocument(
    requestId: string,
    name: string,
    type: string,
    actor: { id: string; name: string },
    options?: { dueDate?: string; instructions?: string; requestedFrom?: string },
    ip?: string,
  ) {
    const doc = PMStore.requestDocument(this.pmState(), requestId, name, type, { ...actor, ip }, options);
    const r = this.getPMRequest(requestId);
    if (r) {
      const due = options?.dueDate ? ` by ${options.dueDate}` : "";
      const instructions = options?.instructions ? `\n\nInstructions: ${options.instructions}` : "";
      this.pmNotify(r.ownerId, [{ channel: "email", subject: "Document requested", body: `Please upload ${name}${due}.${instructions}` }]);
    }
    this.touch();
    return doc;
  }

  pmScheduleInspection(requestId: string, scheduledAt: string, actor: { id: string; name: string }, assignedTo?: string, ip?: string) {
    const insp = PMStore.scheduleInspection(this.pmState(), requestId, scheduledAt, { ...actor, ip }, assignedTo);
    const r = this.getPMRequest(requestId);
    if (r) {
      this.pmNotify(r.ownerId, [{ channel: "email", subject: "Inspection scheduled", body: `Inspection on ${scheduledAt}` }]);
      if (r.consultantId) this.pmNotify(r.consultantId, [{ channel: "email", subject: "Inspection assigned", body: scheduledAt }]);
    }
    this.touch();
    return insp;
  }

  pmRescheduleInspection(requestId: string, inspectionId: string, scheduledAt: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.rescheduleInspection(this.pmState(), requestId, inspectionId, scheduledAt, { ...actor, ip }));
  }

  pmCancelInspection(requestId: string, inspectionId: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.cancelInspection(this.pmState(), requestId, inspectionId, { ...actor, ip }));
  }

  pmAssignValuation(requestId: string, amount: number, currency: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.assignValuation(this.pmState(), requestId, amount, currency, { ...actor, ip }));
  }

  pmApproveValuation(requestId: string, valuationId: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.approveValuation(this.pmState(), requestId, valuationId, { ...actor, ip }));
  }

  pmGenerateQuotation(requestId: string, title: string, lineItems: Array<{ label: string; amount: number }>, currency: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.generateQuotation(this.pmState(), requestId, title, lineItems, currency, { ...actor, ip }));
  }

  pmGenerateAgreement(requestId: string, type: "MANAGEMENT" | "TENANCY", title: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.generateAgreement(this.pmState(), requestId, type, title, { ...actor, ip }));
  }

  pmSignAgreement(requestId: string, agreementId: string | undefined, actor: { id: string; name: string }, ip?: string) {
    const agreement = PMStore.signAgreement(this.pmState(), requestId, agreementId, { ...actor, ip });
    const r = this.getPMRequest(requestId);
    if (r && agreement) this.pmNotify(r.ownerId, [{ channel: "email", subject: "Agreement signed", body: `${agreement.title} has been signed.` }]);
    this.touch();
    return agreement;
  }

  pmActivateManagement(requestId: string, actor: { id: string; name: string }, ip?: string) {
    const r = PMStore.activateManagement(this.pmState(), requestId, { ...actor, ip });
    if (r) this.pmNotify(r.ownerId, [{ channel: "email", subject: "Property under management", body: `${r.propertyAddress} is now under active management.` }]);
    this.touch();
    return r;
  }

  pmGenerateInvoice(requestId: string, title: string, amount: number, currency: string, dueDate: string, actor: { id: string; name: string }, ip?: string) {
    const inv = PMStore.generateInvoice(this.pmState(), requestId, title, amount, currency, dueDate, { ...actor, ip });
    const r = this.getPMRequest(requestId);
    if (r && inv) this.pmNotify(r.ownerId, [{ channel: "email", subject: `Invoice: ${title}`, body: `Amount due: $${amount} by ${dueDate}` }]);
    this.touch();
    return inv;
  }

  pmEmailDocument(requestId: string, documentType: string, documentId: string, actor: { id: string; name: string }, ip?: string) {
    const r = this.getPMRequest(requestId);
    if (!r) return null;
    const collections = [
      ...r.valuations.map((item) => ({ type: "valuation", id: item.id, title: `Valuation ${item.currency} ${item.amount.toLocaleString()}` })),
      ...r.quotations.map((item) => ({ type: "quotation", id: item.id, title: item.title })),
      ...r.agreements.map((item) => ({ type: "agreement", id: item.id, title: item.title })),
      ...r.invoices.map((item) => ({ type: "invoice", id: item.id, title: item.title })),
      ...r.documents.map((item) => ({ type: "document", id: item.id, title: item.name })),
      ...r.inspections.map((item) => ({ type: "inspection", id: item.id, title: `Inspection ${new Date(item.scheduledAt).toLocaleDateString()}` })),
    ];
    const found = collections.find((item) => item.type === documentType && item.id === documentId);
    if (!found) return null;
    this.pmNotify(r.ownerId, [
      {
        channel: "email",
        subject: `${found.title} - ${r.requestNumber}`,
        body: `${actor.name} sent ${found.title} for ${r.propertyAddress}. Please sign in to HomeLink to review the document and download the PDF.`,
      },
    ]);
    PMStore.addNote(this.pmState(), requestId, {
      authorId: actor.id,
      authorName: actor.name,
      body: `Emailed ${found.type}: ${found.title}`,
      internal: true,
    }, { ...actor, ip });
    this.touch();
    return r;
  }

  pmLinkPayment(requestId: string, paymentId: string, invoiceId: string | undefined, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.linkPayment(this.pmState(), requestId, paymentId, invoiceId, { ...actor, ip }));
  }

  pmArchive(requestId: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.archiveRequest(this.pmState(), requestId, { ...actor, ip }));
  }

  pmDelete(requestId: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.deleteRequest(this.pmState(), requestId, { ...actor, ip }));
  }

  pmRestore(requestId: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.restoreRequest(this.pmState(), requestId, { ...actor, ip }));
  }

  pmMerge(targetId: string, sourceId: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.mergeRequests(this.pmState(), targetId, sourceId, { ...actor, ip }));
  }

  pmTransfer(requestId: string, newOwnerId: string, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.transferOwnership(this.pmState(), requestId, newOwnerId, { ...actor, ip }));
  }

  pmAddOffer(requestId: string, offer: Omit<import("@/lib/property-management/types").PMOffer, "id" | "createdAt" | "status">, actor: { id: string; name: string }, ip?: string) {
    const o = PMStore.addOffer(this.pmState(), requestId, offer, { ...actor, ip });
    const r = this.getPMRequest(requestId);
    if (r) this.pmNotify(r.ownerId, [{ channel: "email", subject: "New offer received", body: `${offer.partyName} offered $${offer.amount}` }]);
    this.touch();
    return o;
  }

  pmAddInterestedParty(requestId: string, party: Omit<import("@/lib/property-management/types").InterestedParty, "id" | "createdAt">, actor: { id: string; name: string }, ip?: string) {
    return this.persistResult(PMStore.addInterestedParty(this.pmState(), requestId, party, { ...actor, ip }));
  }

  getConsultantMetrics(consultantId: string) {
    return PMStore.getConsultantMetrics(this.pmState(), consultantId);
  }

  listConsultants() {
    return [...this.state.users.values()]
      .filter((u) => u.roles.includes("CONSULTANT"))
      .map((u) => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        city: u.city,
        agencyId: u.agencyId,
        agencyName: u.agencyId ? this.getAgency(u.agencyId)?.name : undefined,
        performanceScore: u.performanceScore,
        ...PMStore.getConsultantMetrics(this.pmState(), u.id),
      }));
  }

  getPMPublicStats() {
    const consultants = this.listConsultants().length;
    const requests = this.listPMRequests();
    const managed = requests.filter((r) => ["APPROVED", "IN_PROGRESS", "CLOSED"].includes(r.status)).length;
    const revenue = this.listAllPayments()
      .filter((p) => p.status === "PAID")
      .reduce((s, p) => s + p.amount, 0);
    const avgScore =
      consultants > 0
        ? Math.round(
            this.listConsultants().reduce((s, c) => s + c.performanceScore, 0) / consultants,
          ) / 20
        : 4.9;

    return {
      consultants,
      propertiesManaged: Math.max(managed, requests.length),
      rating: Math.min(5, Math.round(avgScore * 10) / 10 || 4.9),
      transactionValue: `$${revenue.toLocaleString()}`,
      live: { consultants, managed, requests: requests.length, revenue },
    };
  }

  pmRunAction(
    requestId: string,
    action: string,
    actor: { id: string; name: string },
    params?: Record<string, unknown>,
    ip?: string,
  ) {
    switch (action) {
      case "assign_consultant":
        return this.pmAssignConsultant(requestId, params!.consultantId as string, actor, ip);
      case "assign_agency":
        return this.pmAssignAgency(requestId, params!.agencyId as string, actor, ip);
      case "approve":
        return this.pmSetStatus(requestId, "APPROVED", actor, params?.reason as string, ip);
      case "reject":
        return this.pmSetStatus(requestId, "REJECTED", actor, params?.reason as string, ip);
      case "pause":
        return this.pmSetStatus(requestId, "PAUSED", actor, params?.reason as string | undefined, ip);
      case "resume":
        return this.pmSetStatus(requestId, "IN_PROGRESS", actor, params?.reason as string | undefined, ip);
      case "close":
        return this.pmSetStatus(requestId, "CLOSED", actor, params?.reason as string | undefined, ip);
      case "archive":
        return this.pmArchive(requestId, actor, ip);
      case "delete":
        return this.pmDelete(requestId, actor, ip);
      case "restore":
        return this.pmRestore(requestId, actor, ip);
      case "merge":
        return this.pmMerge(requestId, params!.sourceId as string, actor, ip);
      case "transfer":
        return this.pmTransfer(requestId, params!.newOwnerId as string, actor, ip);
      case "add_note":
        return this.pmAddNote(requestId, params!.body as string, Boolean(params?.internal), actor, ip);
      case "upload_document":
        return this.pmUploadDocument(requestId, params!.name as string, params!.type as string, params!.url as string, actor, ip);
      case "approve_document":
        return this.pmReviewDocument(requestId, params!.docId as string, true, actor, undefined, ip);
      case "reject_document":
        return this.pmReviewDocument(requestId, params!.docId as string, false, actor, params?.reason as string, ip);
      case "request_document":
        return this.pmRequestDocument(
          requestId,
          params!.name as string,
          params!.type as string,
          actor,
          {
            dueDate: params?.dueDate as string | undefined,
            instructions: params?.instructions as string | undefined,
            requestedFrom: params?.requestedFrom as string | undefined,
          },
          ip,
        );
      case "schedule_inspection":
        return this.pmScheduleInspection(requestId, params!.scheduledAt as string, actor, params?.assignedTo as string, ip);
      case "reschedule_inspection":
        return this.pmRescheduleInspection(requestId, params!.inspectionId as string, params!.scheduledAt as string, actor, ip);
      case "cancel_inspection":
        return this.pmCancelInspection(requestId, params!.inspectionId as string, actor, ip);
      case "assign_valuation":
        return this.pmAssignValuation(requestId, Number(params!.amount), (params!.currency as string) ?? "USD", actor, ip);
      case "approve_valuation":
        return this.pmApproveValuation(requestId, params!.valuationId as string, actor, ip);
      case "generate_quotation":
        return this.pmGenerateQuotation(requestId, params!.title as string, params!.lineItems as Array<{ label: string; amount: number }>, (params!.currency as string) ?? "USD", actor, ip);
      case "generate_agreement":
        return this.pmGenerateAgreement(requestId, params!.type as "MANAGEMENT" | "TENANCY", params!.title as string, actor, ip);
      case "sign_agreement":
        return this.pmSignAgreement(requestId, params?.agreementId as string | undefined, actor, ip);
      case "activate_management":
        return this.pmActivateManagement(requestId, actor, ip);
      case "generate_invoice":
        return this.pmGenerateInvoice(requestId, params!.title as string, Number(params!.amount), (params!.currency as string) ?? "USD", params!.dueDate as string, actor, ip);
      case "email_document":
        return this.pmEmailDocument(requestId, params!.documentType as string, params!.documentId as string, actor, ip);
      case "link_payment":
        return this.pmLinkPayment(requestId, params!.paymentId as string, params?.invoiceId as string | undefined, actor, ip);
      case "add_offer":
        return this.pmAddOffer(requestId, params as Omit<import("@/lib/property-management/types").PMOffer, "id" | "createdAt" | "status">, actor, ip);
      case "add_interested_party":
        return this.pmAddInterestedParty(requestId, params as Omit<import("@/lib/property-management/types").InterestedParty, "id" | "createdAt">, actor, ip);
      default:
        return null;
    }
  }

  // ——— Agent platform ———

  getAgentState(): AgentPlatformState {
    return this.state.agents;
  }

  getAgentSettings() {
    AgentPlatform.ensureCommissionRuleCoverage(this.state.agents);
    return this.state.agents.settings;
  }

  updateAgentSettings(settings: Partial<import("@/lib/agents/types").AgentSystemSettings>) {
    return this.persistResult(AgentPlatform.updateAgentSettings(this.state.agents, settings));
  }

  updateAgentCommissionRules(rules: import("@/lib/agents/types").CommissionRule[], actor?: { id: string; name: string }, reason = "Commission rules updated by administrator.") {
    const previous = this.state.agents.settings.commissionRules;
    const updated = AgentPlatform.updateCommissionRules(this.state.agents, rules);
    if (actor) {
      this.recordAudit({
        actorId: actor.id,
        actorName: actor.name,
        action: "UPDATE_AGENT_COMMISSION_RULES",
        target: "agent_commission_rules",
        targetType: "AGENT_SETTINGS",
        metadata: {
          reason,
          oldRules: previous.map((rule) => ({
            id: rule.id,
            homelinkSplitPercent: rule.homelinkSplitPercent,
            agentSplitPercent: rule.agentSplitPercent,
            active: rule.active,
          })),
          newRules: rules.map((rule) => ({
            id: rule.id,
            homelinkSplitPercent: rule.homelinkSplitPercent,
            agentSplitPercent: rule.agentSplitPercent,
            active: rule.active,
          })),
        },
        ip: "127.0.0.1",
      });
    }
    this.touch();
    return updated;
  }

  listAgentApplications() {
    return this.state.agents.applications;
  }

  getAgentApplication(id: string) {
    return this.state.agents.applications.find((a) => a.id === id);
  }

  getAgentApplicationByUser(userId: string) {
    return this.state.agents.applications.find((a) => a.userId === userId);
  }

  saveAgentApplication(application: import("@/lib/agents/types").AgentApplication) {
    return this.persistResult(AgentPlatform.upsertApplication(this.state.agents, application));
  }

  submitAgentApplication(applicationId: string) {
    const application = AgentPlatform.submitApplication(this.state.agents, applicationId, (userId, subject, body) => {
      this.createNotification(userId, { channel: "IN_APP", subject, body });
    });
    this.touch();
    return application;
  }

  updateAgentApplicationStatus(
    applicationId: string,
    status: import("@/lib/agents/types").AgentApplicationStatus,
    actor: { id: string; name: string },
    note?: string,
  ) {
    const application = AgentPlatform.updateApplicationStatus(
      this.state.agents,
      applicationId,
      status,
      actor,
      note,
      (userId, subject, body) => {
        this.createNotification(userId, { channel: "IN_APP", subject, body });
      },
    );
    this.touch();
    return application;
  }

  approveAgentApplication(applicationId: string, actor: { id: string; name: string }) {
    const application = AgentPlatform.approveApplication(
      this.state.agents,
      applicationId,
      (id) => this.getUserById(id) ?? undefined,
      (userId) => this.assignRole(userId, "AGENT", actor),
      actor,
      (userId, subject, body) => {
        this.createNotification(userId, { channel: "IN_APP", subject, body });
      },
    );
    this.touch();
    return application;
  }

  getAgentProfileByUserId(userId: string) {
    return AgentPlatform.getAgentProfileByUserId(this.state.agents, userId);
  }

  getAgentProfileBySlug(slug: string) {
    return AgentPlatform.getAgentProfileBySlug(this.state.agents, slug);
  }

  listAgentProfiles() {
    return this.state.agents.profiles;
  }

  updateAgentProfile(userId: string, updates: Partial<import("@/lib/agents/types").AgentProfile>) {
    const profile = this.getAgentProfileByUserId(userId);
    if (!profile) return null;
    Object.assign(profile, updates, { updatedAt: new Date().toISOString() });
    this.touch();
    return profile;
  }

  listAgentLeads(agentId?: string) {
    return agentId
      ? this.state.agents.leads.filter((l) => l.assignedAgentId === agentId)
      : this.state.agents.leads;
  }

  updateAgentLeadStatus(leadId: string, status: import("@/lib/agents/types").LeadStatus, notes?: string) {
    return this.persistResult(AgentPlatform.updateLeadStatus(this.state.agents, leadId, status, notes));
  }

  reassignAgentLead(leadId: string, agentUserId: string) {
    return this.persistResult(AgentPlatform.reassignLead(
      this.state.agents,
      leadId,
      agentUserId,
      (id) => this.getUserById(id) ?? undefined,
    ));
  }

  updateAgentLeadOwnership(
    leadId: string,
    updates: { leadSource?: import("@/lib/agents/types").LeadSource; assignedAgentId?: string },
    actor: { id: string; name: string },
    reason: string,
  ) {
    const lead = AgentPlatform.updateLeadOwnership(
      this.state.agents,
      leadId,
      updates,
      actor,
      reason,
      (id) => this.getUserById(id) ?? undefined,
    );
    if (lead?.assignedAgentId) {
      this.createNotification(lead.assignedAgentId, {
        channel: "IN_APP",
        subject: "Lead ownership updated",
        body: this.state.agents.settings.notificationTemplates.lead_ownership_changed,
      });
    }
    this.touch();
    return lead;
  }

  closeAgentLead(leadId: string, type: import("@/lib/agents/types").CommissionType, dealAmount: number) {
    const commission = AgentPlatform.completeLeadAsDeal(
      this.state.agents,
      leadId,
      type,
      dealAmount,
      (id) => this.getUserById(id) ?? undefined,
    );
    if (commission) {
      this.createNotification(commission.agentId, {
        channel: "IN_APP",
        subject: "Commission recorded",
        body: `${this.state.agents.settings.notificationTemplates.commission_created} Rule: ${commission.commissionRuleLabel ?? "Configured commission rule"}. Split: HomeLink ${commission.ruleSnapshot.homelinkSplitPercent}% / Agent ${commission.ruleSnapshot.agentSplitPercent}%.`,
      });
      this.createNotification(commission.agentId, {
        channel: "IN_APP",
        subject: "Transaction closed",
        body: this.state.agents.settings.notificationTemplates.transaction_closed,
      });
    }
    this.touch();
    return commission;
  }

  listAgentCommissions(agentId?: string) {
    AgentPlatform.normalizeCommissionRecords(this.state.agents);
    return agentId
      ? this.state.agents.commissions.filter((c) => c.agentId === agentId)
      : this.state.agents.commissions;
  }

  payAgentCommission(
    commissionId: string,
    actor: { id: string; name: string },
    payout: Omit<import("@/lib/agents/types").AgentCommissionPayout, "processedBy">,
  ) {
    const commission = AgentPlatform.payCommission(this.state.agents, commissionId, {
      ...payout,
      processedBy: actor.name,
    });
    if (commission) {
      this.createNotification(commission.agentId, {
        channel: "IN_APP",
        subject: "Commission paid",
        body: this.state.agents.settings.notificationTemplates.commission_paid,
      });
      this.recordAudit({
        actorId: actor.id,
        actorName: actor.name,
        action: "PAY_AGENT_COMMISSION",
        target: commissionId,
        targetType: "COMMISSION",
        metadata: {
          amount: commission.netAgentAmount,
          method: commission.payout?.method,
          sourceAccount: commission.payout?.sourceAccount,
          destinationAccount: commission.payout?.destinationAccount,
          reference: commission.payout?.reference,
        },
        ip: "127.0.0.1",
      });
      this.touch();
    }
    return commission;
  }

  approveAgentCommission(commissionId: string, actor: { id: string; name: string }, reason?: string) {
    const commission = AgentPlatform.approveCommission(this.state.agents, commissionId, actor, reason);
    if (commission) {
      this.createNotification(commission.agentId, {
        channel: "IN_APP",
        subject: "Commission approved",
        body: this.state.agents.settings.notificationTemplates.commission_approved,
      });
    }
    this.touch();
    return commission;
  }

  updateAgentCommissionStatus(
    commissionId: string,
    status: Exclude<import("@/lib/agents/types").CommissionStatus, "PAID">,
    actor: { id: string; name: string },
    reason: string,
  ) {
    const commission = AgentPlatform.updateCommissionStatus(this.state.agents, commissionId, status, actor, reason);
    if (commission) {
      this.createNotification(commission.agentId, {
        channel: "IN_APP",
        subject: `Commission ${status.toLowerCase()}`,
        body: reason,
      });
    }
    this.touch();
    return commission;
  }

  getAgentDashboardStats(agentId: string) {
    AgentPlatform.normalizeCommissionRecords(this.state.agents);
    const listings = this.state.listings.filter((l) => l.ownerId === agentId);
    const activeListings = listings.filter((l) => l.status === "ACTIVE").length;
    return AgentPlatform.getAgentDashboardStats(this.state.agents, agentId, listings.length, activeListings);
  }

  getAgentAdminAnalytics() {
    AgentPlatform.normalizeCommissionRecords(this.state.agents);
    return AgentPlatform.getAgentAdminAnalytics(this.state.agents, (id) => this.getUserById(id)?.name ?? "Agent");
  }

  listAgentTerritories() {
    return this.state.agents.territories;
  }

  saveAgentTerritory(territory: import("@/lib/agents/types").AgentTerritory) {
    const idx = this.state.agents.territories.findIndex((t) => t.id === territory.id);
    if (idx >= 0) this.state.agents.territories[idx] = territory;
    else this.state.agents.territories.push(territory);
    this.touch();
    return territory;
  }

  listAgentTrainingModules() {
    return this.state.agents.trainingModules;
  }

  getAgentTrainingProgress(agentId: string) {
    return this.state.agents.trainingProgress.filter((p) => p.agentId === agentId);
  }

  completeAgentTraining(agentId: string, moduleId: string, score?: number) {
    return this.persistResult(AgentPlatform.completeTrainingModule(this.state.agents, agentId, moduleId, score));
  }

  addAgentRating(input: Omit<import("@/lib/agents/types").AgentRating, "id" | "createdAt" | "overall">) {
    const rating = AgentPlatform.addAgentRating(this.state.agents, input);
    this.createNotification(input.agentId, {
      channel: "IN_APP",
      subject: "New review",
      body: this.state.agents.settings.notificationTemplates.review_received,
    });
    this.touch();
    return rating;
  }

  listAgentRatings(agentId: string) {
    return this.state.agents.ratings.filter((r) => r.agentId === agentId);
  }

  listAgentAppointments(agentId: string) {
    return this.state.agents.appointments.filter((a) => a.agentId === agentId);
  }

  createAgentAppointment(appointment: Omit<import("@/lib/agents/types").AgentAppointment, "id">) {
    const record = { ...appointment, id: `appt_${crypto.randomUUID()}` };
    this.state.agents.appointments.unshift(record);
    this.touch();
    return record;
  }

  listAgentTasks(agentId: string) {
    return this.state.agents.tasks.filter((t) => t.agentId === agentId);
  }

  listAgentWallet(agentId: string) {
    return this.state.agents.walletEntries.filter((e) => e.agentId === agentId);
  }

  calculateAgentCommission(type: import("@/lib/agents/types").CommissionType, amount: number) {
    return AgentPlatform.calculateCommission(this.state.agents, type, amount);
  }

  getRateableAgentDeal(customerId: string, listingId: string) {
    return AgentPlatform.findRateableDeal(
      this.state.agents,
      customerId,
      listingId,
      (id) => this.getUserById(id) ?? undefined,
    );
  }

  deleteAgentTerritory(territoryId: string) {
    return this.persistResult(AgentPlatform.deleteTerritory(this.state.agents, territoryId));
  }

  getHomepageSnapshot() {
    return {
      verifiedTenancyCount: new Set(
        this.state.residenceRecords.filter((r) => r.verified).map((r) => r.tenancyId),
      ).size,
      roommateProfileCount: this.state.roommateProfiles.size,
      agentRatings: this.state.agents.ratings,
    };
  }

  getHomepageCms(): HomepageCmsConfig {
    return this.state.homepage.cms;
  }

  updateHomepageCms(updates: Partial<HomepageCmsConfig>, actor: { id: string; name: string }) {
    this.state.homepage.cms = {
      ...this.state.homepage.cms,
      ...updates,
      hero: { ...this.state.homepage.cms.hero, ...updates.hero },
      finalCta: { ...this.state.homepage.cms.finalCta, ...updates.finalCta },
      agentPromo: { ...this.state.homepage.cms.agentPromo, ...updates.agentPromo },
      seo: { ...this.state.homepage.cms.seo, ...updates.seo },
      testimonials: updates.testimonials ?? this.state.homepage.cms.testimonials,
      banners: updates.banners ?? this.state.homepage.cms.banners,
      trustMetrics: updates.trustMetrics ?? this.state.homepage.cms.trustMetrics,
      propertyTypes: updates.propertyTypes ?? this.state.homepage.cms.propertyTypes,
      pages: updates.pages ?? this.state.homepage.cms.pages,
      featuredListingIds: updates.featuredListingIds ?? this.state.homepage.cms.featuredListingIds,
      featuredAgentProfileIds: updates.featuredAgentProfileIds ?? this.state.homepage.cms.featuredAgentProfileIds,
    };
    this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      action: "UPDATE_HOMEPAGE_CMS",
      target: "homepage",
      targetType: "SETTINGS",
      metadata: { keys: Object.keys(updates) },
      ip: "admin",
    });
    return this.state.homepage.cms;
  }

  listHomepageTestimonials(): HomeTestimonial[] {
    return this.state.homepage.cms.testimonials.filter((t) => t.published !== false);
  }

  updateHomepageTestimonials(testimonials: HomeTestimonial[], actor: { id: string; name: string }) {
    return this.updateHomepageCms({ testimonials }, actor).testimonials;
  }

  createHolidayBookingEnquiry(input: {
    listingId: string;
    guestUserId: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    message?: string;
  }) {
    const listing = this.getListing(input.listingId);
    if (!listing || listing.type !== "holiday_home") {
      return { error: "Holiday home listing not found." };
    }

    const agentLead = this.state.agents.leads.find((l) => l.listingId === listing.id);
    const result = HolidayPlatform.createHolidayBookingEnquiry(this.state.holidayHomes, {
      listing,
      guestUserId: input.guestUserId,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      message: input.message,
      agentId: agentLead?.assignedAgentId,
    });

    if (result.error) return { error: result.error };

    this.incrementListingMetric(listing.id, "enquiries");
    const enquiry = result.enquiry;

    this.createNotification(listing.ownerId, {
      channel: "IN_APP",
      subject: "New holiday booking enquiry",
      body: `${input.guestName} requested ${input.checkIn} to ${input.checkOut} (${input.guests} guests).`,
    });

    if (enquiry.agentId) {
      this.createNotification(enquiry.agentId, {
        channel: "IN_APP",
        subject: "Holiday booking enquiry",
        body: `New stay request for ${listing.title}.`,
      });
    }

    for (const user of this.listUsers({ role: "ADMIN" })) {
      this.createNotification(user.id, {
        channel: "IN_APP",
        subject: "Holiday booking enquiry",
        body: `${listing.title}: ${input.guestName}, ${input.checkIn} – ${input.checkOut}.`,
      });
    }

    this.createEnquiry({
      listingId: listing.id,
      seekerId: input.guestUserId,
      seekerName: input.guestName,
      seekerEmail: input.guestEmail,
      seekerPhone: input.guestPhone,
      enquiryType: "BOOK_HOLIDAY",
      message: input.message ?? `Holiday stay ${input.checkIn} to ${input.checkOut}, ${input.guests} guests`,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      subjectType: "HOLIDAY",
      holidayBookingId: enquiry.id,
      estimatedNights: enquiry.estimatedNights,
      estimatedTotal: enquiry.estimatedTotal,
      source: "HOLIDAY_BOOKING",
    });

    this.touch();
    return { enquiry };
  }

  listHolidayBookingEnquiries(filters?: { ownerId?: string; agentId?: string; listingId?: string }) {
    return this.state.holidayHomes.bookingEnquiries.filter((e) => {
      if (filters?.ownerId && e.ownerId !== filters.ownerId) return false;
      if (filters?.agentId && e.agentId !== filters.agentId) return false;
      if (filters?.listingId && e.listingId !== filters.listingId) return false;
      return true;
    });
  }

  updateHolidayBookingEnquiryStatus(enquiryId: string, status: HolidayBookingStatus, actorId: string, note?: string) {
    const enquiry = HolidayPlatform.updateHolidayBookingStatus(this.state.holidayHomes, enquiryId, status);
    if (!enquiry) return null;

    const guestMsg =
      status === "ACCEPTED"
        ? "Your holiday booking request was accepted."
        : status === "DECLINED"
          ? "Your holiday booking request was declined."
          : "Your holiday booking request was updated.";

    this.createNotification(enquiry.guestUserId, {
      channel: "IN_APP",
      subject: `Booking ${status.toLowerCase()}`,
      body: note ? `${guestMsg} Note: ${note}` : guestMsg,
    });

    if (status === "ACCEPTED" || status === "DECLINED") {
      this.createNotification(actorId, {
        channel: "IN_APP",
        subject: "Booking response sent",
        body: note ? `You ${status.toLowerCase()} the enquiry for ${enquiry.listingTitle}. Note: ${note}` : `You ${status.toLowerCase()} the enquiry for ${enquiry.listingTitle}.`,
      });
    }

    this.touch();
    return enquiry;
  }

  addHolidayHomeReview(input: {
    listingId: string;
    reviewerUserId: string;
    reviewerName: string;
    cleanliness: number;
    location: number;
    communication: number;
    valueForMoney: number;
    comment?: string;
  }) {
    const listing = this.getListing(input.listingId);
    if (!listing || listing.type !== "holiday_home") return null;

    const review = HolidayPlatform.addHolidayHomeReview(this.state.holidayHomes, input);
    this.createNotification(listing.ownerId, {
      channel: "IN_APP",
      subject: "New holiday home review",
      body: `${input.reviewerName} left a ${review.overallExperience}★ review.`,
    });
    this.touch();
    return review;
  }

  getHolidayHomeReviewSummary(listingId: string) {
    return HolidayPlatform.getHolidayHomeReviewSummary(this.state.holidayHomes, listingId);
  }

  listHolidayHomeReviews(listingId?: string) {
    return listingId
      ? this.state.holidayHomes.reviews.filter((r) => r.listingId === listingId)
      : this.state.holidayHomes.reviews;
  }

  removeHolidayHomeReview(reviewId: string, actor: { id: string; name: string }) {
    const removed = HolidayPlatform.removeHolidayHomeReview(this.state.holidayHomes, reviewId);
    if (removed) {
      this.recordAudit({
        actorId: actor.id,
        actorName: actor.name,
        action: "REMOVE_HOLIDAY_REVIEW",
        target: reviewId,
        targetType: "REVIEW",
        metadata: { listingId: removed.listingId },
        ip: "admin",
      });
      this.touch();
    }
    return removed;
  }

  getHolidayHomeSettings() {
    return this.state.holidayHomes.settings;
  }

  updateHolidayHomeSettings(settings: Partial<HolidayHomeSettings>, actor: { id: string; name: string }) {
    const updated = HolidayPlatform.updateHolidayHomeSettings(this.state.holidayHomes, settings);
    this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      action: "UPDATE_HOLIDAY_HOME_SETTINGS",
      target: "holiday_homes",
      targetType: "SETTINGS",
      metadata: { ...settings },
      ip: "admin",
    });
    this.touch();
    return updated;
  }

  getHolidayHomeAnalytics(ownerId?: string) {
    const listings = ownerId
      ? this.state.listings.filter((l) => l.ownerId === ownerId && l.type === "holiday_home")
      : this.state.listings.filter((l) => l.type === "holiday_home");
    return HolidayPlatform.computeHolidayHomeAnalytics(this.state.holidayHomes, listings);
  }

  listHolidayHomeListings() {
    return this.state.listings.filter((l) => l.type === "holiday_home");
  }

  getAgencyDashboard(agencyId: string) {
    const agency = this.getAgency(agencyId);
    if (!agency) return null;

    const agents = [...this.state.users.values()].filter(
      (u) => u.agencyId === agencyId && u.roles.includes("AGENT") && u.accountStatus === "ACTIVE",
    );
    const agentIds = new Set(agents.map((a) => a.id));
    const listings = this.state.listings.filter((l) => agentIds.has(l.ownerId));

    const agentRows = agents.map((agent) => {
      const agentListings = this.state.listings.filter((l) => l.ownerId === agent.id);
      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        listings: agentListings.length,
        enquiries: agentListings.reduce((sum, l) => sum + l.enquiries, 0),
        views: agentListings.reduce((sum, l) => sum + l.views, 0),
        performanceScore: agent.performanceScore,
      };
    });

    return {
      agency,
      agents: agentRows,
      listings: listings.map((l) => ({
        id: l.id,
        title: l.title,
        suburb: l.suburb,
        city: l.city,
        type: l.type,
        verified: l.verified,
        trustScore: l.trustScore ?? 0,
        views: l.views,
        enquiries: l.enquiries,
        status: l.status,
        ownerName: this.getUserById(l.ownerId)?.name ?? "Agent",
      })),
      totals: {
        listings: listings.length,
        agents: agents.length,
        enquiries: listings.reduce((sum, l) => sum + l.enquiries, 0),
        views: listings.reduce((sum, l) => sum + l.views, 0),
        verifiedListings: listings.filter((l) => l.verified).length,
        approvalRate:
          listings.length > 0
            ? Math.round((listings.filter((l) => l.verified).length / listings.length) * 100)
            : 0,
      },
    };
  }

  inviteAgencyAgent(
    agencyId: string,
    input: { name: string; email: string },
    actor: { id: string; name: string },
  ) {
    const agency = this.getAgency(agencyId);
    if (!agency) return { error: "Agency not found." };

    const email = input.email.toLowerCase().trim();
    if (this.getUserByEmail(email)) {
      return { error: "A user with this email already exists." };
    }

    const temporaryPassword = `HL-${crypto.randomUUID().slice(0, 8)}`;
    const user = baseUser({
      id: `user_${crypto.randomUUID()}`,
      email,
      passwordHash: hashPassword(temporaryPassword),
      name: input.name.trim(),
      city: agency.city,
      roles: ["AGENT"],
      agencyId,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      verification: { identity: "PENDING", phone: "PENDING", email: "VERIFIED" },
    });

    this.state.users.set(user.id, user);
    this.state.favourites.set(user.id, new Set());
    agency.agentCount += 1;
    this.state.agencies.set(agencyId, agency);

    this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      action: "INVITE_AGENCY_AGENT",
      target: user.id,
      targetType: "USER",
      metadata: { agencyId, email },
      ip: "127.0.0.1",
    });

    this.createNotification(user.id, {
      channel: "IN_APP",
      subject: "Agency account created",
      body: `${agency.name} invited you to HomeLink. Sign in with your temporary setup password and update your profile.`,
    });

    return { user: this.publicUser(user), temporaryPassword };
  }
}

const STORE_VERSION = 18;
const globalStore = globalThis as typeof globalThis & {
  __homelinkStore?: AppStore;
  __homelinkStoreVersion?: number;
  __settingsHydrateStarted?: boolean;
  __settingsHydratePromise?: Promise<void>;
  __storeHydrateStarted?: boolean;
  __homelinkStoreHydrated?: boolean;
  __homelinkStorePersistPending?: boolean;
  __homelinkStoreHydratePromise?: Promise<void>;
  __homelinkLegacyStoreWarningShown?: boolean;
};

function isStrictProduction() {
  return process.env.HOMELINK_STRICT_PRODUCTION === "true";
}

function isPostgresBackedRuntime() {
  return Boolean(process.env.DATABASE_URL?.match(/^postgres(ql)?:\/\//));
}

export function getStore() {
  if (
    isStrictProduction() &&
    process.env.HOMELINK_ALLOW_LEGACY_STORE !== "true" &&
    isPostgresBackedRuntime()
  ) {
    throw new Error(
      "Legacy in-memory AppStore is disabled in strict production. Route must use typed Postgres persistence.",
    );
  }
  if (!globalStore.__homelinkStore || globalStore.__homelinkStoreVersion !== STORE_VERSION) {
    const synced = loadPersistedStoreSync(STORE_VERSION);
    globalStore.__homelinkStore = synced
      ? new AppStore(synced as StoreState)
      : new AppStore();
    globalStore.__homelinkStoreVersion = STORE_VERSION;
    globalStore.__settingsHydrateStarted = false;
    globalStore.__settingsHydratePromise = undefined;
    globalStore.__storeHydrateStarted = false;
    globalStore.__homelinkStoreHydrated = Boolean(synced);
    globalStore.__homelinkStorePersistPending = false;
    globalStore.__homelinkStoreHydratePromise = undefined;

    if (!synced && !isStrictProduction()) {
      void persistStoreState(globalStore.__homelinkStore.snapshotState(), STORE_VERSION);
    }
  }
  if (!isStrictProduction() && !globalStore.__storeHydrateStarted) {
    globalStore.__storeHydrateStarted = true;
    globalStore.__homelinkStoreHydratePromise = loadPersistedStore(STORE_VERSION).then((loaded) => {
      if (loaded && globalStore.__homelinkStore && globalStore.__homelinkStoreVersion === STORE_VERSION) {
        globalStore.__homelinkStore.hydratePersistedState(loaded);
      }
      globalStore.__homelinkStoreHydrated = true;
      if (globalStore.__homelinkStorePersistPending && globalStore.__homelinkStore) {
        globalStore.__homelinkStorePersistPending = false;
        scheduleStorePersist(globalStore.__homelinkStore.snapshotState(), STORE_VERSION);
      }
    });
  }
  if (!globalStore.__settingsHydrateStarted) {
    globalStore.__settingsHydrateStarted = true;
    globalStore.__settingsHydratePromise = import("@/lib/settings/persist").then(({ loadPersistedSettings }) =>
      loadPersistedSettings().then((persisted) => {
        if (persisted && globalStore.__homelinkStore) {
          globalStore.__homelinkStore.applyPersistedSettings(persisted);
        }
      }),
    );
  }
  return globalStore.__homelinkStore;
}

export async function getHydratedStore() {
  const store = getStore();
  await globalStore.__homelinkStoreHydratePromise;
  await globalStore.__settingsHydratePromise;
  return store;
}

export function toPublicListing(listing: ListingRecord) {
  const {
    ownerId: _ownerId,
    latitude,
    longitude,
    phone: _phone,
    whatsapp: _whatsapp,
    propertyOwnerEmail: _propertyOwnerEmail,
    propertyOwnerPhone: _propertyOwnerPhone,
    ...publicListing
  } = listing;
  return { ...publicListing, phone: "", whatsapp: "", latitude, longitude };
}
