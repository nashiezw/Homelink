import type {
  AgentBranch,
  AgentDocument,
  Chargeback,
  CmsBlogPost,
  CmsFaq,
  CmsMediaAsset,
  Coupon,
  EnterpriseOpsState,
  EscrowHold,
  RefundRequest,
  ScheduledCampaign,
  SeasonalRate,
} from "@/lib/admin/enterprise-types";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

export function createEnterpriseOpsState(): EnterpriseOpsState {
  return {
    escrowHolds: [
      {
        id: "esc_1",
        paymentId: "pay_seed_1",
        userId: "user_seeker_tinashe",
        userName: "Tinashe Dube",
        amount: 350,
        listingId: "listing_harare_avondale_cottage",
        listingTitle: "Avondale Cottage",
        status: "HELD",
        holdReason: "Holiday booking pending check-in",
        createdAt: daysAgo(3),
        releaseAt: daysFromNow(4),
      },
      {
        id: "esc_2",
        paymentId: "pay_seed_2",
        userId: "user_landlord",
        userName: "Tariro Moyo",
        amount: 1200,
        status: "DISPUTED",
        holdReason: "Tenancy deposit dispute",
        createdAt: daysAgo(10),
      },
    ],
    chargebacks: [
      {
        id: "cb_1",
        paymentId: "pay_seed_3",
        userName: "Grace Mutasa",
        amount: 49,
        reason: "Subscription not recognized",
        status: "UNDER_REVIEW",
        gateway: "stripe",
        dueDate: daysFromNow(7),
        createdAt: daysAgo(2),
      },
    ],
    coupons: [
      {
        id: "cpn_1",
        code: "WELCOME20",
        label: "New user welcome",
        discountType: "percent",
        discountValue: 20,
        maxUses: 500,
        usedCount: 42,
        validFrom: daysAgo(30),
        validUntil: daysFromNow(60),
        appliesTo: "subscriptions",
        active: true,
      },
      {
        id: "cpn_2",
        code: "HOLIDAY50",
        label: "Holiday home promo",
        discountType: "fixed",
        discountValue: 50,
        maxUses: 100,
        usedCount: 8,
        validFrom: daysAgo(5),
        validUntil: daysFromNow(30),
        appliesTo: "holiday",
        active: true,
      },
    ],
    scheduledCampaigns: [
      {
        id: "camp_1",
        name: "Easter holiday push",
        channel: "email",
        subject: "Book your Easter getaway",
        body: "Discover verified holiday homes across Zimbabwe.",
        audience: "seekers",
        scheduledAt: daysFromNow(14),
        status: "scheduled",
        createdAt: daysAgo(1),
      },
    ],
    blogPosts: [
      {
        id: "blog_1",
        title: "How to find a verified room in Harare",
        slug: "find-verified-room-harare",
        excerpt: "Tips for students and young professionals.",
        body: "Start with verified landlords, compare suburbs, and use HouseLink filters...",
        author: "HouseLink Editorial",
        status: "published",
        publishedAt: daysAgo(7),
        tags: ["renting", "harare", "guides"],
      },
      {
        id: "blog_2",
        title: "Holiday home hosting checklist",
        slug: "holiday-hosting-checklist",
        excerpt: "Prepare your property for short-stay guests.",
        body: "Cleaning, check-in instructions, and pricing strategies...",
        author: "HouseLink Editorial",
        status: "draft",
        tags: ["holiday", "hosts"],
      },
    ],
    faqs: [
      {
        id: "faq_1",
        question: "How do I verify my landlord account?",
        answer: "Upload your national ID and proof of ownership in Settings → Verification.",
        category: "Account",
        sortOrder: 1,
        published: true,
      },
      {
        id: "faq_2",
        question: "What payment methods are accepted?",
        answer: "EcoCash, PayNow, bank transfer, Stripe, and cash at partner offices.",
        category: "Payments",
        sortOrder: 2,
        published: true,
      },
      {
        id: "faq_3",
        question: "How are holiday booking refunds handled?",
        answer: "Refunds follow the host cancellation policy and are reviewed by our finance team.",
        category: "Bookings",
        sortOrder: 3,
        published: true,
      },
    ],
    mediaAssets: [
      {
        id: "media_1",
        name: "hero-summer-2026.jpg",
        url: "/images/roommates/photo-victoria-falls.jpg",
        type: "image",
        sizeKb: 420,
        uploadedAt: daysAgo(3),
        tags: ["hero", "marketing"],
      },
      {
        id: "media_2",
        name: "agent-brochure.pdf",
        url: "/uploads/agent-brochure.pdf",
        type: "document",
        sizeKb: 890,
        uploadedAt: daysAgo(10),
        tags: ["agents"],
      },
    ],
    agentDocuments: [
      {
        id: "adoc_1",
        agentUserId: "user_agent_kudzai",
        agentName: "Kudzai Mhlanga",
        type: "license",
        label: "Estate Agent Licence",
        url: "/uploads/agents/kudzai-licence.pdf",
        status: "verified",
        expiresAt: daysFromNow(180),
        uploadedAt: daysAgo(60),
      },
      {
        id: "adoc_2",
        agentUserId: "user_agent_blessing",
        agentName: "Blessing Ndlovu",
        type: "id",
        label: "National ID",
        url: "/uploads/agents/blessing-id.pdf",
        status: "pending",
        uploadedAt: daysAgo(2),
      },
    ],
    agentBranches: [
      {
        id: "branch_1",
        name: "Harare Prime HQ",
        city: "Harare",
        province: "Harare Metropolitan",
        address: "Samora Machel Ave, CBD",
        phone: "+263242000001",
        managerName: "Blessing Ndlovu",
        agentCount: 12,
        active: true,
      },
      {
        id: "branch_2",
        name: "Bulawayo Office",
        city: "Bulawayo",
        province: "Bulawayo Metropolitan",
        address: "Fife Street",
        phone: "+263292000002",
        managerName: "Tendai Sibanda",
        agentCount: 5,
        active: true,
      },
    ],
    seasonalRates: [
      {
        id: "sr_1",
        listingId: "listing_victoria_falls_lodge",
        listingTitle: "Victoria Falls Lodge",
        label: "Peak season",
        startDate: "2026-07-01",
        endDate: "2026-08-31",
        nightlyRate: 185,
        minStay: 2,
      },
      {
        id: "sr_2",
        listingId: "listing_victoria_falls_lodge",
        listingTitle: "Victoria Falls Lodge",
        label: "Low season",
        startDate: "2026-01-15",
        endDate: "2026-03-31",
        nightlyRate: 95,
        minStay: 1,
      },
    ],
    refundRequests: [
      {
        id: "ref_1",
        enquiryId: "hb_enq_1",
        guestName: "Nyasha Moyo",
        listingTitle: "Victoria Falls Lodge",
        amount: 370,
        reason: "Cancelled trip due to travel restrictions",
        status: "pending",
        createdAt: daysAgo(1),
      },
    ],
  };
}

export function listEscrowHolds(state: EnterpriseOpsState) {
  return [...state.escrowHolds];
}

export function updateEscrowHold(state: EnterpriseOpsState, id: string, status: EscrowHold["status"]) {
  const item = state.escrowHolds.find((e) => e.id === id);
  if (!item) return null;
  item.status = status;
  return item;
}

export function listChargebacks(state: EnterpriseOpsState) {
  return [...state.chargebacks];
}

export function updateChargeback(state: EnterpriseOpsState, id: string, status: Chargeback["status"]) {
  const item = state.chargebacks.find((c) => c.id === id);
  if (!item) return null;
  item.status = status;
  return item;
}

export function listCoupons(state: EnterpriseOpsState) {
  return [...state.coupons];
}

export function upsertCoupon(state: EnterpriseOpsState, coupon: Partial<Coupon> & { code: string }) {
  const existing = state.coupons.find((c) => c.id === coupon.id || c.code === coupon.code);
  if (existing) {
    Object.assign(existing, coupon);
    return existing;
  }
  const created: Coupon = {
    id: `cpn_${crypto.randomUUID().slice(0, 8)}`,
    label: coupon.label ?? coupon.code,
    discountType: coupon.discountType ?? "percent",
    discountValue: coupon.discountValue ?? 10,
    maxUses: coupon.maxUses ?? 100,
    usedCount: 0,
    validFrom: coupon.validFrom ?? new Date().toISOString(),
    validUntil: coupon.validUntil ?? daysFromNow(90),
    appliesTo: coupon.appliesTo ?? "all",
    active: coupon.active ?? true,
    code: coupon.code,
  };
  state.coupons.unshift(created);
  return created;
}

export function removeCoupon(state: EnterpriseOpsState, id: string) {
  const index = state.coupons.findIndex((coupon) => coupon.id === id);
  if (index < 0) return null;
  const [removed] = state.coupons.splice(index, 1);
  return removed;
}

export function listScheduledCampaigns(state: EnterpriseOpsState) {
  return [...state.scheduledCampaigns];
}

export function upsertCampaign(state: EnterpriseOpsState, campaign: Partial<ScheduledCampaign> & { name: string }) {
  if (campaign.id) {
    const existing = state.scheduledCampaigns.find((c) => c.id === campaign.id);
    if (existing) {
      Object.assign(existing, campaign);
      return existing;
    }
  }
  const created: ScheduledCampaign = {
    id: `camp_${crypto.randomUUID().slice(0, 8)}`,
    name: campaign.name,
    channel: campaign.channel ?? "email",
    subject: campaign.subject ?? "",
    body: campaign.body ?? "",
    audience: campaign.audience ?? "all",
    scheduledAt: campaign.scheduledAt ?? daysFromNow(7),
    status: campaign.status ?? "draft",
    createdAt: new Date().toISOString(),
  };
  state.scheduledCampaigns.unshift(created);
  return created;
}

export function cancelCampaign(state: EnterpriseOpsState, id: string) {
  const campaign = state.scheduledCampaigns.find((item) => item.id === id);
  if (!campaign) return null;
  campaign.status = "cancelled";
  return campaign;
}

export function listBlogPosts(state: EnterpriseOpsState) {
  return [...state.blogPosts];
}

export function upsertBlogPost(state: EnterpriseOpsState, post: Partial<CmsBlogPost> & { title: string }) {
  if (post.id) {
    const existing = state.blogPosts.find((p) => p.id === post.id);
    if (existing) {
      Object.assign(existing, post);
      return existing;
    }
  }
  const slug =
    post.slug ??
    post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const created: CmsBlogPost = {
    id: `blog_${crypto.randomUUID().slice(0, 8)}`,
    title: post.title,
    slug,
    excerpt: post.excerpt ?? "",
    body: post.body ?? "",
    author: post.author ?? "Admin",
    status: post.status ?? "draft",
    publishedAt: post.status === "published" ? new Date().toISOString() : undefined,
    tags: post.tags ?? [],
  };
  state.blogPosts.unshift(created);
  return created;
}

export function removeBlogPost(state: EnterpriseOpsState, id: string) {
  const index = state.blogPosts.findIndex((post) => post.id === id);
  if (index < 0) return null;
  const [removed] = state.blogPosts.splice(index, 1);
  return removed;
}

export function listFaqs(state: EnterpriseOpsState) {
  return [...state.faqs].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function upsertFaq(state: EnterpriseOpsState, faq: Partial<CmsFaq> & { question: string; answer: string }) {
  if (faq.id) {
    const existing = state.faqs.find((f) => f.id === faq.id);
    if (existing) {
      Object.assign(existing, faq);
      return existing;
    }
  }
  const created: CmsFaq = {
    id: `faq_${crypto.randomUUID().slice(0, 8)}`,
    question: faq.question,
    answer: faq.answer,
    category: faq.category ?? "General",
    sortOrder: faq.sortOrder ?? state.faqs.length + 1,
    published: faq.published ?? true,
  };
  state.faqs.push(created);
  return created;
}

export function removeFaq(state: EnterpriseOpsState, id: string) {
  const index = state.faqs.findIndex((faq) => faq.id === id);
  if (index < 0) return null;
  const [removed] = state.faqs.splice(index, 1);
  return removed;
}

export function listMediaAssets(state: EnterpriseOpsState) {
  return [...state.mediaAssets];
}

export function addMediaAsset(state: EnterpriseOpsState, asset: Omit<CmsMediaAsset, "id" | "uploadedAt">) {
  const created: CmsMediaAsset = {
    ...asset,
    id: `media_${crypto.randomUUID().slice(0, 8)}`,
    uploadedAt: new Date().toISOString(),
  };
  state.mediaAssets.unshift(created);
  return created;
}

export function removeMediaAsset(state: EnterpriseOpsState, id: string) {
  const index = state.mediaAssets.findIndex((asset) => asset.id === id);
  if (index < 0) return null;
  const [removed] = state.mediaAssets.splice(index, 1);
  return removed;
}

export function listAgentDocuments(state: EnterpriseOpsState) {
  return [...state.agentDocuments];
}

export function updateAgentDocument(state: EnterpriseOpsState, id: string, status: AgentDocument["status"]) {
  const doc = state.agentDocuments.find((d) => d.id === id);
  if (!doc) return null;
  doc.status = status;
  return doc;
}

export function listAgentBranches(state: EnterpriseOpsState) {
  return [...state.agentBranches];
}

export function upsertAgentBranch(state: EnterpriseOpsState, branch: Partial<AgentBranch> & { name: string; city: string }) {
  if (branch.id) {
    const existing = state.agentBranches.find((b) => b.id === branch.id);
    if (existing) {
      Object.assign(existing, branch);
      return existing;
    }
  }
  const created: AgentBranch = {
    id: `branch_${crypto.randomUUID().slice(0, 8)}`,
    name: branch.name,
    city: branch.city,
    province: branch.province ?? branch.city,
    address: branch.address ?? "",
    phone: branch.phone ?? "",
    managerName: branch.managerName ?? "",
    agentCount: branch.agentCount ?? 0,
    active: branch.active ?? true,
  };
  state.agentBranches.push(created);
  return created;
}

export function listSeasonalRates(state: EnterpriseOpsState) {
  return [...state.seasonalRates];
}

export function upsertSeasonalRate(state: EnterpriseOpsState, rate: Partial<SeasonalRate> & { listingId: string; label: string }) {
  if (rate.id) {
    const existing = state.seasonalRates.find((r) => r.id === rate.id);
    if (existing) {
      Object.assign(existing, rate);
      return existing;
    }
  }
  const created: SeasonalRate = {
    id: `sr_${crypto.randomUUID().slice(0, 8)}`,
    listingId: rate.listingId,
    listingTitle: rate.listingTitle ?? rate.listingId,
    label: rate.label,
    startDate: rate.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: rate.endDate ?? daysFromNow(30).slice(0, 10),
    nightlyRate: rate.nightlyRate ?? 100,
    minStay: rate.minStay ?? 1,
  };
  state.seasonalRates.push(created);
  return created;
}

export function listRefundRequests(state: EnterpriseOpsState) {
  return [...state.refundRequests];
}

export function updateRefundRequest(state: EnterpriseOpsState, id: string, status: RefundRequest["status"]) {
  const req = state.refundRequests.find((r) => r.id === id);
  if (!req) return null;
  req.status = status;
  return req;
}

export function generateEnterpriseReport(state: EnterpriseOpsState, type: string) {
  const now = new Date().toISOString();
  switch (type) {
    case "bookings":
      return { type, generatedAt: now, rows: state.refundRequests.map((r) => ({ ...r })) };
    case "agents":
      return {
        type,
        generatedAt: now,
        rows: state.agentBranches.map((b) => ({
          name: b.name,
          city: b.city,
          agents: b.agentCount,
          active: b.active,
        })),
      };
    case "commissions":
      return { type, generatedAt: now, rows: [] };
    case "occupancy":
      return {
        type,
        generatedAt: now,
        rows: state.seasonalRates.map((s) => ({
          listing: s.listingTitle,
          season: s.label,
          rate: s.nightlyRate,
          start: s.startDate,
          end: s.endDate,
        })),
      };
    case "tax":
      return {
        type,
        generatedAt: now,
        rows: state.escrowHolds.map((e) => ({
          id: e.id,
          amount: e.amount,
          status: e.status,
          user: e.userName,
        })),
      };
    default:
      return { type, generatedAt: now, rows: [] };
  }
}
