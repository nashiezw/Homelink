import crypto from "node:crypto";
import { PrismaClient, Role, VerificationStatus } from "@prisma/client";

const prisma = new PrismaClient();

const standardPassword = requireSeedPassword("SEED_STANDARD_PASSWORD");
const adminPassword = requireSeedPassword("SEED_ADMIN_PASSWORD");

const users = [
  { email: "admin@homelinkzim.co.zw", name: "HomeLink Admin", phone: "+263780000001", roles: [Role.ADMIN, Role.SEEKER], password: adminPassword },
  { email: "tariro.moyo@homelinkzim.co.zw", name: "Tariro Moyo", phone: "+263771234567", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "tendai.sithole@homelinkzim.co.zw", name: "Tendai Sithole", phone: "+263772220001", roles: [Role.AGENT, Role.SEEKER], password: standardPassword },
  { email: "rudo.ncube@homelinkzim.co.zw", name: "Rudo Ncube", phone: "+263773330002", roles: [Role.SEEKER], password: standardPassword },
  { email: "memory.chikanda@homelinkzim.co.zw", name: "Memory Chikanda", phone: "+263719002214", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
];

const listings = [
  {
    slug: "verified-garden-cottage-near-avondale-shops-seed01",
    ownerEmail: "tariro.moyo@homelinkzim.co.zw",
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
    slug: "student-friendly-room-close-to-msu-transport-seed03",
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
