import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import type { LegalPage, LegalPageId } from "@/lib/legal-pages/types";

const defaultLegalPages: LegalPage[] = [
  {
    id: "terms",
    title: "Terms of Service",
    summary:
      "These terms explain how people may use HomeLink, what users are responsible for, and how we protect trust across the property marketplace.",
    body:
      "Use accurate information\nListings, profiles, documents, prices, availability, photos, and contact details must be truthful and current.\n\nRespect other users\nHarassment, discrimination, scams, impersonation, and abusive messages can lead to restricted access or removal.\n\nFollow housing laws\nLandlords, agents, property managers, consultants, owners, and seekers remain responsible for local rental, sale, consumer, and housing rules.\n\nProtect marketplace trust\nHomeLink may review, flag, remove, or limit content that appears unsafe, duplicate, fraudulent, discriminatory, or misleading.\n\nProperty management services\nProperty management services may require separate signed agreements between owners and assigned consultants. Fees and responsibilities are disclosed before engagement.\n\nTransactions and verification\nUsers should verify listings, payment instructions, documents, and counterparties before transacting. HomeLink may provide tools and moderation, but users remain responsible for their final decisions.",
    effectiveDate: "2026-06-01",
    status: "published",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    summary:
      "This policy explains what HomeLink collects, how the information is used, and the choices users have over their account data.",
    body:
      "Information we collect\nHomeLink may collect account details, contact information, listing data, enquiry messages, verification documents, payment references, device information, and support requests.\n\nHow we use information\nWe use information to operate the marketplace, connect seekers with landlords and agents, process enquiries, support verification, prevent fraud, improve search, and provide customer support.\n\nSharing information\nWe only share information where needed to run the service, complete a user-requested interaction, comply with law, process payments, prevent abuse, or work with trusted service providers.\n\nData security\nWe use reasonable administrative, technical, and operational safeguards to protect account and marketplace information.\n\nUser choices\nUsers may update account details, manage communication preferences, request support, or ask for account and data changes through HomeLink support.\n\nRetention\nHomeLink keeps information for as long as needed to provide the service, meet legal obligations, resolve disputes, prevent fraud, and maintain marketplace safety.",
    effectiveDate: "2026-06-01",
    status: "published",
    updatedAt: new Date().toISOString(),
  },
];

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
  return process.env.HOMELINK_STRICT_PRODUCTION === "true";
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
      update: {},
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
      where: { id: { in: ["terms", "privacy"] } },
      orderBy: { id: "desc" },
    });
    return rows.map(toLegalPage).sort((a, b) => (a.id === "terms" ? -1 : b.id === "terms" ? 1 : 0));
  } catch {
    return cloneDefaultLegalPages();
  }
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
