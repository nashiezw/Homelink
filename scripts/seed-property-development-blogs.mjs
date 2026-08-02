import fs from "fs";
import { PrismaClient, BlogArticleLayout, BlogPostStatus } from "@prisma/client";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const prisma = new PrismaClient(
  process.env.DATABASE_URL ? { datasources: { db: { url: process.env.DATABASE_URL } } } : undefined,
);

const bookUrl = "/library/the-complete-guide-to-property-development-and-property-law-in-zimbabwe";

const posts = [
  {
    title: "Property Development in Zimbabwe: What to Check Before You Buy Land",
    slug: "property-development-in-zimbabwe-what-to-check-before-you-buy-land",
    category: "Property Development",
    tags: ["property development", "land due diligence", "zoning", "council approvals"],
    excerpt:
      "A practical Zimbabwe-focused guide to land due diligence, zoning, infrastructure, project readiness, and council approval checks before starting a development.",
    focusKeyword: "property development in Zimbabwe",
    image: "/images/blog/property-development-zimbabwe-cover.png",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      {
        type: "paragraph",
        text:
          "The most expensive development mistakes usually happen before construction starts. A stand may look perfect on viewing day, but the real question is whether the land, planning controls, infrastructure, title position, budget, and professional team all support the project you want to build.",
      },
      {
        type: "paragraph",
        text:
          "HouseLink's Property Development and Property Law in Zimbabwe manual treats development as a disciplined process: verify the land first, confirm the rules, understand the site, then prepare the design and approvals. This article turns that approach into a practical pre-purchase checklist.",
      },
      { type: "heading", level: 2, text: "Start with the intended use" },
      {
        type: "paragraph",
        text:
          "Before paying for land, define the development vision in plain language. Are you planning cluster housing, student accommodation, a warehouse, a commercial conversion, a subdivision, or a long-term land bank? The intended use determines which zoning, infrastructure, approvals, consultants, timelines, and risks matter most.",
      },
      {
        type: "table",
        headers: ["Question", "Why it matters"],
        rows: [
          ["What do you want to build?", "The use must match planning controls and local authority requirements."],
          ["Who will occupy or buy it?", "Target users influence density, parking, access, services, and pricing."],
          ["What infrastructure is needed?", "Roads, water, sewer, drainage, and power can change project cost quickly."],
          ["Which professionals are required?", "Town planners, architects, engineers, surveyors, quantity surveyors, and lawyers may be needed before design is final."],
        ],
      },
      { type: "heading", level: 2, text: "Verify ownership and land tenure" },
      {
        type: "paragraph",
        text:
          "Do not rely only on a copy of a title document or a seller's assurance. Confirm ownership, registered conditions, encumbrances, servitudes, court orders, leases, subdivision approvals, and other rights through the appropriate official records and professional advisers.",
      },
      {
        type: "info",
        tone: "warning",
        title: "Development risk",
        text:
          "A land deal can fail even when the price is attractive if the buyer cannot verify ownership, transfer route, land tenure, or restrictions that affect the proposed development.",
      },
      { type: "heading", level: 2, text: "Check zoning before purchase" },
      {
        type: "paragraph",
        text:
          "Zoning and land-use planning decide what may be built, where, and under what conditions. A residential stand may not permit a warehouse. Agricultural land may carry development controls. A commercial property may need parking, access, environmental, or change-of-use approvals before the intended business can operate.",
      },
      {
        type: "list",
        items: [
          "Confirm existing zoning with the relevant local authority.",
          "Check permitted land uses and whether special consent is required.",
          "Ask about building lines, height restrictions, density controls, parking, access, and road reservations.",
          "Confirm whether servitudes, future road plans, drainage channels, or environmental concerns affect the site.",
          "Get written or professionally verified guidance before committing major funds.",
        ],
      },
      { type: "heading", level: 2, text: "Investigate the physical site" },
      {
        type: "paragraph",
        text:
          "A proper site investigation looks beyond location and size. It checks boundaries, topography, drainage, neighbouring uses, road access, water, sewer, electricity, environmental constraints, and visible conditions that may affect design or cost.",
      },
      {
        type: "table",
        headers: ["Investigation", "Purpose"],
        rows: [
          ["Site inspection", "Understand the physical characteristics of the property."],
          ["Boundary verification", "Confirm property limits using survey information where required."],
          ["Infrastructure assessment", "Check availability and capacity of roads, water, sewer, drainage, and electricity."],
          ["Neighbourhood assessment", "Understand surrounding land uses, future trends, access, and market fit."],
        ],
      },
      { type: "heading", level: 2, text: "Prepare before detailed design" },
      {
        type: "paragraph",
        text:
          "Good developers do not rush straight into drawings. First they verify planning requirements, appoint the right professional team, conduct feasibility checks, estimate costs, prepare a realistic programme, and confirm the approval route. Early preparation is often faster than repeated redesign after council comments.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Define the development vision.",
          "Conduct legal, planning, market, and financial due diligence.",
          "Inspect the site and verify constraints.",
          "Confirm planning requirements with the local authority.",
          "Appoint the professional team.",
          "Build a preliminary project budget and programme.",
        ],
      },
      {
        type: "button",
        label: "Get the full Property Development and Property Law guide",
        url: bookUrl,
      },
      {
        type: "paragraph",
        text:
          "This article is a starting point. The full HouseLink guide goes deeper into planning, land tenure, zoning, council processes, approvals, documentation, development mistakes, and professional responsibilities for Zimbabwe property projects.",
      },
    ],
  },
  {
    title: "Property Law in Zimbabwe: Legal Checks Before You Commit to a Deal",
    slug: "property-law-in-zimbabwe-legal-checks-before-you-commit",
    category: "Property Law",
    tags: ["property law", "title deeds", "contracts", "compliance", "property due diligence"],
    excerpt:
      "A practical guide to ownership verification, contracts, documentation, compliance, ethics, and professional advice before buying, selling, or developing property.",
    focusKeyword: "property law in Zimbabwe",
    image: "/images/blog/property-law-zimbabwe-cover.png",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      {
        type: "paragraph",
        text:
          "Property law is not only a lawyer's concern. Anyone buying, selling, leasing, managing, or developing property needs enough legal awareness to ask the right questions, keep proper records, and know when specialist advice is required.",
      },
      {
        type: "paragraph",
        text:
          "HouseLink's Property Development and Property Law in Zimbabwe manual frames legal competence as part of professional practice: compliance, ethical conduct, accountability, proper documentation, and respect for current laws and local authority requirements.",
      },
      {
        type: "info",
        tone: "warning",
        title: "Not legal advice",
        text:
          "Property-related laws, regulations, by-laws, and professional requirements can change. Always consult current legislation, the relevant authority, and qualified legal professionals before relying on any transaction or development decision.",
      },
      { type: "heading", level: 2, text: "Verify ownership before trusting the deal" },
      {
        type: "paragraph",
        text:
          "Ownership verification sits at the centre of property due diligence. Buyers and developers should confirm title, tenure, registered conditions, encumbrances, subdivision status, leases, court orders, and other rights through official records and professional advisers where appropriate.",
      },
      {
        type: "list",
        items: [
          "Request the relevant ownership or tenure documents.",
          "Confirm the seller or representative has authority to transact.",
          "Check whether the property has restrictions, servitudes, disputes, or registered conditions.",
          "Understand whether transfer, cession, lease assignment, or another legal route applies.",
          "Use a qualified conveyancer or legal practitioner where legal interpretation is needed.",
        ],
      },
      { type: "heading", level: 2, text: "Understand the purpose of each document" },
      {
        type: "paragraph",
        text:
          "Real estate transactions create legal and financial obligations. Offers, sale agreements, lease agreements, listing agreements, mandates, receipts, handover records, payment proof, council correspondence, approval letters, and professional reports should be complete, accurate, and safely stored.",
      },
      {
        type: "table",
        headers: ["Document area", "Risk if ignored"],
        rows: [
          ["Names and identity details", "Wrong parties can delay or undermine the transaction."],
          ["Property description and address", "Ambiguity can create disputes about what is being bought, sold, leased, or developed."],
          ["Price, deposits, dates, and conditions", "Unclear obligations can cause payment, timing, and performance disputes."],
          ["Approvals and authority records", "A transaction or project can stall if required approvals are missing."],
        ],
      },
      { type: "heading", level: 2, text: "Contracts are not casual forms" },
      {
        type: "paragraph",
        text:
          "A contract is a binding agreement. Agents and property professionals should understand the purpose of the documents they handle, but they should not give legal opinions beyond their competence. When a client needs legal interpretation, refer them to a qualified professional.",
      },
      {
        type: "info",
        tone: "info",
        title: "Professional habit",
        text:
          "If it affects ownership, payment, occupation, development rights, cancellation, penalties, transfer, or approvals, it should be documented clearly and reviewed carefully before signature.",
      },
      { type: "heading", level: 2, text: "Ethics protects the transaction" },
      {
        type: "paragraph",
        text:
          "Legal awareness works together with ethics. Honest disclosure, transparency, confidentiality, fair dealing, accountability, and professional competence build trust with clients, investors, financial institutions, local authorities, and other professionals.",
      },
      {
        type: "list",
        items: [
          "Do not hide known defects, disputes, or approval gaps.",
          "Do not pressure a client to sign documents they do not understand.",
          "Keep client information confidential.",
          "Avoid promises about approvals, transfer dates, or legal outcomes that you cannot control.",
          "Keep complete records of instructions, offers, payments, and communications.",
        ],
      },
      { type: "heading", level: 2, text: "A simple pre-commitment checklist" },
      {
        type: "list",
        ordered: true,
        items: [
          "Confirm who owns or controls the property.",
          "Confirm what rights are being sold, leased, transferred, or developed.",
          "Confirm what restrictions or approvals affect the intended use.",
          "Confirm the written terms, deadlines, deposits, and conditions.",
          "Confirm which professionals must review the transaction before money changes hands.",
        ],
      },
      {
        type: "button",
        label: "Read the full Property Development and Property Law guide",
        url: bookUrl,
      },
      {
        type: "paragraph",
        text:
          "The full HouseLink guide expands these legal checks into practical chapters on ownership, tenure, zoning, local authorities, documentation, ethics, approvals, and professional responsibilities in Zimbabwe property work.",
      },
    ],
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function blocksToText(blocks) {
  return blocks
    .flatMap((block) => {
      if (block.type === "heading") return [block.text];
      if (block.type === "paragraph") return [block.text];
      if (block.type === "info") return [block.title, block.text].filter(Boolean);
      if (block.type === "list") return block.items;
      if (block.type === "table") return [...block.headers, ...block.rows.flat()];
      if (block.type === "button") return [block.label];
      return [];
    })
    .join(" ");
}

function estimateReadTime(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 220));
}

async function resolveTags(tags) {
  const ids = [];
  for (const name of tags) {
    const tag = await prisma.blogTag.upsert({
      where: { slug: slugify(name) },
      update: { name, active: true },
      create: { name, slug: slugify(name), active: true },
    });
    ids.push(tag.id);
  }
  return ids;
}

async function main() {
  const author = await prisma.blogAuthor.upsert({
    where: { slug: "houselink-editorial-team" },
    update: { active: true },
    create: {
      name: "HouseLink Editorial Team",
      slug: "houselink-editorial-team",
      role: "Property resources team",
      bio: "Practical property guidance from the HouseLink Zimbabwe team.",
      active: true,
    },
  });

  const product = await prisma.libraryProduct.findUnique({
    where: { slug: "the-complete-guide-to-property-development-and-property-law-in-zimbabwe" },
    select: { id: true, status: true },
  });
  if (!product || product.status !== "PUBLISHED") {
    throw new Error("Property Development and Property Law library product is not published.");
  }

  for (const post of posts) {
    const category = await prisma.blogCategory.upsert({
      where: { slug: slugify(post.category) },
      update: { name: post.category, active: true },
      create: {
        name: post.category,
        slug: slugify(post.category),
        description:
          post.category === "Property Law"
            ? "Legal basics, documentation, agreements, and property risk awareness."
            : "Development insights, land, construction, and project planning.",
        active: true,
        seoTitle: `${post.category} | HouseLink Zimbabwe`,
        metaDescription:
          post.category === "Property Law"
            ? "Legal basics, documentation, agreements, and property risk awareness."
            : "Development insights, land, construction, and project planning.",
      },
    });
    const tagIds = await resolveTags(post.tags);
    const contentText = blocksToText(post.blocks);
    const data = {
      title: post.title,
      excerpt: post.excerpt,
      status: BlogPostStatus.PUBLISHED,
      layout: post.layout,
      categoryId: category.id,
      authorId: author.id,
      featuredImageUrl: post.image,
      featuredImageAlt: post.title,
      socialImageUrl: post.image,
      contentBlocks: post.blocks,
      contentText,
      seoTitle: `${post.title} | HouseLink Zimbabwe`,
      metaDescription: post.excerpt,
      focusKeyword: post.focusKeyword,
      secondaryKeywords: post.tags,
      featured: true,
      popular: true,
      readTimeMinutes: estimateReadTime(contentText),
      searchVector: `${post.title} ${post.excerpt} ${contentText} ${post.tags.join(" ")}`,
      noIndex: false,
      archivedAt: null,
      publishedAt: new Date(),
    };

    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        ...data,
        tags: { set: tagIds.map((id) => ({ id })) },
      },
      create: {
        ...data,
        slug: post.slug,
        createdById: "seed-property-development-blogs",
        lastEditedById: "seed-property-development-blogs",
        tags: { connect: tagIds.map((id) => ({ id })) },
      },
    });
  }

  const seeded = await prisma.blogPost.findMany({
    where: { slug: { in: posts.map((post) => post.slug) } },
    select: { title: true, slug: true, status: true, featuredImageUrl: true, readTimeMinutes: true },
    orderBy: { title: "asc" },
  });
  console.log(JSON.stringify(seeded, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
