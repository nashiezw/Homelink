import { BlogArticleLayout, BlogPostStatus, Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";

export type BlogBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "image"; url: string; alt: string; caption?: string }
  | { type: "gallery"; images: Array<{ url: string; alt: string }> }
  | { type: "video"; url: string; title?: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "info"; title?: string; text: string; tone?: "info" | "warning" }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "download"; label: string; url: string }
  | { type: "button"; label: string; url: string }
  | { type: "propertyCard"; title: string; url: string; imageUrl?: string; meta?: string }
  | { type: "dynamicProperty"; listingId: string }
  | { type: "cta"; variant: "whatsapp" | "search" | "rent" | "sale" | "list-property" | "roommate" | "moving" | "agent"; title?: string; text?: string };

type PublicBlogPostRecord = Prisma.BlogPostGetPayload<{ include: { category: true; author: true; tags: true } }>;

export const BLOG_LAYOUTS = [
  { id: "STANDARD_ARTICLE", label: "Standard Article", description: "Balanced editorial layout for advice, explainers, and evergreen resources." },
  { id: "PROPERTY_GUIDE", label: "Property Guide", description: "Structured guide with practical CTAs, section cards, and stronger internal linking." },
  { id: "NEWS_ANNOUNCEMENT", label: "News or Announcement", description: "Tighter news layout for platform updates, market news, and announcements." },
  { id: "LIST_ARTICLE", label: "List Article", description: "Scannable list format for checklists, tips, comparisons, and step-by-step posts." },
] as const;

const DEFAULT_CATEGORIES = [
  ["Renting in Zimbabwe", "Practical rental guides, search tips, affordability, and tenant decisions."],
  ["Buying Property", "Buyer education, location research, viewings, offers, and ownership basics."],
  ["Selling Property", "Seller preparation, pricing, presentation, documents, and buyer communication."],
  ["Property Investment", "Rental yield, portfolio thinking, suburb research, and long-term ownership."],
  ["Landlord Advice", "Listing quality, tenant screening, property management, and compliance."],
  ["Tenant Advice", "Safety, budgeting, lease checks, viewings, and moving decisions."],
  ["Property Development", "Development insights, land, construction, and project planning."],
  ["Property Law", "Legal basics, documentation, agreements, and property risk awareness."],
  ["Moving and Relocation", "Moving checklists, relocation planning, and future HouseLink moving services."],
  ["HouseLink News", "Product updates, platform announcements, and marketplace news."],
] as const;

const STARTER_ARTICLES = [
  {
    title: "How to Find a House to Rent in Zimbabwe Without Wasting Time",
    slug: "how-to-find-a-house-to-rent-in-zimbabwe-without-wasting-time",
    category: "Renting in Zimbabwe",
    tags: ["renting", "tenants", "search safety"],
    excerpt: "A practical guide to searching for rentals, comparing areas, checking listings, and avoiding wasted viewings in Zimbabwe.",
    focusKeyword: "house to rent in Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Start with budget, area, and timing" },
      { type: "paragraph", text: "Before calling every number you see, decide your monthly budget, preferred suburbs, move-in date, and non-negotiables such as water, transport access, security, or parking." },
      { type: "heading", level: 2, text: "Check the listing before travelling" },
      { type: "list", items: ["Confirm the exact suburb and nearby landmarks.", "Ask whether the property is still available.", "Check rent, deposit, lease terms, and extra bills.", "Request recent photos if the advert looks unclear." ] },
      { type: "info", tone: "warning", title: "Avoid rushed payments", text: "Be careful when someone pressures you to pay before viewing, refuses to verify details, or gives vague property information." },
      { type: "cta", variant: "search", title: "Search current rentals", text: "Browse HouseLink listings with clearer property details and location-focused search." },
    ],
  },
  {
    title: "Tenant Safety Checklist Before Paying a Deposit",
    slug: "tenant-safety-checklist-before-paying-a-deposit",
    category: "Tenant Advice",
    tags: ["tenant safety", "deposit", "verification"],
    excerpt: "Use this checklist before paying a rental deposit, signing an agreement, or trusting a listing you found online.",
    focusKeyword: "tenant safety checklist",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Verify the property and person" },
      { type: "list", items: ["View the property or use someone you trust.", "Confirm the landlord, agent, or caretaker identity.", "Compare the advert photos with the real property.", "Keep written proof of payment and communication." ] },
      { type: "heading", level: 2, text: "Read the agreement carefully" },
      { type: "paragraph", text: "Check the rent amount, deposit terms, notice period, bills, repairs, and rules before signing. A clear agreement protects both tenant and owner." },
      { type: "info", tone: "info", title: "HouseLink tip", text: "If something feels rushed or unclear, pause and ask for more evidence before sending money." },
      { type: "cta", variant: "whatsapp" },
    ],
  },
  {
    title: "How Landlords Can Create Better Property Listings",
    slug: "how-landlords-can-create-better-property-listings",
    category: "Landlord Advice",
    tags: ["landlords", "listing quality", "property marketing"],
    excerpt: "Better photos, honest details, and clear terms help landlords attract serious tenants and reduce unnecessary calls.",
    focusKeyword: "better property listings",
    image: "/images/property-management-dusk.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Use clear photos and honest details" },
      { type: "paragraph", text: "Show the exterior, bedrooms, kitchen, bathroom, water setup, parking, and any important limitations. Good listings answer common questions before the first call." },
      { type: "heading", level: 2, text: "Explain costs upfront" },
      { type: "table", headers: ["Detail", "Why it matters"], rows: [["Rent and deposit", "Helps tenants know affordability"], ["Bills", "Avoids disputes later"], ["Available date", "Reduces wasted enquiries"], ["Rules", "Sets expectations early"]] },
      { type: "cta", variant: "list-property", title: "List your property on HouseLink" },
    ],
  },
  {
    title: "Buying Property in Zimbabwe: Questions to Ask Before You Commit",
    slug: "buying-property-in-zimbabwe-questions-to-ask-before-you-commit",
    category: "Buying Property",
    tags: ["buying property", "buyers", "due diligence"],
    excerpt: "A buyer-focused checklist covering location, documents, pricing, viewings, and decision-making before committing to a property.",
    focusKeyword: "buying property in Zimbabwe",
    image: "/images/kwekwe-flat.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Understand the property and location" },
      { type: "paragraph", text: "Look beyond the asking price. Consider road access, services, neighbourhood growth, security, nearby schools, transport, and future resale demand." },
      { type: "heading", level: 2, text: "Ask for the right documents" },
      { type: "list", items: ["Proof of ownership or authority to sell.", "Clear property description and boundaries.", "Any rates, bills, or association obligations.", "Written offer and payment terms." ] },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "Preparing Your Property for Sale: A Seller's Guide",
    slug: "preparing-your-property-for-sale-a-sellers-guide",
    category: "Selling Property",
    tags: ["selling property", "sellers", "home preparation"],
    excerpt: "Simple steps sellers can take to improve presentation, reduce buyer uncertainty, and make the sale process smoother.",
    focusKeyword: "sell property in Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Make the first impression count" },
      { type: "paragraph", text: "Clean rooms, working lights, open curtains, and tidy outdoor areas help buyers see the property clearly. Small repairs can make the home feel better cared for." },
      { type: "heading", level: 2, text: "Prepare your information" },
      { type: "list", items: ["Asking price and negotiation range.", "Reason for selling, if shareable.", "Viewing availability.", "Known repairs or improvements.", "Documents and ownership details." ] },
      { type: "cta", variant: "list-property" },
    ],
  },
  {
    title: "Student Accommodation: What Parents and Students Should Check",
    slug: "student-accommodation-what-parents-and-students-should-check",
    category: "Renting in Zimbabwe",
    tags: ["student accommodation", "boarding houses", "parents"],
    excerpt: "A practical checklist for comparing boarding houses and student rooms near campus routes and learning environments.",
    focusKeyword: "student accommodation Zimbabwe",
    image: "/images/gweru-room-courtyard.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Compare more than price" },
      { type: "list", items: ["Distance to campus or transport route.", "Room sharing rules and capacity.", "Water, WiFi, electricity, meals, and study space.", "Security and visitor policy.", "Move-in cost and payment schedule." ] },
      { type: "info", tone: "info", title: "Parent confidence", text: "Parents should ask for clear photos, rules, exact location context, and who manages the property day to day." },
      { type: "button", label: "Explore student accommodation", url: "/student-accommodation" },
    ],
  },
  {
    title: "Moving House in Zimbabwe: A Practical Relocation Checklist",
    slug: "moving-house-in-zimbabwe-a-practical-relocation-checklist",
    category: "Moving and Relocation",
    tags: ["moving", "relocation", "checklist"],
    excerpt: "Plan packing, transport, timing, helpers, documents, and handover before moving to a new home.",
    focusKeyword: "moving house in Zimbabwe",
    image: "/images/roommates-hero.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Plan the move before the truck arrives" },
      { type: "list", items: ["Confirm move date and access times.", "Photograph valuable or fragile items.", "Separate documents, keys, and essentials.", "Label boxes by room.", "Confirm helpers, vehicle size, and payment terms." ] },
      { type: "info", tone: "info", title: "Coming soon", text: "HouseLink is planning moving resources and services that connect the property journey with relocation support." },
      { type: "cta", variant: "moving" },
    ],
  },
  {
    title: "Why Verification Matters in Property Search",
    slug: "why-verification-matters-in-property-search",
    category: "HouseLink News",
    tags: ["verification", "marketplace safety", "HouseLink"],
    excerpt: "HouseLink's verification and reporting workflows help reduce uncertainty for seekers, landlords, agents, and property owners.",
    focusKeyword: "property verification Zimbabwe",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.NEWS_ANNOUNCEMENT,
    blocks: [
      { type: "heading", level: 2, text: "Property search needs trust" },
      { type: "paragraph", text: "Verification is not just a badge. It is part of a safer marketplace where users can compare information, report concerns, and make decisions with better context." },
      { type: "heading", level: 2, text: "What users should still do" },
      { type: "list", items: ["View before paying where possible.", "Keep communication records.", "Check names, numbers, and property details.", "Report suspicious listings quickly." ] },
      { type: "button", label: "Read safety guidance", url: "/safety" },
    ],
  },
] as const;

export async function ensureBlogDefaults(actorId?: string) {
  const prisma = getMainPrisma();
  await Promise.all(
    DEFAULT_CATEGORIES.map(([name, description], sortOrder) =>
      prisma.blogCategory.upsert({
        where: { slug: slugify(name) },
        update: { name, description, sortOrder, active: true },
        create: {
          name,
          slug: slugify(name),
          description,
          sortOrder,
          seoTitle: `${name} | HouseLink Zimbabwe`,
          metaDescription: description,
        },
      }),
    ),
  );
  await prisma.blogAuthor.upsert({
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
  const author = await prisma.blogAuthor.findUnique({ where: { slug: "houselink-editorial-team" } });
  const categories = await prisma.blogCategory.findMany({ where: { slug: { in: STARTER_ARTICLES.map((article) => slugify(article.category)) } } });
  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  for (const article of STARTER_ARTICLES) {
    const category = categoryByName.get(article.category);
    if (!category || !author) continue;
    const existing = await prisma.blogPost.findUnique({ where: { slug: article.slug } });
    if (existing) {
      if (!existing.featuredImageUrl || existing.featuredImageUrl === "/images/houselink-hero.webp") {
        await prisma.blogPost.update({
          where: { id: existing.id },
          data: {
            featuredImageUrl: article.image,
            featuredImageAlt: article.title,
            socialImageUrl: article.image,
          },
        });
      }
      continue;
    }
    const articleTags = [...article.tags];
    const articleBlocks = article.blocks.map((block) => ({ ...block })) as BlogBlock[];
    const tagIds = await resolveTags(articleTags);
    const contentText = blocksToText(articleBlocks);
    await prisma.blogPost.create({
      data: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        status: "PUBLISHED",
        layout: article.layout,
        categoryId: category.id,
        authorId: author.id,
        featuredImageUrl: article.image,
        featuredImageAlt: article.title,
        socialImageUrl: article.image,
        contentBlocks: articleBlocks as Prisma.InputJsonValue,
        contentText,
        seoTitle: `${article.title} | HouseLink Zimbabwe`,
        metaDescription: article.excerpt,
        focusKeyword: article.focusKeyword,
        secondaryKeywords: articleTags,
        featured: article.category === "Renting in Zimbabwe",
        popular: ["Tenant Advice", "Landlord Advice", "Moving and Relocation"].includes(article.category),
        readTimeMinutes: estimateReadTime(contentText),
        searchVector: `${article.title} ${article.excerpt} ${contentText} ${articleTags.join(" ")}`,
        publishedAt: new Date(),
        createdById: actorId,
        lastEditedById: actorId,
        tags: { connect: tagIds.map((id) => ({ id })) },
      },
    });
  }
  if (actorId) {
    await audit("blog.defaults.ensure", "blog", actorId, { categories: DEFAULT_CATEGORIES.length });
  }
}

export async function getPublicBlogIndex(params: { query?: string; category?: string; tag?: string; page?: number; limit?: number; popular?: boolean }) {
  await ensureBlogDefaults();
  const prisma = getMainPrisma();
  const limit = Math.min(Math.max(Number(params.limit ?? 9), 1), 24);
  const page = Math.max(Number(params.page ?? 1), 1);
  const where = publicWhere(params);
  const [posts, total, categories, featured, popular, editorsPicks, recentlyUpdated, latestNews, trendingTopics] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: blogIncludes(),
      orderBy: params.popular ? [{ viewCount: "desc" }, { publishedAt: "desc" }] : [{ publishedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
    prisma.blogCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.blogPost.findFirst({ where: { ...publicWhere({}), featured: true }, include: blogIncludes(), orderBy: [{ publishedAt: "desc" }] }),
    prisma.blogPost.findMany({ where: { ...publicWhere({}), popular: true }, include: blogIncludes(), orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }], take: 5 }),
    prisma.blogPost.findMany({ where: { ...publicWhere({}), featured: true }, include: blogIncludes(), orderBy: [{ updatedAt: "desc" }], take: 4 }),
    prisma.blogPost.findMany({ where: publicWhere({}), include: blogIncludes(), orderBy: [{ updatedAt: "desc" }], take: 4 }),
    prisma.blogPost.findMany({ where: { ...publicWhere({}), category: { slug: "houselink-news" } }, include: blogIncludes(), orderBy: [{ publishedAt: "desc" }], take: 4 }),
    prisma.blogTag.findMany({ where: { active: true, posts: { some: publicWhere({}) } }, include: { _count: { select: { posts: true } } }, orderBy: { posts: { _count: "desc" } }, take: 10 }),
  ]);
  if (params.query) {
    await prisma.blogSearchLog.create({ data: { query: params.query, category: params.category, tag: params.tag, results: total } });
  }
  return { posts, total, page, limit, hasMore: page * limit < total, categories, featured, popular, editorsPicks, recentlyUpdated, latestNews, trendingTopics };
}

export async function getPublicBlogCategory(slug: string, params: { page?: number; limit?: number }) {
  await ensureBlogDefaults();
  const prisma = getMainPrisma();
  const category = await prisma.blogCategory.findFirst({ where: { slug, active: true } });
  if (!category) return null;
  const result = await getPublicBlogIndex({ category: slug, page: params.page, limit: params.limit });
  return { category, ...result };
}

export async function getPublicBlogPost(slug: string, incrementView = false) {
  await ensureBlogDefaults();
  const prisma = getMainPrisma();
  const post = await prisma.blogPost.findFirst({ where: { ...publicWhere({}), slug }, include: blogIncludes() });
  if (!post) return null;
  if (incrementView) {
    await prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch((error) => {
      console.error("Blog view count update failed", { slug, error });
    });
  }
  const [related, neighbours, authorArticleCount] = await Promise.all([
    prisma.blogPost.findMany({
      where: {
        ...publicWhere({}),
        id: { not: post.id },
        OR: [{ categoryId: post.categoryId ?? undefined }, { tags: { some: { id: { in: post.tags.map((tag) => tag.id) } } } }],
      },
      include: blogIncludes(),
      orderBy: [{ publishedAt: "desc" }],
      take: 3,
    }),
    prisma.blogPost.findMany({ where: publicWhere({}), select: { title: true, slug: true, publishedAt: true }, orderBy: [{ publishedAt: "desc" }] }),
    post.authorId ? prisma.blogPost.count({ where: { ...publicWhere({}), authorId: post.authorId } }) : Promise.resolve(0),
  ]);
  const relatedListings = await getRelatedListingsForBlogPost(post).catch((error) => {
    console.error("Blog related listings failed", { slug, error });
    return [];
  });
  const index = neighbours.findIndex((item) => item.slug === post.slug);
  return { post, related, relatedListings, authorArticleCount, relatedCategories: post.category ? [post.category] : [], previous: neighbours[index + 1] ?? null, next: index > 0 ? neighbours[index - 1] : null };
}

async function getRelatedListingsForBlogPost(post: PublicBlogPostRecord) {
  const prisma = getMainPrisma();
  const terms = [post.focusKeyword, post.category?.name, post.title.split(":")[0]]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const primaryTerm = terms[0] || "property";
  return prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { city: { contains: post.category?.name?.split(" ")[0] ?? "", mode: "insensitive" } },
        { title: { contains: primaryTerm, mode: "insensitive" } },
        { description: { contains: primaryTerm, mode: "insensitive" } },
      ],
    },
    include: { media: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    take: 3,
  });
}

export async function getPublicBlogAuthor(slug: string, params: { page?: number; limit?: number }) {
  await ensureBlogDefaults();
  const prisma = getMainPrisma();
  const author = await prisma.blogAuthor.findFirst({ where: { slug, active: true } });
  if (!author) return null;
  const limit = Math.min(Math.max(Number(params.limit ?? 9), 1), 24);
  const page = Math.max(Number(params.page ?? 1), 1);
  const where = { ...publicWhere({}), authorId: author.id };
  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({ where, include: blogIncludes(), orderBy: [{ publishedAt: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.blogPost.count({ where }),
  ]);
  return { author, posts, total, page, limit, hasMore: page * limit < total };
}

export async function getBlogSearchSuggestions(query: string) {
  await ensureBlogDefaults();
  const prisma = getMainPrisma();
  const q = query.trim();
  if (!q) return { articles: [], categories: [], tags: [], authors: [] };
  const [articles, categories, tags, authors] = await Promise.all([
    prisma.blogPost.findMany({ where: { ...publicWhere({ query: q }) }, select: { title: true, slug: true, excerpt: true }, take: 5 }),
    prisma.blogCategory.findMany({ where: { active: true, name: { contains: q, mode: "insensitive" } }, select: { name: true, slug: true }, take: 5 }),
    prisma.blogTag.findMany({ where: { active: true, name: { contains: q, mode: "insensitive" } }, select: { name: true, slug: true }, take: 5 }),
    prisma.blogAuthor.findMany({ where: { active: true, name: { contains: q, mode: "insensitive" } }, select: { name: true, slug: true }, take: 5 }),
  ]);
  return { articles, categories, tags, authors };
}

export async function trackBlogDownload(postId: string, label: string, url: string) {
  const prisma = getMainPrisma();
  return prisma.blogDownload.upsert({
    where: { postId_url: { postId, url } },
    update: { count: { increment: 1 }, label },
    create: { postId, label, url, count: 1 },
  });
}

export async function getBlogSitemapEntries() {
  await ensureBlogDefaults();
  const prisma = getMainPrisma();
  const [posts, categories, authors] = await Promise.all([
    prisma.blogPost.findMany({ where: publicWhere({}), select: { slug: true, updatedAt: true } }),
    prisma.blogCategory.findMany({ where: { active: true, posts: { some: publicWhere({}) } }, select: { slug: true, updatedAt: true } }),
    prisma.blogAuthor.findMany({ where: { active: true, posts: { some: publicWhere({}) } }, select: { slug: true, updatedAt: true } }),
  ]);
  return { posts, categories, authors };
}

export async function getAdminBlogDashboard() {
  await ensureBlogDefaults();
  const prisma = getMainPrisma();
  const [posts, categories, authors, tags] = await Promise.all([
    prisma.blogPost.findMany({ include: blogIncludes(), orderBy: [{ updatedAt: "desc" }] }),
    prisma.blogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.blogAuthor.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.blogTag.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
  ]);
  const published = posts.filter((post) => post.status === "PUBLISHED");
  const draft = posts.filter((post) => post.status === "DRAFT");
  const totalViews = posts.reduce((sum, post) => sum + post.viewCount, 0);
  return {
    posts,
    categories,
    authors,
    tags,
    layouts: BLOG_LAYOUTS,
    stats: {
      totalArticles: posts.length,
      totalPublished: published.length,
      totalDrafts: draft.length,
      totalScheduled: posts.filter((post) => post.status === "SCHEDULED").length,
      totalViews,
      averageReadingTime: posts.length ? Math.round(posts.reduce((sum, post) => sum + post.readTimeMinutes, 0) / posts.length) : 0,
      mostViewed: [...posts].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
      recentArticles: posts.slice(0, 5),
      popularCategories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        count: posts.filter((post) => post.categoryId === category.id).length,
      })).sort((a, b) => b.count - a.count).slice(0, 5),
      activity: posts.slice(0, 8).map((post) => ({ id: post.id, title: post.title, status: post.status, updatedAt: post.updatedAt })),
      topDownloads: await prisma.blogDownload.findMany({ orderBy: { count: "desc" }, take: 8 }),
      mostSearchedKeywords: await prisma.blogSearchLog.groupBy({ by: ["query"], _count: { query: true }, orderBy: { _count: { query: "desc" } }, take: 8 }),
    },
    suggestions: {
      services: [
        { label: "Search Properties", url: "/search" },
        { label: "View Houses for Rent", url: "/rent/harare" },
        { label: "View Houses for Sale", url: "/property-for-sale/harare" },
        { label: "List Your Property", url: "/dashboard/landlord/new" },
        { label: "Find a Roommate", url: "/roommates" },
        { label: "Book Moving Services", url: "/blog/category/moving-and-relocation" },
        { label: "Register as an Agent", url: "/become-agent" },
        { label: "Contact HouseLink", url: "/contact" },
      ],
      posts: posts.slice(0, 8).map((post) => ({ title: post.title, url: `/blog/${post.slug}` })),
      categories: categories.slice(0, 8).map((category) => ({ title: category.name, url: `/blog/category/${category.slug}` })),
      listings: await prisma.listing.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, title: true, slug: true, city: true, suburb: true, price: true, currency: true, bedrooms: true, propertyType: true, media: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        take: 8,
      }),
    },
  };
}

export async function runAdminBlogAction(body: Record<string, any>, actor: { id: string; name?: string }) {
  await ensureBlogDefaults(actor.id);
  const prisma = getMainPrisma();
  const action = String(body.action ?? "");
  if (action === "save_post") {
    const input = normalisePostInput(body.post ?? {});
    const tagIds = await resolveTags(input.tags ?? []);
    const data = postData(input, actor.id);
    const post = input.id
      ? await prisma.blogPost.update({ where: { id: input.id }, data: { ...data, tags: { set: tagIds.map((id) => ({ id })) } }, include: blogIncludes() })
      : await prisma.blogPost.create({ data: { ...data, createdById: actor.id, tags: { connect: tagIds.map((id) => ({ id })) } }, include: blogIncludes() });
    await audit(input.id ? "blog.post.update" : "blog.post.create", post.id, actor.id, { title: post.title, status: post.status });
    return post;
  }
  if (action === "delete_post") {
    const post = await prisma.blogPost.delete({ where: { id: String(body.postId) } });
    await audit("blog.post.delete", post.id, actor.id, { title: post.title });
    return post;
  }
  if (action === "duplicate_post") {
    const current = await prisma.blogPost.findUnique({ where: { id: String(body.postId) }, include: { tags: true } });
    if (!current) return null;
    const copy = await prisma.blogPost.create({
      data: {
        title: `${current.title} Copy`,
        slug: await uniqueSlug(`${current.slug}-copy`),
        excerpt: current.excerpt,
        status: "DRAFT",
        layout: current.layout,
        categoryId: current.categoryId,
        authorId: current.authorId,
        featuredImageUrl: current.featuredImageUrl,
        featuredImageAlt: current.featuredImageAlt,
        socialImageUrl: current.socialImageUrl,
        contentBlocks: current.contentBlocks as Prisma.InputJsonValue,
        contentText: current.contentText,
        seoTitle: current.seoTitle,
        metaDescription: current.metaDescription,
        focusKeyword: current.focusKeyword,
        secondaryKeywords: current.secondaryKeywords,
        canonicalUrl: current.canonicalUrl,
        noIndex: true,
        readTimeMinutes: current.readTimeMinutes,
        searchVector: current.searchVector,
        createdById: actor.id,
        lastEditedById: actor.id,
        tags: { connect: current.tags.map((tag) => ({ id: tag.id })) },
      },
      include: blogIncludes(),
    });
    await audit("blog.post.duplicate", copy.id, actor.id, { sourceId: current.id });
    return copy;
  }
  if (action === "status_post") {
    const status = enumValue(BlogPostStatus, body.status, BlogPostStatus.DRAFT);
    const post = await prisma.blogPost.update({
      where: { id: String(body.postId) },
      data: {
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : undefined,
        archivedAt: status === "ARCHIVED" ? new Date() : undefined,
        lastEditedById: actor.id,
      },
      include: blogIncludes(),
    });
    await audit("blog.post.status", post.id, actor.id, { status });
    return post;
  }
  if (action === "save_category") {
    const category = body.category ?? {};
    const id = typeof category.id === "string" ? category.id : undefined;
    const data = {
      name: required(category.name, "Category name"),
      slug: slugify(category.slug || category.name),
      description: stringOrNull(category.description),
      imageUrl: stringOrNull(category.imageUrl),
      seoTitle: stringOrNull(category.seoTitle),
      metaDescription: stringOrNull(category.metaDescription),
      sortOrder: numberOr(category.sortOrder, 0),
      active: category.active !== false,
    };
    const saved = id ? await prisma.blogCategory.update({ where: { id }, data }) : await prisma.blogCategory.create({ data });
    await audit(id ? "blog.category.update" : "blog.category.create", saved.id, actor.id, { name: saved.name });
    return saved;
  }
  if (action === "delete_category") {
    const saved = await prisma.blogCategory.update({ where: { id: String(body.categoryId) }, data: { active: false } });
    await audit("blog.category.delete", saved.id, actor.id, { name: saved.name });
    return saved;
  }
  if (action === "save_author") {
    const author = body.author ?? {};
    const id = typeof author.id === "string" ? author.id : undefined;
    const data = {
      name: required(author.name, "Author name"),
      slug: slugify(author.slug || author.name),
      role: stringOrNull(author.role),
      bio: stringOrNull(author.bio),
      avatarUrl: stringOrNull(author.avatarUrl),
      email: stringOrNull(author.email),
      active: author.active !== false,
    };
    const saved = id ? await prisma.blogAuthor.update({ where: { id }, data }) : await prisma.blogAuthor.create({ data });
    await audit(id ? "blog.author.update" : "blog.author.create", saved.id, actor.id, { name: saved.name });
    return saved;
  }
  if (action === "save_tag") {
    const tag = body.tag ?? {};
    const id = typeof tag.id === "string" ? tag.id : undefined;
    const data = { name: required(tag.name, "Tag name"), slug: slugify(tag.slug || tag.name), description: stringOrNull(tag.description), active: tag.active !== false };
    const saved = id ? await prisma.blogTag.update({ where: { id }, data }) : await prisma.blogTag.create({ data });
    await audit(id ? "blog.tag.update" : "blog.tag.create", saved.id, actor.id, { name: saved.name });
    return saved;
  }
  return null;
}

function publicWhere(params: { query?: string; category?: string; tag?: string }) {
  const now = new Date();
  const AND: Prisma.BlogPostWhereInput[] = [
    { status: "PUBLISHED", noIndex: false },
    { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
  ];
  if (params.category) AND.push({ category: { slug: params.category, active: true } });
  if (params.tag) AND.push({ tags: { some: { slug: params.tag, active: true } } });
  if (params.query) {
    const q = params.query;
    AND.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { contentText: { contains: q, mode: "insensitive" } },
        { focusKeyword: { contains: q, mode: "insensitive" } },
        { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  return { AND };
}

function blogIncludes() {
  return { category: true, author: true, tags: true } satisfies Prisma.BlogPostInclude;
}

function normalisePostInput(input: Record<string, any>) {
  const blocks = sanitiseBlocks(Array.isArray(input.contentBlocks) ? input.contentBlocks : defaultBlocks(input.excerpt));
  const contentText = blocksToText(blocks);
  const title = required(input.title, "Article title");
  const status = enumValue(BlogPostStatus, input.status, BlogPostStatus.DRAFT);
  return {
    id: typeof input.id === "string" ? input.id : undefined,
    title,
    slug: slugify(input.slug || title),
    excerpt: required(input.excerpt, "Article excerpt"),
    status,
    layout: enumValue(BlogArticleLayout, input.layout, BlogArticleLayout.STANDARD_ARTICLE),
    categoryId: stringOrNull(input.categoryId),
    authorId: stringOrNull(input.authorId),
    featuredImageUrl: stringOrNull(input.featuredImageUrl),
    featuredImageAlt: stringOrNull(input.featuredImageAlt),
    socialImageUrl: stringOrNull(input.socialImageUrl),
    contentBlocks: blocks,
    contentText,
    seoTitle: stringOrNull(input.seoTitle),
    metaDescription: stringOrNull(input.metaDescription),
    focusKeyword: stringOrNull(input.focusKeyword),
    secondaryKeywords: arrayOfStrings(input.secondaryKeywords),
    canonicalUrl: stringOrNull(input.canonicalUrl),
    noIndex: Boolean(input.noIndex),
    featured: Boolean(input.featured),
    popular: Boolean(input.popular),
    readTimeMinutes: Math.max(numberOr(input.readTimeMinutes, estimateReadTime(contentText)), 1),
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
    publishedAt: input.publishedAt ? new Date(input.publishedAt) : status === "PUBLISHED" ? new Date() : null,
    tags: arrayOfStrings(input.tags),
    searchVector: `${title} ${input.excerpt ?? ""} ${contentText} ${arrayOfStrings(input.tags).join(" ")}`.slice(0, 12000),
  };
}

function postData(input: ReturnType<typeof normalisePostInput>, actorId: string): Prisma.BlogPostUncheckedCreateInput & Prisma.BlogPostUncheckedUpdateInput {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    status: input.status,
    layout: input.layout,
    categoryId: input.categoryId,
    authorId: input.authorId,
    featuredImageUrl: input.featuredImageUrl,
    featuredImageAlt: input.featuredImageAlt,
    socialImageUrl: input.socialImageUrl,
    contentBlocks: input.contentBlocks as Prisma.InputJsonValue,
    contentText: input.contentText,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    focusKeyword: input.focusKeyword,
    secondaryKeywords: input.secondaryKeywords,
    canonicalUrl: input.canonicalUrl,
    noIndex: input.noIndex,
    featured: input.featured,
    popular: input.popular,
    readTimeMinutes: input.readTimeMinutes,
    scheduledAt: input.status === "SCHEDULED" ? input.scheduledAt : null,
    publishedAt: input.publishedAt,
    lastEditedById: actorId,
    archivedAt: input.status === "ARCHIVED" ? new Date() : null,
    searchVector: input.searchVector,
  };
}

function sanitiseBlocks(blocks: any[]): BlogBlock[] {
  return blocks.slice(0, 80).map((block): BlogBlock | null => {
    const type = String(block?.type ?? "paragraph");
    if (type === "heading") return { type: "heading", level: block.level === 3 ? 3 : 2, text: clean(block.text) };
    if (type === "paragraph") return { type: "paragraph", text: clean(block.text) };
    if (type === "list") return { type: "list", ordered: Boolean(block.ordered), items: arrayOfStrings(block.items).slice(0, 30) };
    if (type === "image") return { type: "image", url: safeUrl(block.url), alt: clean(block.alt || "HouseLink blog image"), caption: clean(block.caption) };
    if (type === "gallery") return { type: "gallery", images: Array.isArray(block.images) ? block.images.slice(0, 8).map((image: any) => ({ url: safeUrl(image.url), alt: clean(image.alt || "Gallery image") })) : [] };
    if (type === "video") return { type: "video", url: safeUrl(block.url), title: clean(block.title) };
    if (type === "quote") return { type: "quote", text: clean(block.text), cite: clean(block.cite) };
    if (type === "info") return { type: "info", title: clean(block.title), text: clean(block.text), tone: block.tone === "warning" ? "warning" : "info" };
    if (type === "table") return { type: "table", headers: arrayOfStrings(block.headers).slice(0, 8), rows: Array.isArray(block.rows) ? block.rows.slice(0, 20).map(arrayOfStrings) : [] };
    if (type === "download") return { type: "download", label: clean(block.label), url: safeUrl(block.url) };
    if (type === "button") return { type: "button", label: clean(block.label), url: safeUrl(block.url) };
    if (type === "propertyCard") return { type: "propertyCard", title: clean(block.title), url: safeUrl(block.url), imageUrl: safeUrl(block.imageUrl), meta: clean(block.meta) };
    if (type === "dynamicProperty") return { type: "dynamicProperty", listingId: clean(block.listingId) };
    if (type === "cta") return { type: "cta", variant: ["whatsapp", "search", "rent", "sale", "list-property", "roommate", "moving", "agent"].includes(block.variant) ? block.variant : "search", title: clean(block.title), text: clean(block.text) } as BlogBlock;
    return null;
  }).filter(Boolean) as BlogBlock[];
}

function defaultBlocks(excerpt?: string) {
  return [{ type: "paragraph", text: excerpt || "" }, { type: "cta", variant: "search" }];
}

function blocksToText(blocks: BlogBlock[]) {
  return blocks.flatMap((block) => {
    if ("text" in block && block.text) return [block.text];
    if (block.type === "list") return block.items;
    if (block.type === "table") return [...block.headers, ...block.rows.flat()];
    if (block.type === "propertyCard") return [block.title, block.meta ?? ""];
    return [];
  }).join(" ");
}

async function resolveTags(names: string[]) {
  const prisma = getMainPrisma();
  const tags = await Promise.all(names.map((name) =>
    prisma.blogTag.upsert({
      where: { slug: slugify(name) },
      update: { name, active: true },
      create: { name, slug: slugify(name), active: true },
    }),
  ));
  return tags.map((tag) => tag.id);
}

async function uniqueSlug(base: string) {
  const prisma = getMainPrisma();
  let slug = slugify(base);
  let index = 2;
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${index}`;
    index += 1;
  }
  return slug;
}

async function audit(action: string, targetId: string, actorId?: string, metadata?: Prisma.InputJsonObject) {
  await getMainPrisma().blogAuditLog.create({ data: { action, targetId, actorId, metadata } });
}

export function slugify(value: string) {
  return String(value || "article")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "article";
}

function clean(value: unknown) {
  return String(value ?? "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/[<>]/g, "").trim();
}

function safeUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") || raw.startsWith("https://") || raw.startsWith("http://")) return raw;
  return "";
}

function required(value: unknown, label: string) {
  const text = clean(value);
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function stringOrNull(value: unknown) {
  const text = clean(value);
  return text || null;
}

function numberOr(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function arrayOfStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  if (typeof value === "string") return value.split(",").map(clean).filter(Boolean);
  return [];
}

function enumValue<T extends Record<string, string>>(source: T, value: unknown, fallback: T[keyof T]) {
  const candidate = String(value ?? "");
  return Object.values(source).includes(candidate) ? candidate as T[keyof T] : fallback;
}

function estimateReadTime(text: string) {
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 220));
}
