export type LibraryProductType =
  | "PRINTED_BOOK"
  | "PDF"
  | "DIGITAL_BOOK"
  | "TRAINING_MANUAL"
  | "TOOLKIT"
  | "COURSE"
  | "TEMPLATE"
  | "FORMS"
  | "BUNDLE"
  | "MEMBERSHIP"
  | "SUBSCRIPTION"
  | "GIFT_CARD";

export type LibraryProductStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

export type LibraryProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  edition: string;
  isbn?: string;
  language: string;
  publicationDate: string;
  pages?: number;
  weightGrams?: number;
  bookSize?: string;
  sku: string;
  productType: LibraryProductType;
  status: LibraryProductStatus;
  price: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  category: string;
  collection: string;
  series?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Professional";
  description: string;
  shortDescription: string;
  learningOutcomes: string[];
  whoThisIsFor: string[];
  requirements: string[];
  tableOfContents: string[];
  tags: string[];
  gallery: Array<{ label: string; url: string; kind: "cover" | "back" | "inside" | "mockup" | "video" }>;
  downloads: Array<{ id: string; label: string; fileType: string; size: string; secure: boolean }>;
  stock: number | null;
  lowStockThreshold: number;
  warehouse?: string;
  supplier?: string;
  featured: boolean;
  bestSeller: boolean;
  newRelease: boolean;
  editorsChoice: boolean;
  comingSoon: boolean;
  preorder: boolean;
  downloadCount: number;
  viewCount: number;
  publishedAt: string;
};

export type LibraryOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: "PENDING" | "PAID" | "FULFILLED" | "REFUNDED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
};

export type LibraryAnalytics = {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  revenue: number;
  orders: number;
  downloads: number;
  visitors: number;
  conversionRate: number;
  bestSellers: Array<{ label: string; value: number }>;
  topCategories: Array<{ label: string; value: number }>;
  mostDownloaded: Array<{ label: string; value: number }>;
  mostViewed: Array<{ label: string; value: number }>;
  salesTrend: Array<{ label: string; value: number }>;
  stockLevels: Array<{ label: string; value: number }>;
};

const cover = "/images/academy/agent-academy-hero.png";

export const LIBRARY_PRODUCTS: LibraryProduct[] = [
  {
    id: "lib-property-law-zimbabwe",
    slug: "property-development-and-property-law-in-zimbabwe",
    title: "Property Development and Property Law in Zimbabwe",
    subtitle: "Professional reference manual for developers, agents, and investors",
    author: "HouseLink Zimbabwe Editorial Board",
    publisher: "HouseLink Zimbabwe",
    edition: "2026 Professional Edition",
    isbn: "978-1-77999-001-6",
    language: "English",
    publicationDate: "2026-07-01",
    pages: 286,
    weightGrams: 680,
    bookSize: "A4 professional manual",
    sku: "HL-LAW-2026",
    productType: "TRAINING_MANUAL",
    status: "PUBLISHED",
    price: 49,
    compareAtPrice: 69,
    currency: "USD",
    rating: 4.9,
    reviewCount: 38,
    category: "Property Law",
    collection: "Professional Manuals",
    series: "Zimbabwe Property Practice",
    difficulty: "Professional",
    description:
      "A practical manual covering Zimbabwe property development workflows, agency duties, documentation, transaction risk flags, and professional operating standards.",
    shortDescription: "The flagship legal and development manual for serious property professionals.",
    learningOutcomes: [
      "Understand transaction documentation and compliance risk",
      "Evaluate property development stages from site to sale",
      "Apply professional standards in agency and client service",
      "Identify red flags in mandates, leases, and sales documentation",
    ],
    whoThisIsFor: ["Estate agents", "Property developers", "Landlords", "Investors", "Training managers"],
    requirements: ["Basic property market knowledge", "PDF reader for digital edition"],
    tableOfContents: [
      "Zimbabwe property industry overview",
      "Ownership, title, cession, and lease fundamentals",
      "Development feasibility and approvals",
      "Agency mandates and client documentation",
      "Risk, disputes, and professional ethics",
    ],
    tags: ["law", "development", "manual", "agent training", "contracts"],
    gallery: [
      { label: "Professional cover", url: cover, kind: "cover" },
      { label: "Inside preview", url: cover, kind: "inside" },
      { label: "Digital edition mockup", url: cover, kind: "mockup" },
    ],
    downloads: [{ id: "law-preview", label: "Sample preview PDF", fileType: "PDF", size: "2.4 MB", secure: true }],
    stock: 42,
    lowStockThreshold: 10,
    warehouse: "Harare fulfilment desk",
    supplier: "HouseLink Publishing",
    featured: true,
    bestSeller: true,
    newRelease: true,
    editorsChoice: true,
    comingSoon: false,
    preorder: false,
    downloadCount: 418,
    viewCount: 3260,
    publishedAt: "2026-07-12",
  },
  {
    id: "lib-agent-field-toolkit",
    slug: "estate-agent-field-toolkit",
    title: "Estate Agent Field Toolkit",
    subtitle: "Forms, scripts, checklists, and trackers for daily agent operations",
    author: "HouseLink Agent Academy",
    publisher: "HouseLink Zimbabwe",
    edition: "2026 Field Edition",
    language: "English",
    publicationDate: "2026-07-08",
    pages: 128,
    sku: "HL-TOOLKIT-AGENT-2026",
    productType: "TOOLKIT",
    status: "PUBLISHED",
    price: 29,
    currency: "USD",
    rating: 4.8,
    reviewCount: 51,
    category: "Toolkits",
    collection: "Agent Academy Resources",
    difficulty: "Intermediate",
    description:
      "A complete operational toolkit containing buyer forms, seller intake, landlord registration, viewing registers, appraisal notes, follow-up sheets, and performance trackers.",
    shortDescription: "Print-ready forms and checklists for professional field work.",
    learningOutcomes: ["Collect cleaner client data", "Run better viewings", "Track listings and leads", "Standardise weekly performance reviews"],
    whoThisIsFor: ["New agents", "Agency teams", "Landlord representatives"],
    requirements: ["PDF reader", "Printer for field copies"],
    tableOfContents: ["Client intake", "Listing operations", "Viewing workflow", "Marketing execution", "Performance review"],
    tags: ["forms", "templates", "checklists", "operations"],
    gallery: [{ label: "Toolkit cover", url: cover, kind: "cover" }],
    downloads: [
      { id: "toolkit-zip", label: "Complete ZIP toolkit", fileType: "ZIP", size: "18 MB", secure: true },
      { id: "toolkit-pdf", label: "Combined PDF", fileType: "PDF", size: "9 MB", secure: true },
    ],
    stock: null,
    lowStockThreshold: 0,
    featured: true,
    bestSeller: true,
    newRelease: false,
    editorsChoice: false,
    comingSoon: false,
    preorder: false,
    downloadCount: 692,
    viewCount: 4112,
    publishedAt: "2026-07-08",
  },
  {
    id: "lib-investor-basics",
    slug: "zimbabwe-property-investment-basics",
    title: "Zimbabwe Property Investment Basics",
    subtitle: "A practical guide to rental yield, risk, and suburb selection",
    author: "Tinashe Ndudzo",
    publisher: "HouseLink Zimbabwe",
    edition: "First Edition",
    isbn: "978-1-77999-002-3",
    language: "English",
    publicationDate: "2026-06-18",
    pages: 184,
    sku: "HL-INVEST-101",
    productType: "DIGITAL_BOOK",
    status: "PUBLISHED",
    price: 24,
    currency: "USD",
    rating: 4.7,
    reviewCount: 24,
    category: "Investment",
    collection: "Investor Guides",
    difficulty: "Beginner",
    description:
      "A plain-English investment guide for buyers and landlords comparing yield, location, tenant demand, maintenance exposure, and cash-flow scenarios.",
    shortDescription: "Investor fundamentals for Zimbabwe's rental and sales market.",
    learningOutcomes: ["Calculate yield", "Compare suburbs", "Budget for vacancy", "Assess tenant demand"],
    whoThisIsFor: ["First-time investors", "Landlords", "Diaspora buyers"],
    requirements: ["No prior investment experience required"],
    tableOfContents: ["Market basics", "Yield and costs", "Tenant demand", "Suburb research", "Risk controls"],
    tags: ["investment", "landlord", "yield", "buyers"],
    gallery: [{ label: "Digital cover", url: cover, kind: "cover" }],
    downloads: [{ id: "investor-pdf", label: "Digital book PDF", fileType: "PDF", size: "5 MB", secure: true }],
    stock: null,
    lowStockThreshold: 0,
    featured: false,
    bestSeller: false,
    newRelease: true,
    editorsChoice: true,
    comingSoon: false,
    preorder: false,
    downloadCount: 214,
    viewCount: 1730,
    publishedAt: "2026-06-18",
  },
  {
    id: "lib-lease-pack",
    slug: "lease-and-landlord-document-pack",
    title: "Lease and Landlord Document Pack",
    subtitle: "Editable contract templates, forms, and inspection checklists",
    author: "HouseLink Legal Templates",
    publisher: "HouseLink Zimbabwe",
    edition: "2026 Template Edition",
    language: "English",
    publicationDate: "2026-07-16",
    sku: "HL-LEASE-PACK-2026",
    productType: "FORMS",
    status: "PUBLISHED",
    price: 19,
    currency: "USD",
    rating: 4.6,
    reviewCount: 17,
    category: "Legal Documents",
    collection: "Templates and Forms",
    difficulty: "Intermediate",
    description:
      "A practical bundle of editable landlord and tenancy documents designed to help teams standardise intake, inspections, and lease administration.",
    shortDescription: "Editable tenancy and landlord document templates.",
    learningOutcomes: ["Standardise lease admin", "Improve inspections", "Collect landlord details", "Reduce missing document risk"],
    whoThisIsFor: ["Landlords", "Property managers", "Agents"],
    requirements: ["DOCX compatible editor", "Legal review for final execution"],
    tableOfContents: ["Lease checklist", "Inspection forms", "Landlord intake", "Tenant records", "Renewal tracker"],
    tags: ["contracts", "lease", "docx", "forms"],
    gallery: [{ label: "Document pack", url: cover, kind: "cover" }],
    downloads: [
      { id: "lease-docx", label: "Editable DOCX pack", fileType: "DOCX", size: "6 MB", secure: true },
      { id: "lease-xlsx", label: "Tracking workbook", fileType: "XLSX", size: "1 MB", secure: true },
    ],
    stock: null,
    lowStockThreshold: 0,
    featured: true,
    bestSeller: false,
    newRelease: true,
    editorsChoice: false,
    comingSoon: false,
    preorder: false,
    downloadCount: 156,
    viewCount: 1220,
    publishedAt: "2026-07-16",
  },
  {
    id: "lib-development-course",
    slug: "property-development-foundations-video-course",
    title: "Property Development Foundations",
    subtitle: "Video course with templates, checklists, and project planning tools",
    author: "HouseLink Academy Faculty",
    publisher: "HouseLink Zimbabwe",
    edition: "Cohort-ready Edition",
    language: "English",
    publicationDate: "2026-08-20",
    sku: "HL-COURSE-DEV-FOUND",
    productType: "COURSE",
    status: "SCHEDULED",
    price: 99,
    currency: "USD",
    rating: 0,
    reviewCount: 0,
    category: "Courses",
    collection: "Development Masterclass",
    difficulty: "Advanced",
    description:
      "A guided course for future release, designed to combine video lessons, feasibility worksheets, templates, and downloadable project checklists.",
    shortDescription: "Coming soon: a practical development course for Zimbabwe.",
    learningOutcomes: ["Plan feasibility", "Understand approvals", "Structure project stages", "Track project risk"],
    whoThisIsFor: ["Developers", "Investors", "Project managers"],
    requirements: ["Property market experience recommended"],
    tableOfContents: ["Feasibility", "Approvals", "Budgeting", "Contractors", "Sales and letting"],
    tags: ["course", "development", "video"],
    gallery: [{ label: "Course cover", url: cover, kind: "cover" }],
    downloads: [],
    stock: null,
    lowStockThreshold: 0,
    featured: false,
    bestSeller: false,
    newRelease: false,
    editorsChoice: false,
    comingSoon: true,
    preorder: true,
    downloadCount: 0,
    viewCount: 840,
    publishedAt: "2026-08-20",
  },
];

export const LIBRARY_ORDERS: LibraryOrder[] = [
  { id: "ord-1009", orderNumber: "HL-LIB-1009", customerName: "Rudo Moyo", customerEmail: "rudo@example.com", status: "FULFILLED", paymentStatus: "PAID", total: 78, currency: "USD", itemCount: 2, createdAt: new Date().toISOString() },
  { id: "ord-1008", orderNumber: "HL-LIB-1008", customerName: "Tendai Sithole", customerEmail: "tendai@example.com", status: "PENDING", paymentStatus: "PENDING", total: 49, currency: "USD", itemCount: 1, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
  { id: "ord-1007", orderNumber: "HL-LIB-1007", customerName: "Chipo Dube", customerEmail: "chipo@example.com", status: "FULFILLED", paymentStatus: "PAID", total: 19, currency: "USD", itemCount: 1, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() },
];

export function getLibraryProducts() {
  return LIBRARY_PRODUCTS;
}

export function getLibraryProductBySlug(slug: string) {
  return LIBRARY_PRODUCTS.find((product) => product.slug === slug);
}

export function searchLibraryProducts(input: {
  query?: string;
  category?: string;
  author?: string;
  type?: string;
  difficulty?: string;
  sort?: string;
  maxPrice?: number;
}) {
  const q = input.query?.trim().toLowerCase();
  const filtered = LIBRARY_PRODUCTS.filter((product) => {
    const haystack = [
      product.title,
      product.subtitle,
      product.author,
      product.isbn,
      product.category,
      product.collection,
      product.series,
      product.publisher,
      product.tags.join(" "),
    ].join(" ").toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (input.category && product.category !== input.category) return false;
    if (input.author && product.author !== input.author) return false;
    if (input.type && product.productType !== input.type) return false;
    if (input.difficulty && product.difficulty !== input.difficulty) return false;
    if (input.maxPrice && product.price > input.maxPrice) return false;
    return product.status === "PUBLISHED" || product.status === "SCHEDULED";
  });
  return filtered.sort((a, b) => {
    if (input.sort === "price-asc") return a.price - b.price;
    if (input.sort === "highest-rated") return b.rating - a.rating;
    if (input.sort === "most-downloaded") return b.downloadCount - a.downloadCount;
    if (input.sort === "best-selling") return Number(b.bestSeller) - Number(a.bestSeller) || b.downloadCount - a.downloadCount;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export function getLibraryAnalytics(): LibraryAnalytics {
  const revenue = LIBRARY_ORDERS.filter((order) => order.paymentStatus === "PAID").reduce((sum, order) => sum + order.total, 0);
  return {
    todaySales: 146,
    weeklySales: 928,
    monthlySales: 3840,
    revenue,
    orders: LIBRARY_ORDERS.length,
    downloads: LIBRARY_PRODUCTS.reduce((sum, product) => sum + product.downloadCount, 0),
    visitors: LIBRARY_PRODUCTS.reduce((sum, product) => sum + product.viewCount, 0),
    conversionRate: 4.8,
    bestSellers: LIBRARY_PRODUCTS.filter((p) => p.bestSeller).map((p) => ({ label: p.title, value: p.downloadCount })),
    topCategories: groupProducts("category"),
    mostDownloaded: [...LIBRARY_PRODUCTS].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 5).map((p) => ({ label: p.title, value: p.downloadCount })),
    mostViewed: [...LIBRARY_PRODUCTS].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map((p) => ({ label: p.title, value: p.viewCount })),
    salesTrend: [
      { label: "Mon", value: 120 },
      { label: "Tue", value: 190 },
      { label: "Wed", value: 160 },
      { label: "Thu", value: 240 },
      { label: "Fri", value: 310 },
      { label: "Sat", value: 280 },
      { label: "Sun", value: 190 },
    ],
    stockLevels: LIBRARY_PRODUCTS.filter((p) => p.stock !== null).map((p) => ({ label: p.title, value: p.stock ?? 0 })),
  };
}

export function libraryFacets() {
  const uniq = (items: string[]) => Array.from(new Set(items)).sort();
  return {
    categories: uniq(LIBRARY_PRODUCTS.map((p) => p.category)),
    authors: uniq(LIBRARY_PRODUCTS.map((p) => p.author)),
    types: uniq(LIBRARY_PRODUCTS.map((p) => p.productType)),
    difficulties: uniq(LIBRARY_PRODUCTS.map((p) => p.difficulty)),
  };
}

function groupProducts(key: "category" | "collection") {
  const map = new Map<string, number>();
  LIBRARY_PRODUCTS.forEach((product) => {
    map.set(product[key], (map.get(product[key]) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}
