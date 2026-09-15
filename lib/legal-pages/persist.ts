import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import type { LegalPage, LegalPageId } from "@/lib/legal-pages/types";

const defaultLegalPages: LegalPage[] = [
  {
    id: "terms",
    title: "HouseLink Terms of Service",
    summary:
      "These terms explain how HouseLink Zimbabwe keeps property search, roommate matching, listings, verification, payments, Library purchases, messaging, and property-management workflows trustworthy.",
    body:
      "Using HouseLink\nBy using HouseLink, you agree to use the platform honestly, lawfully, and respectfully. HouseLink helps people discover property, rooms, roommate profiles, agents, landlords, owners, property managers, enquiries, messages, saved searches, payments, verification records, Library products, and support workflows across Zimbabwe.\n\nAccount responsibility\nYou are responsible for keeping your login secure, using your real contact details, and making sure the information you provide is accurate. If you create a landlord, agent, owner, roommate, seeker, consultant, buyer, or admin profile, you must keep that profile current and must not impersonate another person or organisation.\n\nListings and profiles\nListings, roommate profiles, agent profiles, photos, videos, prices, availability, locations, amenities, documents, viewing details, house rules, and contact preferences must be truthful, current, and legally allowed to be published. HouseLink may edit, hide, reject, verify, mark stale, or remove content that looks unsafe, duplicate, misleading, discriminatory, fraudulent, or out of date.\n\nHouseLink Library purchases\nHouseLink Library sells educational books, manuals, templates, samples, printed editions, and digital publications. Product pages should be read carefully before purchase, including the title, description, table of contents, sample preview where available, selected format, price, delivery method, and refund policy. Digital products are delivered through HouseLink Library access after payment confirmation. Printed books are fulfilled through delivery or pickup where available.\n\nEducational and professional content\nHouseLink books, guides, articles, Academy materials, and Library publications provide general educational and professional information. They do not replace advice from qualified legal practitioners, planners, architects, engineers, surveyors, valuers, accountants, councils, regulators, or other professionals for a specific transaction or project.\n\nEnquiries, messaging, and conduct\nUsers must communicate respectfully and may not harass, threaten, discriminate, spam, scrape, misrepresent, pressure, or scam other users. HouseLink may limit messaging, suspend access, or escalate reports when conduct threatens marketplace safety.\n\nVerification and trust signals\nVerified badges, identity checks, listing freshness, document reviews, residence history, tenancy confirmations, and trust scores are platform signals, not guarantees. They help reduce risk, but every user remains responsible for confirming property details, identity, payment instructions, viewing arrangements, and written agreements before committing.\n\nPayments, deposits, and transactions\nHouseLink may support payment, proof-of-payment, checkout, rent, subscription, booking, Library order, or verification workflows. Payment availability depends on configured gateways and third-party providers. Before placing an electronic order, customers should review the full transaction, correct mistakes, confirm the selected product or service, and withdraw before final submission if anything is wrong.\n\nReturns, refunds, and cancellations\nReturns, refunds, cancellation requests, defective files, damaged printed books, incorrect products, and consumer-rights questions are handled under the Returns, Refunds & Digital Products Policy and applicable Zimbabwean consumer law. HouseLink does not ask customers to waive statutory consumer rights.\n\nProperty management and consulting\nProperty management, owner support, maintenance coordination, inspections, consultant assignments, and related services may require separate written terms, service scopes, fees, and authorisations. Those service agreements control the specific management relationship.\n\nRoommates and shared living\nRoommate tools help people compare lifestyle, budget, location, household preferences, and verified stays. Users are responsible for deciding whether a room, roommate, household, lease, or viewing arrangement is suitable and safe.\n\nModeration and enforcement\nHouseLink may investigate reports, review activity, remove content, restrict features, suspend accounts, preserve audit logs, and cooperate with lawful requests where needed to protect users, property owners, agents, customers, and the marketplace.\n\nLimits of responsibility\nHouseLink provides marketplace, verification, communication, Library, and workflow tools. We do not own most listed properties, guarantee every transaction, replace legal advice, or remove the need for proper due diligence, written agreements, and compliance with Zimbabwean law.\n\nChanges and contact\nWe may update these terms as the platform grows. Material changes will be reflected by the effective date. Questions, disputes, refund requests, takedown requests, or safety reports should be sent through HouseLink support.",
    effectiveDate: "2026-09-15",
    status: "published",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "privacy",
    title: "HouseLink Privacy Policy",
    summary:
      "This policy explains how HouseLink Zimbabwe collects, uses, protects, and shares data for property search, roommate matching, listings, verification, payments, messaging, support, and safety.",
    body:
      "Information we collect\nHouseLink may collect account details, names, phone numbers, emails, roles, profile photos, roommate preferences, listing content, property media, locations, amenities, prices, availability, enquiries, messages, saved searches, favourites, verification documents, payment references, residence history, reviews, support requests, device information, logs, and admin audit events.\n\nHow we use information\nWe use data to operate HouseLink, show relevant listings and profiles, connect seekers with landlords and agents, power roommate matching, process enquiries, manage accounts, support property management, enable payments, display trust signals, prevent fraud, investigate reports, improve search, and provide customer support.\n\nPhotos, documents, and media\nUploaded photos, profile pictures, listing media, documents, proof-of-payment files, and verification records may be stored with trusted infrastructure providers. Public media may be visible where you publish it, while sensitive documents are limited to authorised workflows and administrators.\n\nLocation and search context\nHouseLink may use city, suburb, preferred areas, map context, device-provided location permission, saved filters, and nearby-place signals to improve search, map discovery, market intelligence, recommendations, and alerts. Browser location is used only when you allow it.\n\nSharing information\nWe share information only when needed to provide the service, complete a user-requested interaction, show a public listing or profile, support verification, process payments, investigate abuse, comply with law, work with trusted providers, or protect users and the marketplace.\n\nPayments and third-party providers\nPayment gateways, cloud media storage, email delivery, analytics, maps, hosting, and infrastructure providers may process limited data for their services. Their processing is governed by their own terms and security controls as well as our configuration choices.\n\nSafety, moderation, and legal compliance\nWe may review content, messages, documents, reports, audit logs, verification signals, account activity, and transaction references to detect scams, fake listings, abuse, policy breaches, disputes, or security issues. We may preserve records where needed for safety, enforcement, legal obligations, or dispute resolution.\n\nYour choices and controls\nYou can update your profile, edit listings, remove photos where the product allows it, manage saved searches and favourites, change visibility settings, request support, or ask for help with account and data changes. Some records may need to be retained for legal, safety, fraud-prevention, or accounting reasons.\n\nData security and retention\nWe use reasonable technical, administrative, and operational safeguards to protect HouseLink data. We keep information for as long as needed to provide the service, maintain marketplace trust, meet legal duties, resolve disputes, prevent abuse, and support legitimate business operations.\n\nContact and updates\nWe may update this policy as HouseLink adds features, integrations, or legal requirements. The effective date shows the current version. Privacy questions or data requests should be sent through HouseLink support.",
    effectiveDate: "2026-07-04",
    status: "published",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "returns",
    title: "Returns, Refunds & Digital Products Policy",
    summary:
      "How HouseLink handles Library digital publications, samples, printed books, cancellations, defective files, incorrect products, and refund requests in Zimbabwe.",
    body:
      "Scope\nThis policy applies to HouseLink Library books, manuals, templates, PDFs, digital publications, downloadable resources, sample previews, printed books, and related order support. It should be read together with the Terms of Service, Privacy Policy, Legal Disclaimer, product page, sample preview where available, and checkout summary.\n\nBefore you buy\nEach customer should review the product title, description, table of contents, available sample, selected format, price, delivery method, and support details before placing an order. At checkout, customers are given an opportunity to review the transaction, correct mistakes, change the selected format, or leave checkout before placing the order.\n\nDigital products\nDigital PDFs, books, templates, toolkits, and downloadable Library products are delivered through HouseLink Library access after payment confirmation. Because digital files can be accessed and copied quickly, a request based only on change of mind is generally not approved after access or download has been granted. This does not limit any consumer right that applies where a product is defective, incomplete, inaccessible, incorrectly supplied, or materially different from its product description or sample.\n\nDefective or inaccessible digital files\nIf a digital file does not open, the download fails, the wrong file is supplied, pages are missing, or access was not granted after confirmed payment, contact HouseLink support with your order number and product title. We will review the issue and may restore access, replace the file, correct the order, provide technical support, or refund where an appropriate remedy cannot be provided.\n\nProduct descriptions and samples\nHouseLink aims to describe Library publications clearly. Samples and tables of contents are provided so customers can inspect the nature and scope of a publication before purchase. If a supplied product materially fails to match the product description or available sample, HouseLink will review the issue under this policy and applicable consumer law.\n\nPrinted books\nPrinted books are tangible goods. You may request help when a printed book arrives damaged, defective, incomplete, or incorrect. Please contact us within 7 days of delivery or pickup with your order number, photos of the packaging where relevant, and photos of the issue. Depending on the circumstances, HouseLink may offer a reprint, replacement, repair, store credit, or refund.\n\nChange of mind\nUnused and sealed printed books may be considered for return within 7 days of delivery or pickup, subject to inspection and practical restocking requirements. Shipping, courier, payment-provider, and return costs may be handled according to the circumstances and applicable law. Digital change-of-mind refunds are generally not approved after digital access or download has been granted.\n\nElectronic cancellations\nWhere Zimbabwean consumer law gives a customer a cooling-off or cancellation right for an electronic transaction, HouseLink will handle the request in line with that law. If HouseLink failed to provide required electronic-transaction information or failed to give the customer a meaningful opportunity to review, correct, or withdraw before placing an order, the customer should contact support promptly so the issue can be reviewed.\n\nEducational content disclaimer\nHouseLink Library publications are educational and professional reference materials. They do not constitute legal, financial, planning, engineering, valuation, architectural, tax, accounting, council, regulatory, or other professional advice for a specific matter. Readers should consult qualified professionals and current official sources before acting on a transaction, dispute, development, building project, or regulated process.\n\nBulk and quoted orders\nBulk printed orders, firm quotes, institutional purchases, team access, and custom fulfilment may include additional written terms. Those terms must still be fair, clear, and consistent with applicable consumer rights.\n\nHow to request help\nContact HouseLink support or the Library support email shown in your order confirmation. Include your order number, product title, selected format, date of purchase, the issue, and the outcome you are requesting. HouseLink aims to respond within 2 business days.\n\nNo waiver of rights\nNothing in this policy is intended to deny, waive, or limit any statutory consumer right that cannot lawfully be limited. If there is a conflict between this policy and applicable consumer law, the applicable law controls.",
    effectiveDate: "2026-09-15",
    status: "published",
    updatedAt: new Date().toISOString(),
  },
];

const legacyDefaultBodyStarts: Record<LegalPageId, string> = {
  terms: "Use accurate information\nListings, profiles, documents, prices, availability, photos, and contact details must be truthful and current.",
  privacy: "Information we collect\nHouseLink may collect account details, contact information, listing data, enquiry messages, verification documents, payment references, device information, and support requests.",
  returns: "Digital products\nDigital PDFs, toolkits, templates, and downloadable Library products are delivered after payment confirmation.",
};

function toLegalPage(row: {
  id: string;
  title: string;
  summary: string;
  body: string;
  effectiveDate: Date;
  status: string;
  updatedAt: Date;
}): LegalPage {
  return {
    id: row.id as LegalPageId,
    title: row.title,
    summary: row.summary,
    body: row.body,
    effectiveDate: row.effectiveDate.toISOString().slice(0, 10),
    status: row.status === "draft" ? "draft" : "published",
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isStrictProduction() {
  return process.env.HOUSELINK_STRICT_PRODUCTION === "true";
}

function defaultLegalPage(id: LegalPageId) {
  return defaultLegalPages.find((page) => page.id === id) ?? null;
}

function cloneDefaultLegalPages() {
  return defaultLegalPages.map((page) => ({ ...page }));
}

type LegalPageDelegate = {
  findMany(args: {
    where?: { id?: { in: LegalPageId[] } };
    orderBy?: { id: "asc" | "desc" };
  }): Promise<Array<Parameters<typeof toLegalPage>[0]>>;
  findUnique(args: { where: { id: LegalPageId } }): Promise<Parameters<typeof toLegalPage>[0] | null>;
  upsert(args: {
    where: { id: LegalPageId };
    create: {
      id: LegalPageId;
      title: string;
      summary: string;
      body: string;
      effectiveDate: Date;
      status: string;
      savedAt?: Date;
    };
    update: Partial<{
      title: string;
      summary: string;
      body: string;
      effectiveDate: Date;
      status: string;
      savedAt: Date;
    }>;
  }): Promise<Parameters<typeof toLegalPage>[0]>;
};

type LegalPagePrisma = {
  legalPageRecord: LegalPageDelegate;
  $executeRawUnsafe(sql: string): Promise<unknown>;
};

let legalPageTableReady = false;

function legalPageDelegate() {
  return (getMainPrisma() as unknown as LegalPagePrisma).legalPageRecord;
}

async function ensureLegalPageTable() {
  if (legalPageTableReady) return;
  const prisma = getMainPrisma() as unknown as LegalPagePrisma;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LegalPageRecord" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "summary" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "effectiveDate" TIMESTAMP(3) NOT NULL,
      "status" TEXT NOT NULL,
      "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  legalPageTableReady = true;
}

async function ensureLegalPageDefaults() {
  if (!isPostgresStoreEnabled()) return;
  await ensureLegalPageTable();
  const legalPageRecord = legalPageDelegate();
  for (const page of defaultLegalPages) {
    const existing = await legalPageRecord.findUnique({ where: { id: page.id } });
    const shouldRefreshDefault =
      !existing ||
      existing.body.startsWith(legacyDefaultBodyStarts[page.id]) ||
      (page.id === "terms" && !existing.body.includes("HouseLink Library purchases")) ||
      (page.id === "returns" && !existing.body.includes("No waiver of rights")) ||
      existing.summary === "These terms explain how people may use HouseLink, what users are responsible for, and how we protect trust across the property marketplace." ||
      existing.summary === "This policy explains what HouseLink collects, how the information is used, and the choices users have over their account data.";

    await legalPageRecord.upsert({
      where: { id: page.id },
      create: {
        id: page.id,
        title: page.title,
        summary: page.summary,
        body: page.body,
        effectiveDate: new Date(`${page.effectiveDate}T00:00:00.000Z`),
        status: page.status,
      },
      update: shouldRefreshDefault
        ? {
            title: page.title,
            summary: page.summary,
            body: page.body,
            effectiveDate: new Date(`${page.effectiveDate}T00:00:00.000Z`),
            status: page.status,
          }
        : {},
    });
  }
}

export async function listLegalPages() {
  if (!isPostgresStoreEnabled()) {
    if (isStrictProduction()) throw new Error("DATABASE_URL is required for legal page persistence.");
    return cloneDefaultLegalPages();
  }
  try {
    await ensureLegalPageDefaults();
    const rows = await legalPageDelegate().findMany({
      where: { id: { in: ["terms", "privacy", "returns"] } },
      orderBy: { id: "desc" },
    });
    return rows.map(toLegalPage).sort((a, b) => legalPageSort(a.id) - legalPageSort(b.id));
  } catch {
    return cloneDefaultLegalPages();
  }
}

function legalPageSort(id: LegalPageId) {
  if (id === "terms") return 0;
  if (id === "privacy") return 1;
  return 2;
}

export async function getLegalPage(id: LegalPageId) {
  if (!isPostgresStoreEnabled()) {
    if (isStrictProduction()) throw new Error("DATABASE_URL is required for legal page persistence.");
    const page = defaultLegalPage(id);
    return page ? { ...page } : null;
  }
  try {
    await ensureLegalPageDefaults();
    const row = await legalPageDelegate().findUnique({ where: { id } });
    return row ? toLegalPage(row) : null;
  } catch {
    const page = defaultLegalPage(id);
    return page ? { ...page } : null;
  }
}

export async function upsertLegalPage(page: LegalPage) {
  if (!isPostgresStoreEnabled()) {
    throw new Error("DATABASE_URL must point to PostgreSQL before legal pages can be saved.");
  }
  await ensureLegalPageTable();
  const row = await legalPageDelegate().upsert({
    where: { id: page.id },
    create: {
      id: page.id,
      title: page.title,
      summary: page.summary,
      body: page.body,
      effectiveDate: new Date(`${page.effectiveDate}T00:00:00.000Z`),
      status: page.status,
      savedAt: new Date(),
    },
    update: {
      title: page.title,
      summary: page.summary,
      body: page.body,
      effectiveDate: new Date(`${page.effectiveDate}T00:00:00.000Z`),
      status: page.status,
      savedAt: new Date(),
    },
  });
  return toLegalPage(row);
}
