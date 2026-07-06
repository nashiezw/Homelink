import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    resources: [{ id: "agent_starter_guide", title: "Agent starter guide", description: "A quick operating guide for new HomeLink agents.", url: "/dashboard/admin?tab=academy", type: "PDF" }],
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
    resources: [{ id: "lead_handling_playbook", title: "Lead handling playbook", description: "Scripts, statuses, and safe viewing workflow for agent leads.", url: "/dashboard/admin?tab=academy", type: "PDF" }],
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
    resources: [{ id: "compliance_handbook", title: "Compliance and ethics handbook", description: "Practical operating rules for privacy, documentation, and marketplace safety.", url: "/dashboard/admin?tab=academy", type: "PDF" }],
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
    resources: [{ id: "pm_operations", title: "Property management operations guide", description: "Process guide for managed property requests.", url: "/dashboard/admin?tab=academy", type: "PDF" }],
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
    resources: [{ id: "commission_growth", title: "Commission and growth guide", description: "Guide to earning, reviews, profile quality, and progression.", url: "/dashboard/admin?tab=academy", type: "PDF" }],
  },
];

const scoreByModule = {
  train_intro: 100,
  train_listings: 96,
  train_leads: 100,
  train_compliance: 92,
  train_pm: 88,
  train_growth: 95,
};

async function main() {
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

  const demoAgents = await prisma.user.findMany({
    where: {
      email: {
        in: ["blessing@harareprime.co.zw", "tendai.sithole@homelinkzim.co.zw", "harare.prime.estates@homelinkzim.co.zw"],
      },
    },
    select: { id: true, email: true, name: true },
  });

  const now = new Date().toISOString();
  for (const agent of demoAgents) {
    for (const trainingModule of agentTrainingModules) {
      const score = scoreByModule[trainingModule.id] ?? 100;
      await prisma.agentTrainingProgressRecord.upsert({
        where: { agentId_moduleId: { agentId: agent.id, moduleId: trainingModule.id } },
        update: {
          status: "COMPLETED",
          payload: progressPayload(trainingModule, score, now),
        },
        create: {
          agentId: agent.id,
          moduleId: trainingModule.id,
          status: "COMPLETED",
          payload: progressPayload(trainingModule, score, now),
        },
      });
    }
  }

  const counts = {
    modules: await prisma.agentTrainingModuleRecord.count({ where: { active: true } }),
    demoAgents: demoAgents.length,
    progress: await prisma.agentTrainingProgressRecord.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
}

function progressPayload(trainingModule, score, completedAt) {
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
    submittedAnswers: trainingModule.answerKey ?? {},
    completedAt,
    ...(expiresAt ? { expiresAt } : {}),
    certificateUrl: trainingModule.certificateUrl,
    seeded: true,
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
