import crypto from "node:crypto";
import { PrismaClient, Role, VerificationStatus } from "@prisma/client";

const prisma = new PrismaClient();

const standardPassword = requireSeedPassword("SEED_STANDARD_PASSWORD");
const adminPassword = requireSeedPassword("SEED_ADMIN_PASSWORD");

const users = [
  { email: "admin@homelinkzim.co.zw", name: "HomeLink Admin", phone: "+263780000001", roles: [Role.ADMIN, Role.SEEKER], password: adminPassword },
  { id: "user_seeker_tinashe", email: "tinashe.dube@homelinkzim.co.zw", name: "Tinashe Dube", phone: "+263770000000", roles: [Role.SEEKER, Role.LANDLORD], password: process.env.SEED_TINASHE_PASSWORD ?? standardPassword },
  { id: "user_landlord", email: "landlord@homelinkzim.co.zw", name: "Tariro Moyo", phone: "+263771234568", roles: [Role.LANDLORD, Role.SEEKER], password: process.env.SEED_LANDLORD_PASSWORD ?? standardPassword },
  { id: "user_agent_blessing", email: "blessing@harareprime.co.zw", name: "Blessing Muzenda", phone: "+263775678901", roles: [Role.AGENT, Role.SEEKER], password: standardPassword },
  { email: "tariro.moyo@homelinkzim.co.zw", name: "Tariro Moyo", phone: "+263771234567", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "tendai.sithole@homelinkzim.co.zw", name: "Tendai Sithole", phone: "+263772220001", roles: [Role.AGENT, Role.SEEKER], password: standardPassword },
  { email: "rudo.ncube@homelinkzim.co.zw", name: "Rudo Ncube", phone: "+263773330002", roles: [Role.SEEKER], password: standardPassword },
  { email: "memory.chikanda@homelinkzim.co.zw", name: "Memory Chikanda", phone: "+263719002214", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
];

const listings = [
  {
    slug: "harare-avondale-cottage",
    ownerEmail: "landlord@homelinkzim.co.zw",
    title: "Verified garden cottage near Avondale shops",
    description: "A quiet one-bedroom garden cottage with reliable water, solar backup, secure parking, and fast access to Avondale shops.",
    propertyType: "COTTAGE",
    intent: "RENT",
    status: "ACTIVE",
    price: 420,
    city: "Harare",
    suburb: "Avondale",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/roommates/photo-cottage-avondale.jpg",
    amenities: { wifi: true, solarBackup: true, borehole: true, parking: true, garden: true },
  },
  {
    slug: "family-home-with-borehole-in-hillside-seed02",
    ownerEmail: "tariro.moyo@homelinkzim.co.zw",
    title: "Family home with borehole in Hillside",
    description: "A spacious family home with a private garden, borehole, perimeter security, and room for remote work or study.",
    propertyType: "HOUSE",
    intent: "RENT",
    status: "ACTIVE",
    price: 950,
    city: "Bulawayo",
    suburb: "Hillside",
    bedrooms: 4,
    bathrooms: 2,
    image: "/images/bulawayo-family-house.png",
    amenities: { borehole: true, securityWall: true, garden: true, petFriendly: true },
  },
  {
    slug: "gweru-senga-room",
    ownerEmail: "memory.chikanda@homelinkzim.co.zw",
    title: "Student-friendly room close to MSU transport",
    description: "A clean room suited to students and young professionals, close to transport routes and shared amenities.",
    propertyType: "ROOM",
    intent: "RENT",
    status: "ACTIVE",
    price: 110,
    city: "Gweru",
    suburb: "Senga",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/gweru-room-courtyard.png",
    amenities: { wifi: true, waterTank: true },
  },
  {
    slug: "riverside-holiday-lodge-near-victoria-falls-seed04",
    ownerEmail: "tariro.moyo@homelinkzim.co.zw",
    title: "Riverside holiday lodge near Victoria Falls",
    description: "A premium holiday lodge with Zambezi views, private garden, pool access, and concierge support for Victoria Falls adventures.",
    propertyType: "COTTAGE",
    intent: "RENT",
    status: "ACTIVE",
    price: 185,
    city: "Victoria Falls",
    suburb: "Chinotimba",
    bedrooms: 3,
    bathrooms: 2,
    image: "/images/roommates/photo-lodge-vicfalls.jpg",
    amenities: { wifi: true, borehole: true, parking: true, garden: true, swimmingPool: true },
  },
];

async function main() {
  if (!isPostgres(process.env.DATABASE_URL)) {
    throw new Error("DATABASE_URL must point to PostgreSQL before seeding production.");
  }

  const userRows = new Map();
  for (const user of users) {
    const row = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        phone: user.phone,
        roles: user.roles,
        passwordHash: hashPassword(user.password),
        accountStatus: "ACTIVE",
        identityStatus: VerificationStatus.VERIFIED,
      },
      create: {
        ...(user.id ? { id: user.id } : {}),
        email: user.email,
        name: user.name,
        phone: user.phone,
        roles: user.roles,
        passwordHash: hashPassword(user.password),
        accountStatus: "ACTIVE",
        identityStatus: VerificationStatus.VERIFIED,
        phoneVerifiedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });
    userRows.set(user.email, row);
  }

  for (const seed of listings) {
    const owner = userRows.get(seed.ownerEmail);
    await reconcileSeedListingSlug(seed, owner);
    const listing = await prisma.listing.upsert({
      where: { slug: seed.slug },
      update: {
        ownerId: owner.id,
        title: seed.title,
        description: seed.description,
        propertyType: seed.propertyType,
        intent: seed.intent,
        status: seed.status,
        price: seed.price,
        city: seed.city,
        suburb: seed.suburb,
        bedrooms: seed.bedrooms,
        bathrooms: seed.bathrooms,
        propertyOwnerName: owner.name,
        propertyOwnerEmail: owner.email,
        propertyOwnerPhone: owner.phone,
        verifiedAt: new Date(),
        featured: true,
        ...seed.amenities,
      },
      create: {
        slug: seed.slug,
        ownerId: owner.id,
        title: seed.title,
        description: seed.description,
        propertyType: seed.propertyType,
        intent: seed.intent,
        status: seed.status,
        price: seed.price,
        city: seed.city,
        suburb: seed.suburb,
        bedrooms: seed.bedrooms,
        bathrooms: seed.bathrooms,
        latitude: -17.8292,
        longitude: 31.0522,
        propertyOwnerName: owner.name,
        propertyOwnerEmail: owner.email,
        propertyOwnerPhone: owner.phone,
        verifiedAt: new Date(),
        featured: true,
        ...seed.amenities,
      },
    });

    const publicId = `seed-${seed.slug}-image-0`;
    const media = await prisma.listingMedia.findFirst({ where: { listingId: listing.id, publicId } });
    if (!media) {
      await prisma.listingMedia.create({
        data: { listingId: listing.id, url: seed.image, publicId, mediaType: "image", sortOrder: 0 },
      });
    }
  }

  const seeker = userRows.get("rudo.ncube@homelinkzim.co.zw");
  const tinashe = userRows.get("tinashe.dube@homelinkzim.co.zw");
  const landlord = userRows.get("landlord@homelinkzim.co.zw");
  await prisma.roommateProfile.upsert({
    where: { userId: tinashe.id },
    update: {
      budgetMin: 150,
      budgetMax: 350,
      occupation: "Software developer",
      genderPreference: "any",
      lifestyle: "quiet",
      smoking: false,
      pets: false,
      age: 28,
      preferredLocations: ["Avondale", "Borrowdale"],
      active: true,
      payload: {
        lookingFor: "room",
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
        active: true,
        verified: true,
        moderationStatus: "active",
        suburb: "Avondale",
      },
    },
    create: {
      userId: tinashe.id,
      budgetMin: 150,
      budgetMax: 350,
      occupation: "Software developer",
      genderPreference: "any",
      lifestyle: "quiet",
      smoking: false,
      pets: false,
      age: 28,
      preferredLocations: ["Avondale", "Borrowdale"],
      active: true,
      payload: {
        lookingFor: "room",
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
        active: true,
        verified: true,
        moderationStatus: "active",
        suburb: "Avondale",
      },
    },
  });

  await prisma.roommateProfile.upsert({
    where: { userId: seeker.id },
    update: {
      budgetMin: 150,
      budgetMax: 420,
      occupation: "Teacher",
      preferredLocations: ["Avondale", "Belvedere", "Mount Pleasant"],
      active: true,
      payload: { seedKey: "rudo-roommate-profile" },
    },
    create: {
      userId: seeker.id,
      budgetMin: 150,
      budgetMax: 420,
      occupation: "Teacher",
      genderPreference: "any",
      lifestyle: "Quiet professional",
      preferredLocations: ["Avondale", "Belvedere", "Mount Pleasant"],
      active: true,
      payload: { seedKey: "rudo-roommate-profile" },
    },
  });

  const agent = userRows.get("tendai.sithole@homelinkzim.co.zw");
  await prisma.agentLeadRecord.upsert({
    where: { id: "seed-agent-lead-victoria-falls" },
    update: {
      assignedAgentId: agent.id,
      assignedAgentName: agent.name,
      status: "OPEN",
    },
    create: {
      id: "seed-agent-lead-victoria-falls",
      assignedAgentId: agent.id,
      assignedAgentName: agent.name,
      clientName: "Victoria Falls Lodge Owner",
      clientEmail: "owner@example.com",
      clientPhone: "+263772000555",
      clientType: "LANDLORD",
      status: "OPEN",
      city: "Victoria Falls",
      suburb: "Chinotimba",
      notes: "Seed lead for production agent dashboard validation.",
      payload: { seedKey: "agent-lead-victoria-falls" },
    },
  });

  const firstListing = await prisma.listing.findUnique({ where: { slug: listings[0].slug } });
  await seedVerifiedTenancy(firstListing, landlord, tinashe);
  await seedPropertyManagementRequest(landlord);
  await seedHolidayBooking(firstListing, tinashe, landlord);
  await seedAgentApplication(userRows.get("blessing@harareprime.co.zw"));
  const review = await prisma.review.findFirst({
    where: { authorId: seeker.id, listingId: firstListing.id, target: "listing", metadata: { path: ["seedKey"], equals: "review-avondale-cottage" } },
  });
  if (!review) {
    await prisma.review.create({
      data: {
        authorId: seeker.id,
        listingId: firstListing.id,
        rating: 5,
        body: "Clean listing details, quick response, and an easy viewing process.",
        target: "listing",
        metadata: { seedKey: "review-avondale-cottage" },
      },
    });
  }

  console.log("Production seed completed without creating duplicates.");
}

async function seedPropertyManagementRequest(owner) {
  const payload = {
    id: "pm_seed_avondale",
    requestNumber: "PM-SEED-001",
    ownerId: owner.id,
    ownerName: owner.name,
    ownerEmail: owner.email,
    ownerPhone: owner.phone,
    propertyAddress: "12 Acacia Drive, Avondale",
    city: "Harare",
    suburb: "Avondale",
    propertyType: "cottage",
    serviceType: "full_management",
    bedrooms: 1,
    description: "Garden cottage requiring tenant sourcing, rent collection, and maintenance coordination.",
    status: "IN_PROGRESS",
    consultantId: null,
    paymentIds: [],
    documents: [],
    slaBreached: false,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await prisma.propertyManagementRequestRow.upsert({
    where: { id: payload.id },
    update: {
      requestNumber: payload.requestNumber,
      ownerId: owner.id,
      status: payload.status,
      consultantId: payload.consultantId,
      payload,
    },
    create: {
      id: payload.id,
      requestNumber: payload.requestNumber,
      ownerId: owner.id,
      status: payload.status,
      consultantId: payload.consultantId,
      payload,
    },
  });
}

async function seedHolidayBooking(listing, guest, owner) {
  const payload = {
    id: "hbe_seed_001",
    listingId: listing.id,
    listingTitle: listing.title,
    ownerId: owner.id,
    guestUserId: guest.id,
    guestName: guest.name,
    guestEmail: guest.email,
    guestPhone: guest.phone,
    checkIn: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    checkOut: new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10),
    guests: 2,
    message: "Weekend getaway for two.",
    status: "NEW",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await prisma.holidayBookingRecord.upsert({
    where: { id: payload.id },
    update: {
      listingId: payload.listingId,
      guestUserId: payload.guestUserId,
      ownerId: payload.ownerId,
      agentId: null,
      status: payload.status,
      payload,
    },
    create: {
      id: payload.id,
      listingId: payload.listingId,
      guestUserId: payload.guestUserId,
      ownerId: payload.ownerId,
      agentId: null,
      status: payload.status,
      payload,
    },
  });
}

async function seedAgentApplication(agent) {
  const payload = {
    id: "app_seed_blessing",
    userId: agent.id,
    status: "APPROVED",
    personal: {
      fullName: agent.name,
      email: agent.email,
      phone: agent.phone,
      whatsapp: agent.phone,
    },
    professional: {
      city: "Harare",
      yearsExperience: 5,
      agencyName: "Harare Prime Estates",
    },
    declarationAccepted: true,
    termsAccepted: true,
    privacyAccepted: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await prisma.agentApplicationRecord.upsert({
    where: { id: payload.id },
    update: { userId: agent.id, status: payload.status, payload },
    create: { id: payload.id, userId: agent.id, status: payload.status, payload },
  });
  const progress = {
    agentId: agent.id,
    moduleId: "module_platform_basics",
    status: "COMPLETED",
    completedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  };
  await prisma.agentTrainingProgressRecord.upsert({
    where: { agentId_moduleId: { agentId: agent.id, moduleId: progress.moduleId } },
    update: { status: progress.status, payload: progress },
    create: { agentId: agent.id, moduleId: progress.moduleId, status: progress.status, payload: progress },
  });
}

async function seedVerifiedTenancy(listing, landlord, tenant) {
  const tenancyId = "tenancy_seed_1";
  const confirmedAt = new Date(Date.now() - 85 * 86400000).toISOString();
  const startDate = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const base = {
    tenancyId,
    listingId: listing.id,
    propertyTitle: listing.title,
    fullAddress: "12 Acacia Drive, Avondale, Harare",
    city: listing.city,
    suburb: listing.suburb,
    startDate,
    status: "active",
    verificationSource: "payment",
    userConfirmed: true,
    counterpartyConfirmed: true,
    userConfirmedAt: confirmedAt,
    counterpartyConfirmedAt: confirmedAt,
    verified: true,
    paymentId: "pay_seed_tenancy",
    userAddressConsent: false,
    counterpartyAddressConsent: false,
    visibility: "public",
    createdAt: confirmedAt,
    notes: "Verified via HomeLink rent payment",
  };
  const landlordRecord = {
    ...base,
    id: "res_seed_landlord_1",
    userId: landlord.id,
    counterpartyUserId: tenant.id,
    role: "landlord",
  };
  const tenantRecord = {
    ...base,
    id: "res_seed_tenant_1",
    userId: tenant.id,
    counterpartyUserId: landlord.id,
    role: "tenant",
  };
  for (const record of [landlordRecord, tenantRecord]) {
    await prisma.residenceRecordRow.upsert({
      where: { id: record.id },
      update: {
        tenancyId,
        userId: record.userId,
        counterpartyId: record.counterpartyUserId,
        listingId: listing.id,
        status: record.status,
        verified: record.verified,
        payload: record,
      },
      create: {
        id: record.id,
        tenancyId,
        userId: record.userId,
        counterpartyId: record.counterpartyUserId,
        listingId: listing.id,
        status: record.status,
        verified: record.verified,
        payload: record,
      },
    });
  }
  const reference = {
    id: "ref_seed_1",
    tenancyId,
    authorUserId: landlord.id,
    authorName: landlord.name,
    targetUserId: tenant.id,
    authorRole: "landlord",
    note: "Reliable tenant - paid on time and kept the property in great condition.",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  };
  await prisma.tenancyReferenceRow.upsert({
    where: { id: reference.id },
    update: { tenancyId, targetUserId: tenant.id, payload: reference },
    create: { id: reference.id, tenancyId, targetUserId: tenant.id, payload: reference },
  });
}

async function reconcileSeedListingSlug(seed, owner) {
  const existingSlug = await prisma.listing.findUnique({ where: { slug: seed.slug }, select: { id: true } });
  if (existingSlug) return;

  const existingSeed = await prisma.listing.findFirst({
    where: {
      title: seed.title,
      propertyOwnerEmail: owner.email,
    },
    select: { id: true },
  });
  if (!existingSeed) return;

  await prisma.listing.update({
    where: { id: existingSeed.id },
    data: { slug: seed.slug },
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function requireSeedPassword(name) {
  const value = process.env[name];
  if (!value || value.length < 16) {
    throw new Error(`${name} must be set to a private value at least 16 characters long before seeding production.`);
  }
  return value;
}

function isPostgres(value = "") {
  return value.startsWith("postgresql://") || value.startsWith("postgres://");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
