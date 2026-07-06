import crypto from "node:crypto";
import { PrismaClient, Role, VerificationStatus } from "@prisma/client";

const prisma = new PrismaClient();

const standardPassword = optionalSeedPassword("SEED_STANDARD_PASSWORD");
const adminPassword = optionalSeedPassword("SEED_ADMIN_PASSWORD");

const AREA_COORDINATES = {
  "avondale, harare": { latitude: -17.8007, longitude: 31.0335 },
  "hillside, bulawayo": { latitude: -20.1783, longitude: 28.6069 },
  "senga, gweru": { latitude: -19.4825, longitude: 29.8304 },
  "chinotimba, victoria falls": { latitude: -17.9316, longitude: 25.8242 },
  "murambi, mutare": { latitude: -18.9833, longitude: 32.65 },
  "cbd, harare": { latitude: -17.8292, longitude: 31.0522 },
  "newtown, kwekwe": { latitude: -18.9245, longitude: 29.8149 },
  "belvedere, harare": { latitude: -17.8335, longitude: 31.0028 },
  "borrowdale, harare": { latitude: -17.7615, longitude: 31.0893 },
  "mount pleasant, harare": { latitude: -17.7817, longitude: 31.0533 },
  "cbd, bulawayo": { latitude: -20.1561, longitude: 28.5887 },
  "kumalo, bulawayo": { latitude: -20.1352, longitude: 28.6026 },
  "ridgemont, gweru": { latitude: -19.4568, longitude: 29.8181 },
  "chikanga, mutare": { latitude: -18.9957, longitude: 32.6225 },
  "msasa park, kwekwe": { latitude: -18.9194, longitude: 29.8297 },
  "seke unit a, chitungwiza": { latitude: -18.0058, longitude: 31.0706 },
  "avondale west, harare": { latitude: -17.7984, longitude: 31.0148 },
};

const agentTrainingModules = [
  {
    id: "train_intro",
    title: "HomeLink Agent Onboarding",
    description: "How HomeLink works, what agents are responsible for, and how trust is protected on the marketplace.",
    type: "VIDEO",
    track: "BEGINNER",
    level: "BEGINNER",
    contentUrl: "/dashboard/admin?tab=academy",
    durationMinutes: 35,
    required: true,
    order: 1,
    certificateTitle: "HomeLink Agent Onboarding",
    certificateUrl: "/dashboard/admin?tab=academy",
    lessons: [
      { id: "intro_marketplace", title: "Marketplace role", summary: "Understand how agents support renters, buyers, landlords, owners, and property managers.", durationMinutes: 8, keyPoints: ["Protect user trust", "Keep records in HomeLink", "Do not bypass platform safety workflows"] },
      { id: "intro_conduct", title: "Professional conduct", summary: "Communication, punctuality, viewing etiquette, and client confidentiality standards.", durationMinutes: 12, keyPoints: ["Respond promptly", "Use respectful language", "Keep personal data private"] },
      { id: "intro_tools", title: "Agent dashboard basics", summary: "Use leads, listings, commissions, training, and reviews from the dashboard.", durationMinutes: 15, keyPoints: ["Update lead statuses", "Log all viewings", "Track commissions and ratings"] },
    ],
    resources: [
      { id: "agent_starter_guide", title: "Agent starter guide", description: "A quick operating guide for new HomeLink agents.", url: "/dashboard/admin?tab=academy", type: "PDF" },
    ],
  },
  {
    id: "train_listings",
    title: "Listing Quality, Verification and Media",
    description: "How to inspect a property, collect accurate details, upload useful media, and avoid misleading listings.",
    type: "DOCUMENT",
    track: "BEGINNER",
    level: "BEGINNER",
    contentUrl: "/dashboard/admin?tab=academy",
    durationMinutes: 45,
    required: true,
    order: 2,
    certificateTitle: "Listing Quality Specialist",
    certificateUrl: "/dashboard/admin?tab=academy",
    lessons: [
      { id: "listing_verify", title: "Verify before publishing", summary: "Check ownership or authority, price, availability, viewing access, and safety basics.", durationMinutes: 15, keyPoints: ["Confirm landlord/owner authority", "Confirm availability date", "Record water, power, parking, and security notes"] },
      { id: "listing_media", title: "Photo and video standards", summary: "Capture clear, current, well-lit media that shows the actual property condition.", durationMinutes: 15, keyPoints: ["Use recent photos", "Show every key room", "Avoid misleading crops or filters"] },
      { id: "listing_copy", title: "Writing trusted listings", summary: "Write titles, descriptions, amenities, and rules that help users make informed decisions.", durationMinutes: 15, keyPoints: ["Mention location accurately", "Declare fees clearly", "Keep descriptions factual"] },
    ],
    resources: [
      { id: "listing_quality_checklist", title: "Listing quality checklist", description: "Inspection and publishing checklist for rentals, sales, rooms, and holiday homes.", url: "/dashboard/admin?tab=academy", type: "CHECKLIST" },
      { id: "viewing_inspection_sheet", title: "Viewing inspection sheet", description: "Reusable worksheet for property viewings and inspections.", url: "/dashboard/admin?tab=academy", type: "TEMPLATE" },
    ],
  },
  {
    id: "train_leads",
    title: "Lead Handling and Tenant Protection",
    description: "How to respond to leads, schedule safe viewings, prevent fraud, and record deal outcomes.",
    type: "QUIZ",
    track: "VERIFIED_AGENT",
    level: "INTERMEDIATE",
    contentUrl: "/dashboard/admin?tab=academy",
    durationMinutes: 40,
    required: true,
    order: 3,
    certificateTitle: "Lead Handling Certified",
    certificateUrl: "/dashboard/admin?tab=academy",
    lessons: [
      { id: "lead_sla", title: "Lead response standards", summary: "Prioritise fresh leads, confirm user needs, and update the CRM status quickly.", durationMinutes: 10, keyPoints: ["Respond fast", "Keep conversations in HomeLink", "Update status after every action"] },
      { id: "lead_viewings", title: "Safe viewing workflow", summary: "Use confirmed times, verified contacts, and clear viewing instructions.", durationMinutes: 12, keyPoints: ["Confirm identity", "Never pressure deposits before due diligence", "Record viewing results"] },
      { id: "lead_fraud", title: "Fraud and scam prevention", summary: "Spot red flags and escalate suspicious listings, payments, or user behaviour.", durationMinutes: 18, keyPoints: ["Check payment destination", "Escalate suspicious urgency", "Never hide platform records"] },
    ],
    quiz: {
      passMark: 80,
      questions: [
        { id: "lead_q1", prompt: "A renter asks to pay a deposit before viewing. What should the agent do first?", options: ["Encourage immediate payment", "Confirm property details and safe due diligence first", "Move the chat off-platform", "Ignore the lead"] },
        { id: "lead_q2", prompt: "Where should important lead updates be recorded?", options: ["Only in a personal notebook", "Only on WhatsApp", "Inside the HomeLink lead workflow", "After the deal closes only"] },
        { id: "lead_q3", prompt: "What is a clear fraud warning sign?", options: ["A user asks for viewing times", "A landlord provides documents", "Pressure to send money urgently to an unverified account", "A tenant asks about Wi-Fi"] },
        { id: "lead_q4", prompt: "After a viewing, what should the agent update?", options: ["Nothing until payment", "Lead status, notes, next step, and outcome", "Only the commission page", "Only the public listing title"] },
        { id: "lead_q5", prompt: "What should an agent do if a listing looks duplicated or misleading?", options: ["Publish it anyway", "Escalate or flag it for review", "Delete user messages", "Ask for cash to fix it"] },
      ],
    },
    answerKey: {
      lead_q1: "Confirm property details and safe due diligence first",
      lead_q2: "Inside the HomeLink lead workflow",
      lead_q3: "Pressure to send money urgently to an unverified account",
      lead_q4: "Lead status, notes, next step, and outcome",
      lead_q5: "Escalate or flag it for review",
    },
    resources: [
      { id: "lead_handling_playbook", title: "Lead handling playbook", description: "Scripts, statuses, and safe viewing workflow for agent leads.", url: "/dashboard/admin?tab=academy", type: "PDF" },
    ],
  },
  {
    id: "train_compliance",
    title: "Compliance, Ethics and Documentation",
    description: "Client privacy, fair treatment, record keeping, verification, and professional boundaries.",
    type: "ASSIGNMENT",
    track: "VERIFIED_AGENT",
    level: "INTERMEDIATE",
    contentUrl: "/dashboard/admin?tab=academy",
    durationMinutes: 50,
    required: true,
    order: 4,
    certificateTitle: "Compliance and Ethics",
    certificateUrl: "/dashboard/admin?tab=academy",
    expiresAfterDays: 365,
    lessons: [
      { id: "compliance_privacy", title: "Privacy and personal data", summary: "Handle IDs, phone numbers, documents, and addresses only for legitimate HomeLink workflows.", durationMinutes: 15, keyPoints: ["Do not leak user data", "Use approved upload flows", "Share only what is needed"] },
      { id: "compliance_fairness", title: "Fair treatment", summary: "Avoid discriminatory screening and communicate requirements transparently.", durationMinutes: 15, keyPoints: ["Apply rules consistently", "Avoid discriminatory language", "Document objective criteria"] },
      { id: "compliance_records", title: "Documentation and escalation", summary: "Keep verification, agreements, proof of payment, and disputes traceable.", durationMinutes: 20, keyPoints: ["Record decisions", "Escalate safety issues", "Keep agreements and receipts attached"] },
    ],
    resources: [
      { id: "compliance_handbook", title: "Compliance and ethics handbook", description: "Practical operating rules for privacy, documentation, and marketplace safety.", url: "/dashboard/admin?tab=academy", type: "PDF" },
    ],
  },
  {
    id: "train_pm",
    title: "Property Management Operations",
    description: "How agents coordinate maintenance, inspections, owner requests, quotes, invoices, and service records.",
    type: "DOCUMENT",
    track: "PROPERTY_MANAGER",
    level: "ADVANCED",
    contentUrl: "/dashboard/admin?tab=academy",
    durationMinutes: 35,
    required: false,
    order: 5,
    certificateTitle: "Property Manager Track",
    certificateUrl: "/dashboard/admin?tab=academy",
    lessons: [
      { id: "pm_intake", title: "Request intake", summary: "Capture owner, property, priority, photos, and access notes before assigning work.", durationMinutes: 12, keyPoints: ["Clarify scope", "Collect evidence", "Set expectations"] },
      { id: "pm_delivery", title: "Quotes, invoices and completion", summary: "Coordinate quotations, owner approvals, invoices, and completion records.", durationMinutes: 23, keyPoints: ["Use written approvals", "Attach documents", "Close work with proof"] },
    ],
    resources: [
      { id: "pm_operations", title: "Property management operations guide", description: "Process guide for managed property requests.", url: "/dashboard/admin?tab=academy", type: "PDF" },
    ],
  },
  {
    id: "train_growth",
    title: "Commissions, Reviews and Agent Growth",
    description: "Understand commission splits, ratings, public profiles, client follow-up, and growth tiers.",
    type: "DOCUMENT",
    track: "SENIOR_AGENT",
    level: "ADVANCED",
    contentUrl: "/dashboard/admin?tab=academy",
    durationMinutes: 30,
    required: false,
    order: 6,
    certificateTitle: "Senior Agent Growth Track",
    certificateUrl: "/dashboard/admin?tab=academy",
    lessons: [
      { id: "growth_commissions", title: "Commission rules", summary: "Know the difference between HomeLink-sourced, agent-sourced, referral, and recurring commissions.", durationMinutes: 15, keyPoints: ["Check rule snapshots", "Close leads properly", "Keep payment records clean"] },
      { id: "growth_reviews", title: "Reviews and trust", summary: "Use excellent service and complete records to improve your public reputation.", durationMinutes: 15, keyPoints: ["Ask for honest reviews", "Resolve issues quickly", "Keep your profile current"] },
    ],
    resources: [
      { id: "commission_growth", title: "Commission and growth guide", description: "Guide to earning, reviews, profile quality, and progression.", url: "/dashboard/admin?tab=academy", type: "PDF" },
    ],
  },
];

const users = [
  { email: "admin@homelinkzim.co.zw", name: "HomeLink Admin", phone: "+263780000001", roles: [Role.ADMIN, Role.SEEKER], password: adminPassword },
  { id: "user_seeker_tinashe", email: "tinashe.dube@homelinkzim.co.zw", name: "Tinashe Dube", phone: "+263770000000", roles: [Role.SEEKER, Role.LANDLORD], password: process.env.SEED_TINASHE_PASSWORD ?? standardPassword },
  { id: "user_landlord", email: "landlord@homelinkzim.co.zw", name: "Tariro Moyo", phone: "+263771234568", roles: [Role.LANDLORD, Role.SEEKER], password: process.env.SEED_LANDLORD_PASSWORD ?? standardPassword },
  { id: "user_agent_blessing", email: "blessing@harareprime.co.zw", name: "Blessing Muzenda", phone: "+263775678901", roles: [Role.AGENT, Role.SEEKER], password: standardPassword },
  { email: "tariro.moyo@homelinkzim.co.zw", name: "Tariro Moyo", phone: "+263771234567", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "tendai.sithole@homelinkzim.co.zw", name: "Tendai Sithole", phone: "+263772220001", roles: [Role.AGENT, Role.SEEKER], password: standardPassword },
  { email: "rudo.ncube@homelinkzim.co.zw", name: "Rudo Ncube", phone: "+263773330002", roles: [Role.SEEKER], password: standardPassword },
  { email: "memory.chikanda@homelinkzim.co.zw", name: "Memory Chikanda", phone: "+263719002214", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "ndlovu.property.group@homelinkzim.co.zw", name: "Ndlovu Property Group", phone: "+263785552101", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "eastern.highlands.realty@homelinkzim.co.zw", name: "Eastern Highlands Realty", phone: "+263778883410", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "harare.prime.estates@homelinkzim.co.zw", name: "Harare Prime Estates", phone: "+263242123456", roles: [Role.LANDLORD, Role.AGENT, Role.SEEKER], password: standardPassword },
  { id: "user_seeker_rudo", email: "rudo.m@example.co.zw", name: "Rudo M.", phone: "+263771000001", roles: [Role.SEEKER], password: standardPassword },
  { id: "user_seeker_taku", email: "taku.n@example.co.zw", name: "Taku N.", phone: "+263771000002", roles: [Role.SEEKER], password: standardPassword },
  { id: "user_seeker_noma", email: "noma.s@example.co.zw", name: "Noma S.", phone: "+263771000003", roles: [Role.SEEKER], password: standardPassword },
  { id: "user_seeker_chipo", email: "chipo.d@example.co.zw", name: "Chipo D.", phone: "+263771000005", roles: [Role.SEEKER], password: standardPassword },
  { id: "user_seeker_farai", email: "farai.m@example.co.zw", name: "Farai T.", phone: "+263771000004", roles: [Role.SEEKER], password: standardPassword },
  { id: "user_seeker_grace", email: "grace.m@example.co.zw", name: "Grace M.", phone: "+263771000006", roles: [Role.SEEKER], password: standardPassword },
  { email: "kumalo.properties@homelinkzim.co.zw", name: "Kumalo Properties", phone: "+263784403300", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "patience.dube@homelinkzim.co.zw", name: "Patience Dube", phone: "+263772108891", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "borrowdale.estates@homelinkzim.co.zw", name: "Borrowdale Estates", phone: "+263773304412", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "mrs.chigwada@homelinkzim.co.zw", name: "Mrs. Chigwada", phone: "+263775512200", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "sipho.ndlovu@homelinkzim.co.zw", name: "Sipho Ndlovu", phone: "+263782201100", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "cnyathi@homelinkzim.co.zw", name: "C. Nyathi", phone: "+263774401209", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "tendai.mukwena@homelinkzim.co.zw", name: "Tendai Mukwena", phone: "+263778809900", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
  { email: "mrs.moyo@homelinkzim.co.zw", name: "Mrs. Moyo", phone: "+263771123344", roles: [Role.LANDLORD, Role.SEEKER], password: standardPassword },
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
    slug: "bulawayo-hillside-house",
    ownerEmail: "ndlovu.property.group@homelinkzim.co.zw",
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
    slug: "victoria-falls-riverside-lodge",
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
  {
    slug: "mutare-murambi-land",
    ownerEmail: "eastern.highlands.realty@homelinkzim.co.zw",
    title: "Residential stand with mountain views",
    description: "A residential stand in a growing pocket of Murambi with documented ownership and nearby utility access.",
    propertyType: "LAND",
    intent: "BUY",
    status: "ACTIVE",
    price: 18500,
    city: "Mutare",
    suburb: "Murambi",
    bedrooms: 0,
    bathrooms: 0,
    image: "/images/roommates/photo-land-mutare.jpg",
    amenities: { waterTank: true },
  },
  {
    slug: "harare-cbd-office-suite",
    ownerEmail: "harare.prime.estates@homelinkzim.co.zw",
    title: "Ground-floor office suite in Harare CBD",
    description: "A professional ground-floor commercial suite with reception area, open-plan workspace, kitchenette, and dedicated parking in the heart of Harare CBD.",
    propertyType: "COMMERCIAL",
    intent: "RENT",
    status: "ACTIVE",
    price: 1200,
    city: "Harare",
    suburb: "CBD",
    bedrooms: 0,
    bathrooms: 2,
    image: "/images/roommates/photo-office-harare.jpg",
    amenities: { parking: true, securityWall: true, generator: true, wifi: true },
  },
  {
    slug: "kwekwe-cbd-flat",
    ownerEmail: "cnyathi@homelinkzim.co.zw",
    title: "Compact flat within walking distance of Kwekwe CBD",
    description: "A practical two-bedroom flat for tenants who need quick CBD access, reliable water storage, and controlled parking.",
    propertyType: "FLAT",
    intent: "RENT",
    status: "ACTIVE",
    price: 260,
    city: "Kwekwe",
    suburb: "Newtown",
    bedrooms: 2,
    bathrooms: 1,
    image: "/images/kwekwe-flat.png",
    amenities: { waterTank: true, parking: true, securityWall: true },
  },
  {
    slug: "harare-belvedere-room",
    ownerEmail: "patience.dube@homelinkzim.co.zw",
    title: "Furnished room in Belvedere - Wi-Fi included",
    description: "Bright furnished room in a quiet Belvedere home, ideal for nurses and young professionals on shift work.",
    propertyType: "ROOM",
    intent: "RENT",
    status: "ACTIVE",
    price: 195,
    city: "Harare",
    suburb: "Belvedere",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/roommates/photo-lounge-belvedere.jpg",
    amenities: { furnished: true, wifi: true, waterTank: true },
  },
  {
    slug: "harare-borrowdale-flat-share",
    ownerEmail: "borrowdale.estates@homelinkzim.co.zw",
    title: "Shared flat in Borrowdale - 2 rooms available",
    description: "Modern flat share in a secure Borrowdale complex with two private rooms and shared living space.",
    propertyType: "FLAT",
    intent: "RENT",
    status: "ACTIVE",
    price: 380,
    city: "Harare",
    suburb: "Borrowdale",
    bedrooms: 2,
    bathrooms: 2,
    image: "/images/roommates/photo-flat-borrowdale.jpg",
    amenities: { furnished: true, parking: true, securityWall: true, wifi: true, solarBackup: true },
  },
  {
    slug: "harare-mount-pleasant-room",
    ownerEmail: "mrs.chigwada@homelinkzim.co.zw",
    title: "Quiet room near Mount Pleasant shops",
    description: "Spacious room in a family home near UZ and Mount Pleasant shops - quiet household preferred.",
    propertyType: "ROOM",
    intent: "RENT",
    status: "ACTIVE",
    price: 250,
    city: "Harare",
    suburb: "Mount Pleasant",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/roommates/photo-room-mount-pleasant.jpg",
    amenities: { wifi: true, parking: true, borehole: true },
  },
  {
    slug: "bulawayo-cbd-room",
    ownerEmail: "sipho.ndlovu@homelinkzim.co.zw",
    title: "Affordable CBD room - walking distance to work",
    description: "Budget-friendly room in Bulawayo CBD for workers and students who need central access.",
    propertyType: "ROOM",
    intent: "RENT",
    status: "ACTIVE",
    price: 140,
    city: "Bulawayo",
    suburb: "CBD",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/roommates/photo-room-avondale.jpg",
    amenities: { wifi: true, waterTank: true },
  },
  {
    slug: "bulawayo-kumalo-cottage",
    ownerEmail: "kumalo.properties@homelinkzim.co.zw",
    title: "Garden cottage in Kumalo - private entrance",
    description: "Self-contained garden cottage with private entrance in upscale Kumalo - ideal for professionals.",
    propertyType: "COTTAGE",
    intent: "RENT",
    status: "ACTIVE",
    price: 350,
    city: "Bulawayo",
    suburb: "Kumalo",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/roommates/photo-cottage-kumalo.jpg",
    amenities: { solarBackup: true, borehole: true, parking: true, wifi: true, garden: true },
  },
  {
    slug: "gweru-ridgemont-room",
    ownerEmail: "memory.chikanda@homelinkzim.co.zw",
    title: "Room in Ridgemont - close to Gweru CBD",
    description: "Clean room in Ridgemont with shared kitchen - popular with MSU students and interns.",
    propertyType: "ROOM",
    intent: "RENT",
    status: "ACTIVE",
    price: 130,
    city: "Gweru",
    suburb: "Ridgemont",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/roommates/photo-kitchen-ridgemont.jpg",
    amenities: { wifi: true, waterTank: true },
  },
  {
    slug: "mutare-chikanga-room",
    ownerEmail: "tendai.mukwena@homelinkzim.co.zw",
    title: "Budget room in Chikanga - shared amenities",
    description: "Affordable room in Chikanga for interns and young workers starting out in Mutare.",
    propertyType: "ROOM",
    intent: "RENT",
    status: "ACTIVE",
    price: 120,
    city: "Mutare",
    suburb: "Chikanga",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/roommates/photo-house-bulawayo.jpg",
    amenities: { waterTank: true },
  },
  {
    slug: "kwekwe-msasa-room",
    ownerEmail: "cnyathi@homelinkzim.co.zw",
    title: "Student room near Kwekwe industrial sites",
    description: "Low-cost room in Msasa Park - popular with apprentices and industrial workers.",
    propertyType: "ROOM",
    intent: "RENT",
    status: "ACTIVE",
    price: 100,
    city: "Kwekwe",
    suburb: "Msasa Park",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/roommates/photo-kitchen-msasa.jpg",
    amenities: { wifi: true, waterTank: true },
  },
  {
    slug: "chitungwiza-seke-room",
    ownerEmail: "mrs.moyo@homelinkzim.co.zw",
    title: "Room in Seke - Harare commuter belt",
    description: "Very affordable room in Seke with kombi links to Harare CBD - ideal for budget seekers.",
    propertyType: "ROOM",
    intent: "RENT",
    status: "ACTIVE",
    price: 90,
    city: "Chitungwiza",
    suburb: "Seke Unit A",
    bedrooms: 1,
    bathrooms: 1,
    image: "/images/gweru-room-courtyard.png",
    amenities: { waterTank: true },
  },
  {
    slug: "harare-avondale-flat-share",
    ownerEmail: "tariro.moyo@homelinkzim.co.zw",
    title: "House share flat - Avondale West",
    description: "Three-bedroom flat share in Avondale West - one room available for a compatible housemate.",
    propertyType: "FLAT",
    intent: "RENT",
    status: "ACTIVE",
    price: 320,
    city: "Harare",
    suburb: "Avondale West",
    bedrooms: 3,
    bathrooms: 2,
    image: "/images/roommates/photo-flat-avondale-west.jpg",
    amenities: { furnished: true, wifi: true, parking: true, securityWall: true, borehole: true },
  },
];

const roommateProfiles = [
  {
    userId: "user_seeker_rudo",
    city: "Harare",
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
    photoUrl: "/images/roommates/portrait-rudo.jpg",
    coverPhoto: "/images/roommates/cover-professional.jpg",
    availableFrom: "1 Aug 2026",
    moveInDate: "2026-08-01",
    tags: ["Non-smoker", "No pets", "Early mornings", "Wi-Fi"],
    interests: ["Early mornings", "Wi-Fi", "Quiet household"],
    languages: ["English", "Shona"],
    compatibility: 94,
  },
  {
    userId: "user_seeker_taku",
    city: "Gweru",
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
    photoUrl: "/images/roommates/portrait-taku.jpg",
    coverPhoto: "/images/roommates/cover-student.jpg",
    availableFrom: "Available now",
    availableNow: true,
    tags: ["Student", "Transport", "Shared kitchen"],
    interests: ["Near campus", "Shared kitchen", "Transport"],
    languages: ["English", "Shona"],
    compatibility: 88,
  },
  {
    userId: "user_seeker_noma",
    city: "Bulawayo",
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
    photoUrl: "/images/roommates/portrait-noma.jpg",
    coverPhoto: "/images/roommates/cover-hybrid.jpg",
    availableFrom: "15 Jul 2026",
    moveInDate: "2026-07-15",
    tags: ["Pets OK", "Parking", "Furnished"],
    interests: ["Pet-friendly", "Parking", "Hybrid work"],
    languages: ["English", "Ndebele"],
    compatibility: 91,
  },
  {
    userId: "user_seeker_chipo",
    city: "Harare",
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
    photoUrl: "/images/roommates/portrait-chipo.jpg",
    coverPhoto: "/images/roommates/cover-nurse.jpg",
    availableFrom: "Available now",
    availableNow: true,
    tags: ["Furnished", "Parking", "Quiet"],
    interests: ["Night shift friendly", "Parking", "Furnished"],
    languages: ["English", "Shona"],
    compatibility: 86,
  },
  {
    userId: "user_seeker_farai",
    city: "Mutare",
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
    photoUrl: "/images/roommates/portrait-farai.jpg",
    coverPhoto: "/images/roommates/cover-intern.jpg",
    availableFrom: "1 Sep 2026",
    moveInDate: "2026-09-01",
    tags: ["Budget", "Wi-Fi", "Shared kitchen"],
    interests: ["Budget-friendly", "Wi-Fi", "Shared kitchen"],
    languages: ["English", "Shona"],
    compatibility: 82,
  },
  {
    userId: "user_seeker_grace",
    city: "Harare",
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
    photoUrl: "/images/roommates/portrait-grace.jpg",
    coverPhoto: "/images/roommates/cover-accountant.jpg",
    availableFrom: "20 Aug 2026",
    moveInDate: "2026-08-20",
    tags: ["House share", "Parking", "Security"],
    interests: ["House share", "Secure estate", "Parking"],
    languages: ["English", "Shona"],
    compatibility: 90,
  },
];

async function main() {
  if (!isPostgres(process.env.DATABASE_URL)) {
    throw new Error("DATABASE_URL must point to PostgreSQL before seeding production.");
  }

  const userRows = new Map();
  for (const user of users) {
    const passwordHash = user.password ? hashPassword(user.password) : undefined;
    const row = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        phone: user.phone,
        roles: user.roles,
        ...(passwordHash ? { passwordHash } : {}),
        accountStatus: "ACTIVE",
        identityStatus: VerificationStatus.VERIFIED,
      },
      create: {
        ...(user.id ? { id: user.id } : {}),
        email: user.email,
        name: user.name,
        phone: user.phone,
        roles: user.roles,
        passwordHash: passwordHash ?? hashPassword(generatedSeedPassword(user.email)),
        accountStatus: "ACTIVE",
        identityStatus: VerificationStatus.VERIFIED,
        phoneVerifiedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });
    userRows.set(user.email, row);
    userRows.set(row.id, row);
  }

  const hararePrimeAgency = await prisma.agency.upsert({
    where: { id: "agency_harare_prime_estates" },
    update: {
      name: "Harare Prime Estates",
      phone: "+263775111222",
      email: "hello@harareprime.co.zw",
      city: "Harare",
      verificationStatus: VerificationStatus.VERIFIED,
      accountStatus: "ACTIVE",
      subscriptionTier: "ENTERPRISE",
      revenue: 1250,
      leadConversion: 42,
    },
    create: {
      id: "agency_harare_prime_estates",
      name: "Harare Prime Estates",
      phone: "+263775111222",
      email: "hello@harareprime.co.zw",
      city: "Harare",
      verificationStatus: VerificationStatus.VERIFIED,
      accountStatus: "ACTIVE",
      subscriptionTier: "ENTERPRISE",
      revenue: 1250,
      leadConversion: 42,
    },
  });
  for (const email of ["blessing@harareprime.co.zw", "tendai.sithole@homelinkzim.co.zw"]) {
    const agent = userRows.get(email);
    await prisma.agencyAgent.upsert({
      where: { agencyId_userId: { agencyId: hararePrimeAgency.id, userId: agent.id } },
      update: { title: email.startsWith("blessing") ? "Senior letting agent" : "Sales consultant" },
      create: {
        agencyId: hararePrimeAgency.id,
        userId: agent.id,
        title: email.startsWith("blessing") ? "Senior letting agent" : "Sales consultant",
      },
    });
  }

  for (const seed of listings) {
    const owner = userRows.get(seed.ownerEmail);
    const coordinates = listingCoordinates(seed);
    await reconcileSeedListingSlug(seed);
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
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
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
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
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

  for (const profile of roommateProfiles) {
    const profileUser = userRows.get(profile.userId);
    if (!profileUser) continue;
    await prisma.roommateProfile.upsert({
      where: { userId: profileUser.id },
      update: roommateProfileData(profile),
      create: {
        userId: profileUser.id,
        ...roommateProfileData(profile),
      },
    });
  }

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
  await prisma.agentLeadRecord.upsert({
    where: { id: "lead_seed_rating" },
    update: {
      listingId: firstListing.id,
      listingTitle: firstListing.title,
      assignedAgentId: agent.id,
      assignedAgentName: agent.name,
      status: "CLOSED_WON",
      payload: {
        seedKey: "rateable-agent-deal",
        clientUserId: tinashe.id,
        dealRef: "deal_seed_rating",
        closedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        ratingSubmitted: false,
      },
    },
    create: {
      id: "lead_seed_rating",
      listingId: firstListing.id,
      listingTitle: firstListing.title,
      leadSource: "HOMELINK",
      acquisitionChannel: "HOMELINK_WEBSITE",
      createdById: tinashe.id,
      createdByName: tinashe.name,
      assignedAgentId: agent.id,
      assignedAgentName: agent.name,
      clientName: tinashe.name,
      clientEmail: tinashe.email,
      clientPhone: tinashe.phone,
      clientType: "TENANT",
      status: "CLOSED_WON",
      city: firstListing.city,
      suburb: firstListing.suburb,
      province: "Harare",
      notes: "Rental completed via HomeLink - please rate your agent.",
      payload: {
        seedKey: "rateable-agent-deal",
        clientUserId: tinashe.id,
        dealRef: "deal_seed_rating",
        closedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        ratingSubmitted: false,
      },
    },
  });
  await seedVerifiedTenancy(firstListing, landlord, tinashe);
  await seedPropertyManagementRequest(landlord);
  await seedHolidayBooking(firstListing, tinashe, landlord);
  await seedAgentApplication(userRows.get("blessing@harareprime.co.zw"), {
    id: "app_seed_blessing",
    photoUrl: "/images/roommates/portrait-blessing.jpg",
    title: "Senior letting agent",
    yearsExperience: 5,
  });
  await seedAgentApplication(userRows.get("tendai.sithole@homelinkzim.co.zw"), {
    id: "app_seed_tendai",
    photoUrl: "/images/roommates/portrait-tendai.jpg",
    title: "Sales consultant",
    yearsExperience: 4,
  });
  await seedAgentApplication(userRows.get("harare.prime.estates@homelinkzim.co.zw"), {
    id: "app_seed_harare_prime",
    photoUrl: "/images/roommates/portrait-member.jpg",
    title: "Agency desk",
    yearsExperience: 8,
  });
  await seedAgentTrainingModules();
  await seedAgentTrainingProgress([
    userRows.get("blessing@harareprime.co.zw"),
    userRows.get("tendai.sithole@homelinkzim.co.zw"),
    userRows.get("harare.prime.estates@homelinkzim.co.zw"),
  ]);
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

async function seedAgentApplication(agent, profile) {
  if (!agent) return;
  const payload = {
    id: profile.id,
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
      province: "Harare",
      yearsExperience: profile.yearsExperience,
      agencyName: "Harare Prime Estates",
      areasCovered: ["Avondale", "Borrowdale", "Mount Pleasant"],
      languages: ["English", "Shona"],
      specialisations: ["Rentals", "Sales", "Property management"],
      propertyTypes: ["House", "Flat", "Room"],
    },
    documents: {
      profilePictureUrl: profile.photoUrl,
      idDocumentUrl: `/uploads/agents/${profile.id}-id.pdf`,
      licenceUrl: `/uploads/agents/${profile.id}-licence.pdf`,
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

async function seedAgentTrainingModules() {
  for (const trainingModule of agentTrainingModules) {
    await prisma.agentTrainingModuleRecord.upsert({
      where: { id: trainingModule.id },
      update: {
        title: trainingModule.title,
        description: trainingModule.description,
        type: trainingModule.type,
        contentUrl: trainingModule.contentUrl ?? null,
        durationMinutes: trainingModule.durationMinutes,
        required: trainingModule.required,
        order: trainingModule.order,
        active: true,
        payload: trainingModule,
      },
      create: {
        id: trainingModule.id,
        title: trainingModule.title,
        description: trainingModule.description,
        type: trainingModule.type,
        contentUrl: trainingModule.contentUrl ?? null,
        durationMinutes: trainingModule.durationMinutes,
        required: trainingModule.required,
        order: trainingModule.order,
        active: true,
        payload: trainingModule,
      },
    });
  }
}

async function seedAgentTrainingProgress(agentRows) {
  const agents = agentRows.filter(Boolean);
  const scoreByModule = {
    train_intro: 100,
    train_listings: 96,
    train_leads: 100,
    train_compliance: 92,
    train_pm: 88,
    train_growth: 95,
  };
  const answerKey = agentTrainingModules.find((module) => module.id === "train_leads")?.answerKey ?? {};
  const now = new Date().toISOString();
  for (const agent of agents) {
    for (const trainingModule of agentTrainingModules) {
      const score = scoreByModule[trainingModule.id] ?? 100;
      const payload = agentTrainingProgressPayload(trainingModule, score, now, trainingModule.id === "train_leads" ? answerKey : {});
      await prisma.agentTrainingProgressRecord.upsert({
        where: { agentId_moduleId: { agentId: agent.id, moduleId: trainingModule.id } },
        update: {
          status: "COMPLETED",
          payload,
        },
        create: {
          agentId: agent.id,
          moduleId: trainingModule.id,
          status: "COMPLETED",
          payload,
        },
      });
    }
  }
}

function agentTrainingProgressPayload(trainingModule, score, completedAt, submittedAnswers) {
  const expiresAt = trainingModule.expiresAfterDays
    ? new Date(new Date(completedAt).getTime() + trainingModule.expiresAfterDays * 86400000).toISOString()
    : undefined;
  return {
    moduleTitle: trainingModule.title,
    track: trainingModule.track,
    certificateTitle: trainingModule.certificateTitle,
    score,
    passed: true,
    passMark: trainingModule.quiz?.passMark ?? 100,
    attemptCount: 1,
    submittedAnswers,
    completedAt,
    ...(expiresAt ? { expiresAt } : {}),
    certificateUrl: trainingModule.certificateUrl,
    seeded: true,
  };
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

async function reconcileSeedListingSlug(seed) {
  const existingSlug = await prisma.listing.findUnique({ where: { slug: seed.slug }, select: { id: true } });
  if (existingSlug) return;

  const existingSeed = await prisma.listing.findFirst({
    where: {
      title: seed.title,
    },
    select: { id: true },
  });
  if (!existingSeed) return;

  await prisma.listing.update({
    where: { id: existingSeed.id },
    data: { slug: seed.slug },
  });
}

function roommateProfileData(profile) {
  return {
    budgetMin: profile.budgetMin,
    budgetMax: profile.budgetMax,
    occupation: profile.occupation,
    genderPreference: profile.genderPreference,
    lifestyle: profile.lifestyle,
    smoking: profile.smoking,
    pets: profile.pets,
    age: profile.age,
    preferredLocations: [profile.suburb, profile.city].filter(Boolean),
    active: true,
    payload: {
      id: `rm_${profile.userId}`,
      userId: profile.userId,
      lookingFor: "room",
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      occupation: profile.occupation,
      preferredLocations: [profile.suburb, profile.city].filter(Boolean),
      city: profile.city,
      suburb: profile.suburb,
      lifestyle: profile.lifestyle,
      smoking: profile.smoking,
      pets: profile.pets,
      furnished: true,
      availableNow: Boolean(profile.availableNow),
      availableFrom: profile.availableFrom,
      gender: profile.gender,
      genderPreference: profile.genderPreference,
      age: profile.age,
      preferredAgeMin: profile.preferredAgeMin,
      preferredAgeMax: profile.preferredAgeMax,
      religion: profile.religion,
      religionPreference: profile.religionPreference,
      maritalStatus: profile.maritalStatus,
      maritalStatusPreference: profile.maritalStatusPreference,
      householdType: "single",
      householdSize: 1,
      moveInDate: profile.moveInDate,
      bio: profile.bio,
      photoUrl: profile.photoUrl,
      avatarUrl: profile.photoUrl,
      coverPhoto: profile.coverPhoto,
      photos: [profile.photoUrl],
      tags: profile.tags,
      interests: profile.interests,
      languages: profile.languages,
      compatibility: profile.compatibility,
      active: true,
      verified: true,
      moderationStatus: "active",
    },
  };
}

function listingCoordinates(seed) {
  const key = `${seed.suburb}, ${seed.city}`.toLowerCase();
  return AREA_COORDINATES[key] ?? { latitude: -17.8292, longitude: 31.0522 };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function optionalSeedPassword(name) {
  const value = process.env[name];
  if (!value) {
    console.warn(`${name} is not set. Existing user passwords will not be changed; newly-created demo users will receive a secure random password.`);
    return undefined;
  }
  if (value.length < 16) {
    throw new Error(`${name} must be set to a private value at least 16 characters long before seeding production.`);
  }
  return value;
}

function generatedSeedPassword(email) {
  return `seed:${email}:${crypto.randomBytes(32).toString("hex")}`;
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
