import { BlogArticleLayout, BlogPostStatus, ListingStatus, Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { ensureBlogProductionSchema } from "@/lib/db/production-schema";

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

const PROPERTY_DEVELOPMENT_LAW_BOOK_URL = "/library/the-complete-guide-to-property-development-and-property-law-in-zimbabwe";

function isMissingBlogEngagementTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; meta?: { table?: unknown } };
  return candidate.code === "P2021" && typeof candidate.meta?.table === "string" && /blog_(comments|article_feedback|reader_questions)/.test(candidate.meta.table);
}

async function getBlogEngagementDashboardData(prisma: ReturnType<typeof getMainPrisma>) {
  try {
    const [commentQueue, approvedComments, helpfulVotes, needsWorkVotes, comments, feedback] = await Promise.all([
      prisma.blogComment.count({ where: { status: "PENDING" } }),
      prisma.blogComment.count({ where: { status: "APPROVED" } }),
      prisma.blogArticleFeedback.count({ where: { vote: "HELPFUL" } }),
      prisma.blogArticleFeedback.count({ where: { vote: "NEEDS_WORK" } }),
      prisma.blogComment.findMany({
        include: { post: { select: { title: true, slug: true } }, parent: { select: { authorName: true, body: true } } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 80,
      }),
      prisma.blogArticleFeedback.findMany({
        include: { post: { select: { title: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
    ]);

    return { commentQueue, approvedComments, helpfulVotes, needsWorkVotes, comments, feedback };
  } catch (error) {
    if (!isMissingBlogEngagementTableError(error)) throw error;
    console.warn("Blog engagement tables are unavailable; returning empty admin engagement data.");
    return {
      commentQueue: 0,
      approvedComments: 0,
      helpfulVotes: 0,
      needsWorkVotes: 0,
      comments: [],
      feedback: [],
    };
  }
}

async function getBlogReaderQuestionDashboardData(prisma: ReturnType<typeof getMainPrisma>) {
  try {
    const [readerQuestions, newReaderQuestions, questions] = await Promise.all([
      prisma.blogReaderQuestion.count(),
      prisma.blogReaderQuestion.count({ where: { status: "NEW" } }),
      prisma.blogReaderQuestion.findMany({
        include: { post: { select: { title: true, slug: true } } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 80,
      }),
    ]);
    return { readerQuestions, newReaderQuestions, questions };
  } catch (error) {
    if (!isMissingBlogEngagementTableError(error)) throw error;
    console.warn("Blog reader question table is unavailable; returning empty admin question data.");
    return { readerQuestions: 0, newReaderQuestions: 0, questions: [] };
  }
}

const STARTER_ARTICLES = [
  {
    title: "How to Find a House to Rent in Zimbabwe Without Wasting Time",
    slug: "how-to-find-a-house-to-rent-in-zimbabwe-without-wasting-time",
    category: "Renting in Zimbabwe",
    tags: ["renting", "tenants", "search safety"],
    excerpt: "A practical rental-search system for Zimbabwe: budget checks, suburb shortlisting, viewing questions, move-in costs, and red flags.",
    focusKeyword: "house to rent in Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Begin with the real monthly cost" },
      { type: "paragraph", text: "A rental decision is not only the advertised rent. In Zimbabwe, tenants should compare the full monthly cost: rent, security deposit recovery terms, ZESA tokens, water, refuse, levies, transport, internet, parking, caretaker fees, and any shared-service contribution for borehole, solar backup, generator fuel, or security." },
      { type: "table", headers: ["Cost to confirm", "Question to ask before viewing"], rows: [["Deposit", "Is it refundable, how is it held, and what deductions are allowed?"], ["Utilities", "Are ZESA, water, WiFi, refuse, and levies included or separate?"], ["Power and water", "Is there a prepaid meter, backup power, borehole, tank, or municipal schedule?"], ["Transport", "How much will daily commuting add to the rent?"], ["Move-in fees", "Are there agency, lease, cleaning, key, or association fees?"]] },
      { type: "heading", level: 2, text: "Shortlist suburbs by lifestyle, not name recognition" },
      { type: "paragraph", text: "A famous suburb is not automatically the best fit. Compare distance to work or school, public transport access, road condition in rainy season, noise, security, water reliability, nearby shops, and how quickly rentals in that area are taken. A slightly less fashionable suburb with reliable services can be better value than a premium address with hidden costs." },
      { type: "heading", level: 2, text: "Ask these questions before travelling" },
      { type: "list", items: ["What is the exact suburb, street context, and nearest landmark?", "Is the property still available and when can someone move in?", "How many people are allowed to occupy the property?", "What is included in the rent and what is billed separately?", "Who handles repairs, and how quickly are urgent issues addressed?", "Can the landlord, agent, or caretaker show authority to rent the property?", "Are pets, visitors, parking, home businesses, or subletting allowed?", "Can recent photos or a short walkthrough video be shared before the viewing?"] },
      { type: "heading", level: 2, text: "Viewing checklist" },
      { type: "list", items: ["Test taps, lights, sockets, locks, geyser, stove points, and drainage.", "Look for damp, roof stains, cracked walls, exposed wiring, or broken windows.", "Check phone signal and internet options inside the property.", "Confirm where rubbish is collected and where cars are parked.", "Ask neighbours or the caretaker about water, security, and noise patterns.", "Photograph existing defects before moving in and attach them to the handover record."] },
      { type: "info", tone: "warning", title: "Avoid rushed payments", text: "Pause when someone demands money before a viewing, refuses to identify themselves, will not put terms in writing, or says many other people are ready to pay immediately. Urgency is common in property search, but pressure without proof is a warning sign." },
      { type: "cta", variant: "search", title: "Search current rentals", text: "Browse HouseLink listings with clearer property details and location-focused search." },
    ],
  },
  {
    title: "Tenant Safety Checklist Before Paying a Deposit",
    slug: "tenant-safety-checklist-before-paying-a-deposit",
    category: "Tenant Advice",
    tags: ["tenant safety", "deposit", "verification"],
    excerpt: "A renter's safety checklist for deposits, lease terms, identity checks, property handover, and payment proof.",
    focusKeyword: "tenant safety checklist",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Verify the person taking your money" },
      { type: "list", items: ["Ask for the landlord, agent, or caretaker's full name and phone number.", "Confirm the person has authority to receive money for that property.", "If an agent is involved, ask which agency they represent and confirm independently where possible.", "Be careful with a person who changes names, numbers, payment details, or meeting places during the process."] },
      { type: "heading", level: 2, text: "Verify the property itself" },
      { type: "list", items: ["View the actual property or send someone you trust.", "Compare the listing photos with the real rooms, gate, yard, and surroundings.", "Confirm the address, unit number, access route, and nearby landmarks.", "Ask whether anyone else is currently occupying the property and when vacant possession is expected."] },
      { type: "heading", level: 2, text: "Understand what the deposit covers" },
      { type: "paragraph", text: "A deposit should not be a mystery fee. Before paying, agree what it covers, when it can be deducted, how move-out inspection will work, and when the balance should be returned. The clearest approach is to record the property's condition at handover with photos and a signed list of existing defects." },
      { type: "table", headers: ["Lease item", "Why it matters"], rows: [["Rent and due date", "Prevents disputes about late payment and grace periods."], ["Deposit terms", "Clarifies refund rules and deductions."], ["Notice period", "Protects both sides when ending the tenancy."], ["Repairs", "Shows who handles plumbing, electrical, locks, appliances, and structural defects."], ["Utilities", "Avoids surprise bills after move-in."], ["House rules", "Covers pets, visitors, noise, parking, and shared areas."]] },
      { type: "info", tone: "warning", title: "Payment proof is part of your protection", text: "Avoid handing over cash without a signed receipt. Keep proof of transfer, screenshots, lease drafts, IDs shared with you, and all messages about the property." },
      { type: "cta", variant: "whatsapp" },
    ],
  },
  {
    title: "How Landlords Can Create Better Property Listings",
    slug: "how-landlords-can-create-better-property-listings",
    category: "Landlord Advice",
    tags: ["landlords", "listing quality", "property marketing"],
    excerpt: "A landlord's guide to listings that answer tenant questions, reduce wasted calls, and attract better-qualified enquiries.",
    focusKeyword: "better property listings",
    image: "/images/property-management-dusk.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Good listings reduce the wrong enquiries" },
      { type: "paragraph", text: "A thin listing attracts everyone and wastes time. A useful listing helps the right tenant decide quickly by answering price, location, condition, services, rules, and move-in questions before the first call." },
      { type: "heading", level: 2, text: "Photos tenants actually need" },
      { type: "list", items: ["Front view, gate, driveway, and parking.", "Kitchen, bathroom, bedrooms, lounge, storage, and outdoor space.", "Water setup, tank, borehole, solar equipment, prepaid meter, or geyser if relevant.", "Any shared spaces, staff quarters, cottage entrances, or access routes.", "Known limitations such as unfinished areas, steep driveways, shared yards, or low boundary walls."] },
      { type: "heading", level: 2, text: "Details to include in every rental advert" },
      { type: "table", headers: ["Detail", "Why it matters"], rows: [["Rent and deposit", "Helps tenants decide affordability before calling."], ["Bills and levies", "Avoids disputes and failed applications later."], ["Available date", "Reduces pressure from tenants who need immediate occupation."], ["Lease length", "Filters short-term requests when you need stability."], ["Rules", "Sets expectations on pets, visitors, parking, sharing, and home businesses."], ["Viewing process", "Tells serious tenants how to prepare and when they can view."]] },
      { type: "heading", level: 2, text: "How to describe location without exposing risk" },
      { type: "paragraph", text: "Give enough context for a serious tenant to understand the area, but avoid publishing sensitive details that make the property vulnerable. Use suburb, nearby roads, landmarks, school zones, transport routes, and commute notes. Share the exact house number only during a controlled viewing process." },
      { type: "info", tone: "info", title: "A better listing protects price", text: "When tenants can see value clearly, negotiation becomes more realistic. Missing photos and vague costs make people assume the worst and discount the rent before they even view." },
      { type: "cta", variant: "list-property", title: "List your property on HouseLink" },
    ],
  },
  {
    title: "Buying Property in Zimbabwe: Questions to Ask Before You Commit",
    slug: "buying-property-in-zimbabwe-questions-to-ask-before-you-commit",
    category: "Buying Property",
    tags: ["buying property", "buyers", "due diligence"],
    excerpt: "A buyer-focused due diligence guide for Zimbabwe covering title, cession, rates, boundaries, pricing, services, and offer terms.",
    focusKeyword: "buying property in Zimbabwe",
    image: "/images/kwekwe-flat.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Separate emotion from due diligence" },
      { type: "paragraph", text: "A good property can still become a bad purchase if ownership, boundaries, services, debt, or transfer steps are unclear. Before committing, slow the process down enough to verify the property and the seller, then compare the asking price against real alternatives." },
      { type: "heading", level: 2, text: "Documents to request early" },
      { type: "table", headers: ["Document or proof", "What it helps confirm"], rows: [["Title deed or cession papers", "The ownership route and whether transfer is possible."], ["Seller identity and authority", "The person selling can legally sign or represent the owner."], ["Rates and utility balances", "Outstanding council, water, levy, or service obligations."], ["Survey or stand information", "Stand size, boundaries, servitudes, and possible encroachments."], ["Approved plans where relevant", "Whether major structures match council approvals."], ["Written offer terms", "Price, deposit, timelines, conditions, and who pays which costs."]] },
      { type: "heading", level: 2, text: "Questions to ask at the viewing" },
      { type: "list", items: ["Why is the owner selling?", "How long has the property been on the market?", "Are there tenants, family members, caretakers, or informal occupiers on the property?", "Are there outstanding repairs, leaks, boundary disputes, or neighbour issues?", "What water, power, sewer, internet, and road access does the property rely on?", "Which fixtures, fittings, tanks, solar equipment, or appliances are included in the sale?"] },
      { type: "heading", level: 2, text: "Do not skip independent checks" },
      { type: "paragraph", text: "Use a registered conveyancer, trusted estate professional, or relevant authority check before paying large sums. This is especially important for inherited property, company-owned property, divorce-related sales, cession stands, development stands, and deals where the seller is overseas." },
      { type: "info", tone: "warning", title: "A cheap property can be expensive", text: "Discounts can be valid, but a price far below the area norm should trigger extra questions about title, access, debts, services, illegal structures, road reserves, wetlands, or disputes." },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "Preparing Your Property for Sale: A Seller's Guide",
    slug: "preparing-your-property-for-sale-a-sellers-guide",
    category: "Selling Property",
    tags: ["selling property", "sellers", "home preparation"],
    excerpt: "A seller's guide to pricing, presentation, documents, viewing readiness, buyer trust, and negotiation in Zimbabwe.",
    focusKeyword: "sell property in Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Price is a marketing decision" },
      { type: "paragraph", text: "The first asking price shapes buyer confidence. If the property launches too high, serious buyers may ignore it, agents may stop prioritising it, and later reductions can make the market wonder what is wrong. Start by comparing similar properties in the same area, condition, land size, services, and ownership status." },
      { type: "heading", level: 2, text: "Prepare the buyer confidence pack" },
      { type: "list", items: ["Ownership documents or proof of authority to sell.", "Rates, levy, and utility balance position.", "Approved plans or explanation of additions.", "Fixtures and fittings included in the sale.", "Known defects, repairs, and improvements.", "Viewing times and who can make decisions during negotiation."] },
      { type: "heading", level: 2, text: "Small improvements that change buyer perception" },
      { type: "table", headers: ["Area", "High-impact action"], rows: [["Entrance", "Fix gate movement, locks, door handles, bell, and visible cracks."], ["Kitchen", "Clean cupboards, repair taps, improve lighting, and remove clutter."], ["Bathrooms", "Deal with leaks, stains, silicone, mirrors, toilet seats, and ventilation."], ["Exterior", "Cut grass, clear rubble, improve drainage, and remove broken items."], ["Utilities", "Show water tank, solar, prepaid meter, and service records clearly."]] },
      { type: "heading", level: 2, text: "Make viewings easy for serious buyers" },
      { type: "paragraph", text: "Buyers often compare several properties in one day. A clean, accessible property with documents ready and honest answers will feel safer than a better-looking home where information is missing." },
      { type: "cta", variant: "list-property" },
    ],
  },
  {
    title: "Student Accommodation: What Parents and Students Should Check",
    slug: "student-accommodation-what-parents-and-students-should-check",
    category: "Renting in Zimbabwe",
    tags: ["student accommodation", "boarding houses", "parents"],
    excerpt: "A practical guide for parents and students comparing rooms, boarding houses, transport, rules, safety, study space, and total cost.",
    focusKeyword: "student accommodation Zimbabwe",
    image: "/images/gweru-room-courtyard.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Compare more than price" },
      { type: "paragraph", text: "The cheapest room can become expensive if transport is unreliable, water is inconsistent, the room is overcrowded, or the study environment is poor. Student accommodation should be judged by safety, routine, distance, house rules, service reliability, and who manages issues day to day." },
      { type: "heading", level: 2, text: "Parent and student checklist" },
      { type: "list", items: ["Distance to campus, transport routes, and late-class safety.", "Number of students per room, bed arrangement, storage, and privacy.", "Water, ZESA, WiFi, lighting, study desks, and charging points.", "Bathroom ratio, kitchen rules, laundry space, and cleaning responsibilities.", "Visitor rules, noise policy, curfew if any, and conflict resolution process.", "Who lives on site, who manages the house, and who responds to emergencies.", "Move-in cost, monthly cost, deposit refund process, and payment schedule."] },
      { type: "heading", level: 2, text: "Questions to ask before paying" },
      { type: "table", headers: ["Question", "Why it matters"], rows: [["Can I see the exact room?", "Prevents paying for a different bed or overcrowded setup."], ["What happens during power or water cuts?", "Shows whether the property can support study routines."], ["Who holds the deposit?", "Clarifies accountability at move-out."], ["Are meals included?", "Changes the real monthly budget."], ["How are disputes handled?", "Important in shared rooms and boarding houses."]] },
      { type: "info", tone: "info", title: "Parent confidence", text: "Ask for clear photos, rules, exact location context, manager details, emergency contacts, and a written record of payments before move-in." },
      { type: "button", label: "Explore student accommodation", url: "/student-accommodation" },
    ],
  },
  {
    title: "Moving House in Zimbabwe: A Practical Relocation Checklist",
    slug: "moving-house-in-zimbabwe-a-practical-relocation-checklist",
    category: "Moving and Relocation",
    tags: ["moving", "relocation", "checklist"],
    excerpt: "A practical Zimbabwe moving checklist covering packing, movers, timing, utilities, keys, handover photos, and first-night essentials.",
    focusKeyword: "moving house in Zimbabwe",
    image: "/images/roommates-hero.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Plan the move before the truck arrives" },
      { type: "paragraph", text: "Moving day goes better when the property, people, vehicle, and payments are organised before the first box is lifted. Confirm access times at both properties, whether a truck can enter the gate, where items will be loaded, and who has keys." },
      { type: "heading", level: 2, text: "Two weeks before moving" },
      { type: "list", items: ["Confirm move date, route, access times, and truck size.", "Ask the new landlord or seller about keys, remotes, gate codes, and handover process.", "Start sorting items into keep, donate, sell, and discard groups.", "Collect boxes, tape, labels, marker pens, bubble wrap, and bags.", "List fragile items, documents, electronics, gas cylinders, and valuables separately."] },
      { type: "heading", level: 2, text: "Moving day checks" },
      { type: "table", headers: ["Task", "Reason"], rows: [["Photograph meter readings", "Creates a record for ZESA, water, and handover discussions."], ["Inspect each room", "Helps identify damage before or after the move."], ["Keep documents with you", "IDs, lease, sale papers, receipts, and keys should not go in a random box."], ["Label by room", "Makes unloading faster and reduces lost items."], ["Confirm payment terms", "Avoids last-minute disputes with movers or helpers."]] },
      { type: "heading", level: 2, text: "First-night essentials" },
      { type: "list", items: ["Phone chargers, medication, toiletries, towels, bedding, and a change of clothes.", "Basic food, drinking water, kettle, mugs, plates, and a pot.", "Cleaning supplies, bin bags, toilet paper, torch, extension cord, and small toolkit.", "Copies of keys, gate remotes, emergency contacts, and proof of payment."] },
      { type: "info", tone: "info", title: "Coming soon", text: "HouseLink is planning moving resources and services that connect the property journey with relocation support." },
      { type: "cta", variant: "moving" },
    ],
  },
  {
    title: "Why Verification Matters in Property Search",
    slug: "why-verification-matters-in-property-search",
    category: "HouseLink News",
    tags: ["verification", "marketplace safety", "HouseLink"],
    excerpt: "How verification, reporting, better listing data, and user discipline reduce risk in online property search.",
    focusKeyword: "property verification Zimbabwe",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.NEWS_ANNOUNCEMENT,
    blocks: [
      { type: "heading", level: 2, text: "Property search needs trust and evidence" },
      { type: "paragraph", text: "Verification is not just a badge. It is a system for reducing uncertainty: clearer listings, accountable users, reporting workflows, better records, and more consistent checks before money changes hands." },
      { type: "heading", level: 2, text: "What verification can help with" },
      { type: "list", items: ["Reducing duplicate or suspicious listings.", "Encouraging landlords and agents to publish clearer property information.", "Making it easier for users to report risky behaviour.", "Helping serious property seekers compare listings with more confidence.", "Creating better marketplace habits around proof, photos, and written terms."] },
      { type: "heading", level: 2, text: "What users should still do" },
      { type: "list", items: ["View before paying where possible.", "Keep communication records.", "Check names, numbers, payment details, and property details.", "Ask for written terms before sending money.", "Report suspicious listings quickly so the marketplace can respond."] },
      { type: "info", tone: "warning", title: "Verification is not a substitute for due diligence", text: "Large payments, purchases, long leases, and complex property matters still need independent checks and proper documentation." },
      { type: "button", label: "Read safety guidance", url: "/safety" },
    ],
  },
  {
    title: "How to Spot Property Scams in Zimbabwe Before You Lose Money",
    slug: "how-to-spot-property-scams-in-zimbabwe-before-you-lose-money",
    category: "Property Law",
    tags: ["property scams", "verification", "buyer safety", "tenant safety"],
    excerpt: "Common property scam patterns in Zimbabwe and the practical checks renters and buyers should complete before paying.",
    focusKeyword: "property scams Zimbabwe",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Scams usually exploit speed, distance, and missing proof" },
      { type: "paragraph", text: "Most property scams do not begin with an obviously fake advert. They often look normal until the person demands quick payment, avoids a proper viewing, gives inconsistent details, or cannot prove authority over the property." },
      { type: "heading", level: 2, text: "Common red flags" },
      { type: "list", items: ["The rent or sale price is far below comparable properties in the same area.", "The contact person refuses a viewing or keeps postponing it.", "You are told to pay a holding fee immediately because many people are interested.", "Photos look copied, cropped, blurry, or inconsistent with the suburb.", "Names on messages, payment details, documents, and receipts do not match.", "The seller or landlord is always unavailable and uses a middle person with vague authority.", "The property is occupied, but the occupant seems unaware of the transaction."] },
      { type: "heading", level: 2, text: "Checks before paying rent or a deposit" },
      { type: "table", headers: ["Check", "What to look for"], rows: [["Viewing", "See the actual property or use a trusted person."], ["Authority", "Confirm the landlord, agent, caretaker, or mandate."], ["Written terms", "Rent, deposit, refund rules, move-in date, and bills."], ["Payment trail", "Named recipient, receipt, and proof of transfer."], ["Handover", "Keys, inspection photos, defects, and meter readings."]] },
      { type: "heading", level: 2, text: "Checks before buying" },
      { type: "paragraph", text: "For purchases, do not rely only on screenshots or promises. Ask for ownership documents, seller identity, rates and utility position, authority to sell, and independent conveyancing support before making major payments." },
      { type: "info", tone: "warning", title: "When in doubt, slow down", text: "A real opportunity should survive reasonable verification. If the person disappears when you ask for proof, that is useful information." },
      { type: "button", label: "Report a suspicious listing", url: "/report-listing" },
    ],
  },
  {
    title: "Title Deeds, Cession and Agreements of Sale: What Zimbabwe Buyers Should Understand",
    slug: "title-deeds-cession-and-agreements-of-sale-what-zimbabwe-buyers-should-understand",
    category: "Property Law",
    tags: ["title deeds", "cession", "agreement of sale", "conveyancing"],
    excerpt: "A plain-English guide to key property documents buyers encounter in Zimbabwe and why each one needs proper verification.",
    focusKeyword: "title deeds Zimbabwe",
    image: "/images/kwekwe-flat.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Different documents carry different risk" },
      { type: "paragraph", text: "Buyers often hear title deed, cession, offer letter, agreement of sale, and transfer used as if they mean the same thing. They do not. Each document sits at a different stage of ownership or occupation, so the verification process should match the property type and seller's legal position." },
      { type: "table", headers: ["Term", "Plain meaning"], rows: [["Title deed", "A formal ownership record for registered property."], ["Cession", "A transfer route often used where rights are held through a council, developer, or authority before title."], ["Agreement of sale", "The contract setting out price, parties, property, conditions, and timelines."], ["Power of attorney", "Authority for someone to act for an owner, often important when the owner is away."], ["Rates clearance", "Evidence needed in many transactions to show municipal obligations have been dealt with."]] },
      { type: "heading", level: 2, text: "Questions buyers should ask" },
      { type: "list", items: ["Who is the registered owner or rights holder?", "Is the seller the owner, an heir, a company representative, an agent, or a proxy?", "Are there bonds, caveats, disputes, deceased estate issues, or family objections?", "Are rates, levies, water, ZESA, or association charges outstanding?", "Which conveyancer or authority will process transfer or cession?", "What conditions must be met before the balance is paid?"] },
      { type: "info", tone: "warning", title: "Use professional help", text: "This guide is educational, not legal advice. Property transactions should be reviewed by a qualified conveyancer or legal practitioner before major payments are made." },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "Property Development in Zimbabwe: What to Check Before You Buy Land",
    slug: "property-development-in-zimbabwe-what-to-check-before-you-buy-land",
    category: "Property Development",
    tags: ["property development", "land due diligence", "zoning", "council approvals"],
    excerpt: "A practical Zimbabwe-focused guide to land due diligence, zoning, infrastructure, project readiness, and council approval checks before starting a development.",
    focusKeyword: "property development in Zimbabwe",
    image: "/images/blog/property-development-zimbabwe-cover.png",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "paragraph", text: "The most expensive development mistakes usually happen before construction starts. A stand may look perfect on viewing day, but the real question is whether the land, planning controls, infrastructure, title position, budget, and professional team all support the project you want to build." },
      { type: "paragraph", text: "HouseLink's Property Development and Property Law in Zimbabwe manual treats development as a disciplined process: verify the land first, confirm the rules, understand the site, then prepare the design and approvals. This article turns that approach into a practical pre-purchase checklist." },
      { type: "heading", level: 2, text: "Start with the intended use" },
      { type: "paragraph", text: "Before paying for land, define the development vision in plain language. Are you planning cluster housing, student accommodation, a warehouse, a commercial conversion, a subdivision, or a long-term land bank? The intended use determines which zoning, infrastructure, approvals, consultants, timelines, and risks matter most." },
      { type: "table", headers: ["Question", "Why it matters"], rows: [["What do you want to build?", "The use must match planning controls and local authority requirements."], ["Who will occupy or buy it?", "Target users influence density, parking, access, services, and pricing."], ["What infrastructure is needed?", "Roads, water, sewer, drainage, and power can change project cost quickly."], ["Which professionals are required?", "Town planners, architects, engineers, surveyors, quantity surveyors, and lawyers may be needed before design is final."]] },
      { type: "heading", level: 2, text: "Verify ownership and land tenure" },
      { type: "paragraph", text: "Do not rely only on a copy of a title document or a seller's assurance. Confirm ownership, registered conditions, encumbrances, servitudes, court orders, leases, subdivision approvals, and other rights through the appropriate official records and professional advisers." },
      { type: "info", tone: "warning", title: "Development risk", text: "A land deal can fail even when the price is attractive if the buyer cannot verify ownership, transfer route, land tenure, or restrictions that affect the proposed development." },
      { type: "heading", level: 2, text: "Check zoning before purchase" },
      { type: "paragraph", text: "Zoning and land-use planning decide what may be built, where, and under what conditions. A residential stand may not permit a warehouse. Agricultural land may carry development controls. A commercial property may need parking, access, environmental, or change-of-use approvals before the intended business can operate." },
      { type: "list", items: ["Confirm existing zoning with the relevant local authority.", "Check permitted land uses and whether special consent is required.", "Ask about building lines, height restrictions, density controls, parking, access, and road reservations.", "Confirm whether servitudes, future road plans, drainage channels, or environmental concerns affect the site.", "Get written or professionally verified guidance before committing major funds."] },
      { type: "heading", level: 2, text: "Investigate the physical site" },
      { type: "paragraph", text: "A proper site investigation looks beyond location and size. It checks boundaries, topography, drainage, neighbouring uses, road access, water, sewer, electricity, environmental constraints, and visible conditions that may affect design or cost." },
      { type: "table", headers: ["Investigation", "Purpose"], rows: [["Site inspection", "Understand the physical characteristics of the property."], ["Boundary verification", "Confirm property limits using survey information where required."], ["Infrastructure assessment", "Check availability and capacity of roads, water, sewer, drainage, and electricity."], ["Neighbourhood assessment", "Understand surrounding land uses, future trends, access, and market fit."]] },
      { type: "heading", level: 2, text: "Prepare before detailed design" },
      { type: "paragraph", text: "Good developers do not rush straight into drawings. First they verify planning requirements, appoint the right professional team, conduct feasibility checks, estimate costs, prepare a realistic programme, and confirm the approval route. Early preparation is often faster than repeated redesign after council comments." },
      { type: "list", ordered: true, items: ["Define the development vision.", "Conduct legal, planning, market, and financial due diligence.", "Inspect the site and verify constraints.", "Confirm planning requirements with the local authority.", "Appoint the professional team.", "Build a preliminary project budget and programme."] },
      { type: "button", label: "Get the full Property Development and Property Law guide", url: PROPERTY_DEVELOPMENT_LAW_BOOK_URL },
      { type: "paragraph", text: "This article is a starting point. The full HouseLink guide goes deeper into planning, land tenure, zoning, council processes, approvals, documentation, development mistakes, and professional responsibilities for Zimbabwe property projects." },
    ],
  },
  {
    title: "Property Law in Zimbabwe: Legal Checks Before You Commit to a Deal",
    slug: "property-law-in-zimbabwe-legal-checks-before-you-commit",
    category: "Property Law",
    tags: ["property law", "title deeds", "contracts", "compliance", "property due diligence"],
    excerpt: "A practical guide to ownership verification, contracts, documentation, compliance, ethics, and professional advice before buying, selling, or developing property.",
    focusKeyword: "property law in Zimbabwe",
    image: "/images/blog/property-law-zimbabwe-cover.png",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "paragraph", text: "Property law is not only a lawyer's concern. Anyone buying, selling, leasing, managing, or developing property needs enough legal awareness to ask the right questions, keep proper records, and know when specialist advice is required." },
      { type: "paragraph", text: "HouseLink's Property Development and Property Law in Zimbabwe manual frames legal competence as part of professional practice: compliance, ethical conduct, accountability, proper documentation, and respect for current laws and local authority requirements." },
      { type: "info", tone: "warning", title: "Not legal advice", text: "Property-related laws, regulations, by-laws, and professional requirements can change. Always consult current legislation, the relevant authority, and qualified legal professionals before relying on any transaction or development decision." },
      { type: "heading", level: 2, text: "Verify ownership before trusting the deal" },
      { type: "paragraph", text: "Ownership verification sits at the centre of property due diligence. Buyers and developers should confirm title, tenure, registered conditions, encumbrances, subdivision status, leases, court orders, and other rights through official records and professional advisers where appropriate." },
      { type: "list", items: ["Request the relevant ownership or tenure documents.", "Confirm the seller or representative has authority to transact.", "Check whether the property has restrictions, servitudes, disputes, or registered conditions.", "Understand whether transfer, cession, lease assignment, or another legal route applies.", "Use a qualified conveyancer or legal practitioner where legal interpretation is needed."] },
      { type: "heading", level: 2, text: "Understand the purpose of each document" },
      { type: "paragraph", text: "Real estate transactions create legal and financial obligations. Offers, sale agreements, lease agreements, listing agreements, mandates, receipts, handover records, payment proof, council correspondence, approval letters, and professional reports should be complete, accurate, and safely stored." },
      { type: "table", headers: ["Document area", "Risk if ignored"], rows: [["Names and identity details", "Wrong parties can delay or undermine the transaction."], ["Property description and address", "Ambiguity can create disputes about what is being bought, sold, leased, or developed."], ["Price, deposits, dates, and conditions", "Unclear obligations can cause payment, timing, and performance disputes."], ["Approvals and authority records", "A transaction or project can stall if required approvals are missing."]] },
      { type: "heading", level: 2, text: "Contracts are not casual forms" },
      { type: "paragraph", text: "A contract is a binding agreement. Agents and property professionals should understand the purpose of the documents they handle, but they should not give legal opinions beyond their competence. When a client needs legal interpretation, refer them to a qualified professional." },
      { type: "info", tone: "info", title: "Professional habit", text: "If it affects ownership, payment, occupation, development rights, cancellation, penalties, transfer, or approvals, it should be documented clearly and reviewed carefully before signature." },
      { type: "heading", level: 2, text: "Ethics protects the transaction" },
      { type: "paragraph", text: "Legal awareness works together with ethics. Honest disclosure, transparency, confidentiality, fair dealing, accountability, and professional competence build trust with clients, investors, financial institutions, local authorities, and other professionals." },
      { type: "list", items: ["Do not hide known defects, disputes, or approval gaps.", "Do not pressure a client to sign documents they do not understand.", "Keep client information confidential.", "Avoid promises about approvals, transfer dates, or legal outcomes that you cannot control.", "Keep complete records of instructions, offers, payments, and communications."] },
      { type: "heading", level: 2, text: "A simple pre-commitment checklist" },
      { type: "list", ordered: true, items: ["Confirm who owns or controls the property.", "Confirm what rights are being sold, leased, transferred, or developed.", "Confirm what restrictions or approvals affect the intended use.", "Confirm the written terms, deadlines, deposits, and conditions.", "Confirm which professionals must review the transaction before money changes hands."] },
      { type: "button", label: "Read the full Property Development and Property Law guide", url: PROPERTY_DEVELOPMENT_LAW_BOOK_URL },
      { type: "paragraph", text: "The full HouseLink guide expands these legal checks into practical chapters on ownership, tenure, zoning, local authorities, documentation, ethics, approvals, and professional responsibilities in Zimbabwe property work." },
    ],
  },
  {
    title: "What Happens if You Buy a Property With Outstanding Rates or Utility Bills?",
    slug: "what-happens-if-you-buy-a-property-with-outstanding-rates-or-utility-bills",
    category: "Buying Property",
    tags: ["rates", "utility bills", "buyer due diligence", "property transfer"],
    excerpt: "How unpaid council rates, water, levies, and service bills can affect a purchase, and what buyers should confirm before transfer.",
    focusKeyword: "outstanding rates property Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "The purchase price is not the only number" },
      { type: "paragraph", text: "A property can look affordable until unpaid rates, water, levies, penalties, association fees, or service reconnection costs appear. Buyers should understand who is responsible for clearing arrears and when proof must be provided." },
      { type: "heading", level: 2, text: "Ask for balances before signing" },
      { type: "list", items: ["Council rates and water statement.", "ZESA meter status and any debt attached to the account or meter.", "Body corporate or residents association levies.", "Security, borehole, refuse, or shared-service contributions.", "Any penalties, reconnection fees, or historic disputes."] },
      { type: "heading", level: 2, text: "Put responsibility in writing" },
      { type: "paragraph", text: "The agreement of sale should state which party pays arrears, transfer costs, agent fees, rates clearance costs, and occupation-related bills. It should also state what happens if hidden debts are discovered before completion." },
      { type: "table", headers: ["Risk", "Practical protection"], rows: [["Old arrears", "Request current statements and written allocation of responsibility."], ["Occupation before transfer", "Agree rent, utilities, maintenance, and risk during occupation."], ["Disconnected services", "Confirm reconnection steps and costs."], ["Shared levies", "Ask the association or body corporate for written status where applicable."]] },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "How to Price a Property for Sale in Zimbabwe Without Chasing the Market Down",
    slug: "how-to-price-a-property-for-sale-in-zimbabwe-without-chasing-the-market-down",
    category: "Selling Property",
    tags: ["pricing", "selling property", "valuation", "market data"],
    excerpt: "A seller's pricing framework using comparable listings, buyer behaviour, condition, services, and days on market.",
    focusKeyword: "price property for sale Zimbabwe",
    image: "/images/property-management-dusk.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "The market decides in comparison" },
      { type: "paragraph", text: "Buyers rarely judge one house in isolation. They compare price, suburb, land size, bedrooms, finishes, services, road access, security, and ownership confidence. Your asking price must survive that comparison." },
      { type: "heading", level: 2, text: "Build a pricing range" },
      { type: "list", items: ["Find at least five comparable properties in the same suburb or nearby suburbs.", "Separate asking prices from actual sale evidence where available.", "Adjust for land size, condition, title status, water, solar, security, and road quality.", "Identify the top price, realistic price, and quick-sale price.", "Decide your negotiation room before the first buyer calls."] },
      { type: "heading", level: 2, text: "Signals that the price is too high" },
      { type: "table", headers: ["Signal", "What it may mean"], rows: [["Many views, few enquiries", "The photos attract attention but the price blocks action."], ["Many enquiries, no viewings", "Buyers may find cheaper alternatives after asking details."], ["Viewings, no offers", "Condition, documents, or price may not match expectations."], ["Only low offers", "The market may be pricing risk or repairs into the property."]] },
      { type: "info", tone: "info", title: "The first few weeks matter", text: "Fresh listings get the most attention. Launching with a credible price can create urgency; launching too high can make the property look stale later." },
      { type: "cta", variant: "list-property" },
    ],
  },
  {
    title: "Diaspora Buyer Checklist for Buying Property in Zimbabwe",
    slug: "diaspora-buyer-checklist-for-buying-property-in-zimbabwe",
    category: "Property Investment",
    tags: ["diaspora", "buying property", "verification", "investment"],
    excerpt: "A diaspora-focused checklist for representatives, payments, documents, inspections, transfer timelines, and remote decision-making.",
    focusKeyword: "diaspora buying property Zimbabwe",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Distance increases the need for process" },
      { type: "paragraph", text: "Diaspora buyers often move faster because flights, exchange rates, family pressure, or limited leave create urgency. That makes process more important, not less. The safest remote purchase has named representatives, written authority, independent checks, and a clear payment trail." },
      { type: "heading", level: 2, text: "Before sending money" },
      { type: "list", items: ["Choose one trusted representative and define what they can and cannot approve.", "Use an independent conveyancer or legal practitioner, not only the seller's contact.", "Request a live video viewing and an in-person inspection by someone on your side.", "Verify ownership, seller authority, rates, utilities, boundaries, and occupation status.", "Agree how payments will be made, receipted, held, and released.", "Put all timelines, conditions, defects, inclusions, and penalties in writing."] },
      { type: "heading", level: 2, text: "Remote viewing questions" },
      { type: "table", headers: ["Area", "Ask your representative to show"], rows: [["Street context", "Road, neighbours, drainage, traffic, boundary, and access."], ["Services", "Water source, tanks, meter, solar, geyser, sewer or septic setup."], ["Condition", "Roof, cracks, damp, plumbing, wiring, floors, cupboards, and windows."], ["Occupation", "Who is inside the property and when vacant possession will happen."], ["Documents", "Names on documents compared with seller identity and authority."]] },
      { type: "info", tone: "warning", title: "Do not let family pressure replace verification", text: "A relative can help inspect, but professional transfer and document checks still matter." },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "How to Evaluate Rental Yield Before Buying an Investment Property",
    slug: "how-to-evaluate-rental-yield-before-buying-an-investment-property",
    category: "Property Investment",
    tags: ["rental yield", "property investment", "landlord returns"],
    excerpt: "A simple framework for estimating gross yield, net yield, vacancy risk, maintenance, and tenant demand before buying.",
    focusKeyword: "rental yield Zimbabwe",
    image: "/images/kwekwe-flat.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Rental yield is more than rent divided by price" },
      { type: "paragraph", text: "Gross yield is useful, but it can hide repairs, vacancies, unpaid bills, agent fees, levies, compliance costs, and weak tenant demand. Investors should calculate both best-case and realistic-case returns before buying." },
      { type: "heading", level: 2, text: "Basic yield formula" },
      { type: "table", headers: ["Measure", "Formula"], rows: [["Gross annual rent", "Monthly rent x 12"], ["Gross yield", "Gross annual rent / purchase price x 100"], ["Net annual rent", "Gross annual rent minus vacancy, repairs, levies, agent fees, rates, insurance, and management costs"], ["Net yield", "Net annual rent / total acquisition cost x 100"]] },
      { type: "heading", level: 2, text: "Demand questions before investing" },
      { type: "list", items: ["Who is the likely tenant: family, student, professional, company, tourist, or small business?", "How many similar rentals are available nearby?", "What services matter most in that area: water, solar, security, transport, parking, internet, or schools?", "How long do similar properties stay vacant?", "What upgrades would increase rent without overspending?"] },
      { type: "info", tone: "info", title: "Capital growth and cash flow are different", text: "A property can appreciate over time but produce weak monthly cash flow. Know which outcome you are buying for." },
      { type: "cta", variant: "rent" },
    ],
  },
  {
    title: "Renting in Zimbabwe: The True Costs Beyond Monthly Rent",
    slug: "renting-in-zimbabwe-the-true-costs-beyond-monthly-rent",
    category: "Tenant Advice",
    tags: ["renting", "move-in costs", "tenant budget"],
    excerpt: "A tenant budget guide covering deposits, utilities, transport, WiFi, moving costs, repairs, and shared-service charges.",
    focusKeyword: "renting costs Zimbabwe",
    image: "/images/roommates-hero.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "The cheapest rent is not always the cheapest home" },
      { type: "paragraph", text: "Monthly rent is only one part of affordability. A tenant should compare the full cost of living in that property, including services, commuting, upfront payments, and the cost of making the home functional." },
      { type: "table", headers: ["Cost", "Questions to ask"], rows: [["Deposit", "How much, refundable when, and under what deductions?"], ["Utilities", "ZESA, water, refuse, internet, security, and levies included or separate?"], ["Transport", "Daily commuting cost and reliability at your working hours?"], ["Moving", "Truck, helpers, packing materials, cleaning, and key replacement?"], ["Setup", "Curtains, gas, bulbs, locks, WiFi installation, minor repairs, or appliances?"], ["Shared services", "Borehole, generator, guard, gardener, or caretaker contribution?"]] },
      { type: "heading", level: 2, text: "Move-in affordability rule" },
      { type: "paragraph", text: "Before agreeing, calculate the cash needed in the first month and the monthly amount after moving in. If the first month drains all savings, even a good property can become stressful when an emergency bill appears." },
      { type: "info", tone: "warning", title: "Do not ignore commute cost", text: "A cheaper rental far from work, school, or transport can cost more than a slightly higher rent in a better-connected area." },
      { type: "cta", variant: "rent" },
    ],
  },
  {
    title: "What Landlords Should Check Before Accepting a Tenant",
    slug: "what-landlords-should-check-before-accepting-a-tenant",
    category: "Landlord Advice",
    tags: ["tenant screening", "landlords", "rental management"],
    excerpt: "A practical tenant-screening guide for landlords: affordability, references, identity, expectations, lease terms, and handover records.",
    focusKeyword: "tenant screening Zimbabwe",
    image: "/images/property-management-dusk.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Good screening protects the relationship" },
      { type: "paragraph", text: "Tenant screening should not be about suspicion. It is about matching the property, rent, rules, and tenant expectations before both sides are locked into a stressful arrangement." },
      { type: "heading", level: 2, text: "What to check" },
      { type: "list", items: ["Identity and contact details.", "Employment, income source, or reliable payment support.", "Previous landlord reference where available.", "Number of occupants and intended use of the property.", "Pets, vehicles, home business, visitors, and special requirements.", "Ability to pay deposit, first rent, utilities, and recurring charges.", "Understanding of house rules, repairs process, and notice period."] },
      { type: "heading", level: 2, text: "Handover records matter" },
      { type: "table", headers: ["Record", "Why it matters"], rows: [["Signed lease", "Clarifies rent, deposit, rules, repairs, and notice."], ["Inspection photos", "Reduces disputes over damage."], ["Meter readings", "Separates old and new utility use."], ["Key list", "Tracks remotes, keys, tags, and locks."], ["Emergency contacts", "Helps during urgent repairs or incidents."]] },
      { type: "cta", variant: "list-property" },
    ],
  },
  {
    title: "Water, Solar and Security: The New Checklist for Zimbabwe Homes",
    slug: "water-solar-and-security-the-new-checklist-for-zimbabwe-homes",
    category: "Property Investment",
    tags: ["solar", "water", "security", "property value"],
    excerpt: "How water reliability, backup power, and practical security affect rentability, resale value, and day-to-day liveability.",
    focusKeyword: "solar water security property Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Buyers and tenants now price resilience" },
      { type: "paragraph", text: "A beautiful home can lose appeal if water, power, and security are unreliable. In many Zimbabwean suburbs, practical resilience is no longer a luxury feature; it shapes rent, resale value, viewing interest, and buyer confidence." },
      { type: "heading", level: 2, text: "What to inspect" },
      { type: "table", headers: ["Feature", "Questions to ask"], rows: [["Water", "Municipal schedule, borehole yield, tank capacity, pump condition, pressure, and plumbing."], ["Power", "Prepaid meter, solar capacity, inverter, batteries, wiring quality, and load supported."], ["Security", "Boundary wall, gate, locks, lighting, burglar bars, alarm, guard access, and neighbourhood watch."], ["Maintenance", "Service records, replacement age, known faults, and who can repair the system."]] },
      { type: "heading", level: 2, text: "Do not overpay for equipment you do not understand" },
      { type: "paragraph", text: "Solar panels, tanks, pumps, and security systems add value only when they work, are included in the sale or lease, and are sized for the property's actual needs. Ask what stays, what is leased, and what maintenance is due." },
      { type: "cta", variant: "search" },
    ],
  },
  {
    title: "Can a Landlord Increase Rent at Any Time in Zimbabwe?",
    slug: "can-a-landlord-increase-rent-at-any-time-in-zimbabwe",
    category: "Tenant Advice",
    tags: ["rent increase", "lease agreement", "tenant rights", "landlord advice"],
    excerpt: "A practical guide to rent increases, notice, written agreements, affordability, negotiation, and record keeping for tenants and landlords.",
    focusKeyword: "landlord increase rent Zimbabwe",
    image: "/images/property-management-dusk.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Start with the lease, not the argument" },
      { type: "paragraph", text: "Rent increases should be handled through the lease agreement, written communication, and a clear explanation of timing. Tenants should check the rent review clause, notice period, payment currency, included services, and whether the increase matches the property condition and market alternatives." },
      { type: "table", headers: ["Point to check", "Why it matters"], rows: [["Lease review clause", "Shows when rent can be reviewed and how notice should be given."], ["Notice period", "Gives the tenant time to accept, negotiate, or move."], ["Included services", "Water, levies, security, and maintenance can affect whether an increase is reasonable."], ["Comparable rentals", "Both sides need market evidence, not only opinion."]] },
      { type: "heading", level: 2, text: "How tenants can respond" },
      { type: "list", items: ["Ask for the increase in writing.", "Compare similar rentals nearby before reacting.", "Request reasons if services or repairs have not improved.", "Negotiate a phased increase, longer lease, or repairs as part of the discussion.", "Keep payment records and messages in one place."] },
      { type: "info", tone: "warning", title: "Get advice for disputes", text: "This is general guidance. If a rent increase becomes a legal dispute or eviction threat, speak to a qualified legal practitioner or relevant housing authority." },
      { type: "download", label: "Download rent review checklist", url: "/downloads/blog/rent-review-checklist.pdf" },
      { type: "cta", variant: "rent" },
    ],
  },
  {
    title: "What Should Be in a Proper Lease Agreement in Zimbabwe?",
    slug: "what-should-be-in-a-proper-lease-agreement-in-zimbabwe",
    category: "Property Law",
    tags: ["lease agreement", "renting", "landlord advice", "tenant safety"],
    excerpt: "A plain checklist of lease clauses covering rent, deposit, notice, repairs, rules, utilities, inspections, and dispute handling.",
    focusKeyword: "lease agreement Zimbabwe",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "A lease should prevent confusion before it starts" },
      { type: "paragraph", text: "A good lease is not only a formality. It is the working manual for the rental relationship. It should explain who pays what, who repairs what, how notice works, and what happens when either side breaks the agreement." },
      { type: "heading", level: 2, text: "Core clauses to include" },
      { type: "list", items: ["Full names and contact details of landlord, tenant, agent, or caretaker.", "Property address, rooms included, parking, storage, garden, cottage, or shared areas.", "Rent amount, currency, due date, payment method, and late-payment process.", "Deposit amount, purpose, deductions, inspection method, and refund timing.", "Lease start date, end date, renewal terms, and notice period.", "Utilities, levies, rates, refuse, security, gardener, WiFi, and shared-service responsibilities.", "Repairs and maintenance: urgent, minor, tenant-caused, and structural.", "House rules for pets, visitors, noise, subletting, business use, and alterations.", "Inspection schedule, access notice, handover photos, keys, and meter readings.", "Dispute process, breach notice, termination, and signature dates."] },
      { type: "download", label: "Download lease clause checklist", url: "/downloads/blog/lease-clause-checklist.pdf" },
      { type: "cta", variant: "whatsapp" },
    ],
  },
  {
    title: "What to Do if a Tenant Refuses to Move Out in Zimbabwe",
    slug: "what-to-do-if-a-tenant-refuses-to-move-out-in-zimbabwe",
    category: "Landlord Advice",
    tags: ["eviction", "tenant disputes", "landlord advice", "lease agreement"],
    excerpt: "A landlord-focused guide to documentation, notices, negotiation, legal process, and avoiding unlawful self-help.",
    focusKeyword: "tenant refuses to move out Zimbabwe",
    image: "/images/property-management-dusk.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Do not make the problem worse" },
      { type: "paragraph", text: "When a tenant refuses to vacate, the instinct may be to change locks, remove doors, disconnect services, or move belongings. Those steps can create legal and reputational risk. Start with the lease, payment record, written notices, and professional advice." },
      { type: "heading", level: 2, text: "Practical steps" },
      { type: "list", items: ["Review the lease, expiry date, notice terms, arrears, and breach clauses.", "Put all communication in writing and keep delivery proof.", "Offer a realistic payment plan or exit date only if it protects your position.", "Document property condition, unpaid rent, utility balances, and failed promises.", "Use a qualified legal practitioner or relevant process before attempting eviction.", "Avoid threats, public shaming, unlawful lockouts, or service disconnections."] },
      { type: "table", headers: ["Record", "Why it matters"], rows: [["Lease", "Shows agreed terms and notice rules."], ["Payment ledger", "Shows arrears or compliance."], ["Messages and letters", "Shows attempts to resolve the matter."], ["Inspection photos", "Helps with damage or deposit disputes."]] },
      { type: "info", tone: "warning", title: "Eviction is a legal process", text: "This article is general information. Get proper legal advice before taking steps that affect someone's occupation of a home." },
      { type: "cta", variant: "list-property" },
    ],
  },
  {
    title: "How to Verify an Estate Agent Before Working With Them",
    slug: "how-to-verify-an-estate-agent-before-working-with-them",
    category: "Property Law",
    tags: ["estate agents", "verification", "property scams", "buyer safety"],
    excerpt: "How buyers, sellers, landlords, and tenants can check an agent's identity, mandate, agency details, and payment instructions.",
    focusKeyword: "verify estate agent Zimbabwe",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Verify before you trust the introduction" },
      { type: "paragraph", text: "A professional agent should make verification easy. Before sharing documents or money, confirm who the agent works for, what property they are authorised to market, and where payments should legally go." },
      { type: "heading", level: 2, text: "Checks to complete" },
      { type: "list", items: ["Ask for the agent's full name, agency name, office address, phone number, and email.", "Contact the agency through a number you find independently, not only the number sent by the agent.", "Ask for the mandate or confirmation that the agent is authorised to market the property.", "Compare the property details across the listing, agency, owner, and viewing.", "Be careful if payment instructions go to a personal account without explanation.", "Keep written records of viewings, offers, deposits, commissions, and receipts."] },
      { type: "info", tone: "warning", title: "Scammers borrow real names", text: "Someone can claim to work for a known agency. Verify through independent contact details before trusting documents, payment requests, or urgent instructions." },
      { type: "button", label: "Report a suspicious listing", url: "/report-listing" },
    ],
  },
  {
    title: "Title Deed vs Cession: Which Is Safer for Zimbabwe Property Buyers?",
    slug: "title-deed-vs-cession-which-is-safer-for-zimbabwe-property-buyers",
    category: "Property Law",
    tags: ["title deeds", "cession", "buyer due diligence", "property law"],
    excerpt: "A buyer-friendly comparison of title deed and cession properties, with risks, checks, and questions to ask before paying.",
    focusKeyword: "title deed vs cession Zimbabwe",
    image: "/images/kwekwe-flat.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Safer depends on proof and process" },
      { type: "paragraph", text: "Many buyers prefer title deeds because registered ownership is clearer. Cession properties can still be legitimate, but they require careful checks with the council, developer, cooperative, or authority that controls the rights being transferred." },
      { type: "table", headers: ["Issue", "Title deed", "Cession"], rows: [["Ownership evidence", "Registered deed should be verified through proper channels.", "Rights holder and transfer authority must be confirmed."], ["Transfer route", "Usually handled through conveyancing transfer.", "Handled through the relevant authority's cession process."], ["Risk focus", "Fraud, caveats, bonds, estate issues, rates, and seller authority.", "Double allocation, unpaid development costs, unclear authority, and incomplete servicing."], ["Buyer action", "Use a conveyancer and verify the deed and seller.", "Verify the authority, allocation, payments, and transfer requirements."]] },
      { type: "heading", level: 2, text: "Questions before buying cession property" },
      { type: "list", items: ["Who allocated the stand or rights?", "Can the authority confirm the seller as the current rights holder?", "Are development fees, servicing costs, rates, or penalties outstanding?", "Is the stand serviced with roads, water, sewer, and electricity?", "When and how can title eventually be obtained, if applicable?"] },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "Buying a Deceased Estate Property in Zimbabwe: What to Check",
    slug: "buying-a-deceased-estate-property-in-zimbabwe-what-to-check",
    category: "Buying Property",
    tags: ["deceased estate", "inheritance", "buyer due diligence", "property law"],
    excerpt: "A practical guide to authority, heirs, estate administration, occupation, transfer risk, and payment timing for estate sales.",
    focusKeyword: "deceased estate property Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "The seller must have authority" },
      { type: "paragraph", text: "When the owner has died, the person showing the property may not automatically have authority to sell it. Buyers should confirm the estate process, who is authorised to sign, whether beneficiaries agree, and whether any occupant or heir disputes the sale." },
      { type: "heading", level: 2, text: "Buyer checklist" },
      { type: "list", items: ["Confirm the deceased owner and property details.", "Ask who is legally authorised to represent the estate.", "Check whether heirs, surviving spouse, or beneficiaries have objections.", "Confirm rates, utilities, debts, and occupation status.", "Use a conveyancer or legal practitioner before paying a deposit.", "Make the sale conditional on proper estate and transfer steps."] },
      { type: "info", tone: "warning", title: "Family agreement is not enough", text: "A family member saying everyone agrees is not the same as legal authority to sell. Verify the estate process before committing." },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "Can Siblings Force the Sale of an Inherited Property?",
    slug: "can-siblings-force-the-sale-of-an-inherited-property-in-zimbabwe",
    category: "Property Law",
    tags: ["inheritance", "family property", "property disputes"],
    excerpt: "A practical explainer for families dealing with inherited homes, co-ownership, occupation, buyouts, and disputes.",
    focusKeyword: "siblings force sale inherited property Zimbabwe",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Inherited property needs a decision structure" },
      { type: "paragraph", text: "Family property disputes often happen because one person lives in the house, another wants rent, another wants to sell, and nobody has documented a decision. The first step is to understand ownership, estate status, and whether the property is jointly held or still under administration." },
      { type: "heading", level: 2, text: "Options families usually compare" },
      { type: "table", headers: ["Option", "When it may work"], rows: [["Sell and distribute", "Useful when no one can buy out the others or maintain the property."], ["One sibling buys out others", "Works when valuation, payment timing, and transfer can be agreed."], ["Rent out the property", "Can preserve the asset while sharing income, if management is clear."], ["Occupant pays compensation", "May help when one heir lives there and others need fairness."]] },
      { type: "info", tone: "warning", title: "Get legal advice early", text: "Inherited property can involve estate law, marriage rights, minor children, debts, and family agreements. Do not rely only on verbal promises." },
      { type: "cta", variant: "whatsapp" },
    ],
  },
  {
    title: "Buying a Residential Stand in Zimbabwe: Risks Before You Build",
    slug: "buying-a-residential-stand-in-zimbabwe-risks-before-you-build",
    category: "Property Development",
    tags: ["stands", "land", "development", "buyer due diligence"],
    excerpt: "What stand buyers should check before paying: allocation, servicing, roads, sewer, water, zoning, wetlands, and building approvals.",
    focusKeyword: "buying stands Zimbabwe",
    image: "/images/kwekwe-flat.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "A stand is a project, not just land" },
      { type: "paragraph", text: "The price of a stand is only one part of the decision. Buyers should understand whether the land is properly allocated, serviced, buildable, accessible, and eligible for approvals before they plan foundations or order bricks." },
      { type: "list", items: ["Confirm seller authority and allocation records.", "Check roads, drainage, water, sewer or septic options, and electricity plans.", "Ask about zoning, wetlands, servitudes, road reserves, and boundary beacons.", "Confirm development fees, compliance certificates, rates, and association costs.", "Visit the site in dry and rainy conditions if possible.", "Ask what approvals are needed before building."] },
      { type: "info", tone: "warning", title: "Servicing changes the true price", text: "An unserviced stand may look cheap but become expensive once roads, water, sewer, power, and compliance costs are included." },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "What to Check Before Buying in a New Property Development",
    slug: "what-to-check-before-buying-in-a-new-property-development",
    category: "Property Development",
    tags: ["new developments", "stands", "off-plan", "buyer due diligence"],
    excerpt: "A practical due diligence guide for off-plan homes, cluster projects, development stands, and gated estates.",
    focusKeyword: "new property developments Zimbabwe",
    image: "/images/property-management-dusk.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Buy the developer's track record, not only the brochure" },
      { type: "paragraph", text: "Marketing images can make a project look complete before the hard work is done. Buyers should check approvals, land control, servicing, timelines, penalties, developer history, and what exactly is included at handover." },
      { type: "table", headers: ["Check", "Question"], rows: [["Approvals", "Are layout, building, environmental, and servicing approvals in place where required?"], ["Land rights", "Who owns or controls the land and can they sell units or stands?"], ["Services", "Roads, water, sewer, drainage, power, internet, security, and waste management."], ["Payment schedule", "What milestones release each payment?"], ["Handover standard", "What finishes, certificates, snagging process, and warranties are included?"]] },
      { type: "download", label: "Download buyer due diligence checklist", url: "/downloads/blog/buyer-due-diligence-checklist.pdf" },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "Should Couples Buy Property Jointly or Separately?",
    slug: "should-couples-buy-property-jointly-or-separately-in-zimbabwe",
    category: "Property Law",
    tags: ["married couples", "joint ownership", "property law", "buying property"],
    excerpt: "A practical discussion guide for couples thinking about title, contributions, debt, inheritance, divorce risk, and estate planning.",
    focusKeyword: "joint property ownership Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Ownership should match the real agreement" },
      { type: "paragraph", text: "Couples should discuss who contributes what, whose name appears on documents, who carries debt, what happens if one person dies, and what happens if the relationship ends. Avoid treating the title decision as a romance test; it is a legal and financial structure." },
      { type: "table", headers: ["Question", "Why it matters"], rows: [["Who pays the deposit and transfer costs?", "Clarifies contributions."], ["Who will repay loans or family money?", "Prevents hidden debt disputes."], ["Whose name will appear on title or cession records?", "Determines documentary ownership."], ["What if one partner dies?", "Connects the purchase to estate planning."], ["What if the couple separates?", "Reduces uncertainty during conflict."]] },
      { type: "info", tone: "warning", title: "Get advice before signing", text: "Marriage, customary unions, estate planning, and divorce can affect property rights. Speak to a qualified professional before finalising ownership." },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "What Happens to Property When Couples Separate Without Divorcing?",
    slug: "what-happens-to-property-when-couples-separate-without-divorcing-in-zimbabwe",
    category: "Property Law",
    tags: ["separation", "divorce", "family property", "property law"],
    excerpt: "What separated couples should document about occupation, bond or loan payments, rent, repairs, sale decisions, and children.",
    focusKeyword: "property separation Zimbabwe",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Separation creates a management problem immediately" },
      { type: "paragraph", text: "Even before divorce or formal division, someone must decide who occupies the property, who pays utilities, who handles repairs, whether rent is collected, and whether either person can sell or mortgage the property." },
      { type: "list", items: ["Record who is living at the property and on what terms.", "Keep proof of mortgage, loan, rates, utilities, and repair payments.", "Do not sell, rent, remove fixtures, or change locks without advice if ownership is disputed.", "Agree how children's housing needs affect short-term decisions.", "Get legal guidance before signing sale, lease, or settlement documents."] },
      { type: "info", tone: "warning", title: "Do not rely on silence", text: "Informal arrangements can become expensive when one person later denies the agreement. Put important decisions in writing." },
      { type: "cta", variant: "whatsapp" },
    ],
  },
  {
    title: "How to Prepare for a Property Valuation in Zimbabwe",
    slug: "how-to-prepare-for-a-property-valuation-in-zimbabwe",
    category: "Selling Property",
    tags: ["valuation", "selling property", "property investment"],
    excerpt: "How sellers, buyers, and owners can prepare documents, repairs, access, service information, and comparable evidence before valuation.",
    focusKeyword: "property valuation Zimbabwe",
    image: "/images/property-management-dusk.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "A valuer needs evidence and access" },
      { type: "paragraph", text: "A valuation is stronger when the valuer can inspect the property properly and understand its documents, land size, improvements, services, condition, and comparable market evidence." },
      { type: "list", items: ["Prepare ownership documents, plans, rates information, and lease details if rented.", "Make all rooms, outbuildings, garages, cottages, and service areas accessible.", "List upgrades such as solar, borehole, tanks, security, roofing, kitchens, bathrooms, and extensions.", "Disclose defects rather than hiding them.", "Share recent comparable offers or sales evidence if available."] },
      { type: "table", headers: ["Feature", "Why it can affect value"], rows: [["Water security", "Improves liveability and tenant demand."], ["Solar backup", "Can improve resilience if installed correctly."], ["Approved structures", "Reduce buyer and lender uncertainty."], ["Condition", "Repairs influence negotiation and finance decisions."]] },
      { type: "cta", variant: "list-property" },
    ],
  },
  {
    title: "How Banks Assess Mortgage Applications in Zimbabwe",
    slug: "how-banks-assess-mortgage-applications-in-zimbabwe",
    category: "Buying Property",
    tags: ["mortgage", "home loans", "buying property", "affordability"],
    excerpt: "A practical overview of affordability, deposit, income, credit profile, property valuation, insurance, and transfer costs.",
    focusKeyword: "mortgage application Zimbabwe",
    image: "/images/kwekwe-flat.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Mortgage approval has two sides" },
      { type: "paragraph", text: "A bank looks at the borrower and the property. The borrower must show repayment ability, deposit readiness, and stable income. The property must be acceptable security with clear documents, realistic value, and transferability." },
      { type: "table", headers: ["Bank check", "What it means"], rows: [["Income", "Can you afford repayments after other obligations?"], ["Deposit", "Do you have cash for deposit, fees, and transfer costs?"], ["Credit and banking history", "Does your record show reliable repayment behaviour?"], ["Property valuation", "Does the property support the requested loan amount?"], ["Documents", "Are title, offer, identity, and transfer papers acceptable?"]] },
      { type: "info", tone: "info", title: "Pre-approval helps", text: "Knowing your likely budget before viewing saves time and makes your offer more credible to sellers." },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "Cash Buyer vs Mortgage Buyer: What Sellers Should Expect",
    slug: "cash-buyer-vs-mortgage-buyer-what-sellers-should-expect-in-zimbabwe",
    category: "Selling Property",
    tags: ["cash buyer", "mortgage", "selling property", "offers"],
    excerpt: "How sellers can compare cash and mortgage offers by certainty, timing, proof of funds, valuation risk, and transfer process.",
    focusKeyword: "cash buyer mortgage buyer Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "The highest offer is not always the strongest offer" },
      { type: "paragraph", text: "A seller should compare price, proof of funds, conditions, timing, deposit, buyer seriousness, and transfer risk. A lower cash offer may close faster, while a mortgage-backed offer may be strong if pre-approval and valuation are realistic." },
      { type: "table", headers: ["Offer type", "Main strengths", "Main risks"], rows: [["Cash buyer", "Speed, fewer lender conditions, simpler negotiation.", "Proof of funds may be vague or funds may be offshore."], ["Mortgage buyer", "Can widen buyer pool and support fair price.", "Approval, valuation, and bank timelines can delay transfer."], ["Instalment proposal", "Can help buyers without full cash.", "Higher default risk unless legally structured."]] },
      { type: "heading", level: 2, text: "What sellers should request" },
      { type: "list", items: ["Written offer with deposit, timelines, conditions, and expiry date.", "Proof of funds or pre-approval evidence.", "Clear statement of who pays transfer, agent, and clearance costs.", "Occupation date and consequences of delay.", "Conveyancer details and payment handling process."] },
      { type: "cta", variant: "list-property" },
    ],
  },
  {
    title: "Best Harare Suburbs for Renters by Budget",
    slug: "best-harare-suburbs-for-renters-by-budget",
    category: "Renting in Zimbabwe",
    tags: ["Harare rentals", "suburb guide", "renting", "budget"],
    excerpt: "How renters can compare Harare suburbs by budget, commute, services, room type, security, and lifestyle fit.",
    focusKeyword: "Harare suburbs rent budget",
    image: "/images/roommates-hero.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Use budget bands as a shortlist, not a promise" },
      { type: "paragraph", text: "Rental prices move by exact street, property condition, services, furnishing, and urgency. Instead of relying on one price list, use budget bands to shortlist areas, then compare current listings and total monthly cost." },
      { type: "table", headers: ["Budget priority", "Areas to compare"], rows: [["Lower monthly cost", "Highfield, Glen View, Kuwadzana, Warren Park, Budiriro, Dzivarasekwa, and similar high-density areas."], ["Balanced commute and amenities", "Mabelreign, Greendale, Waterfalls, Hatfield, Cranborne, Eastlea, and Avondale West."], ["Premium family living", "Borrowdale, Mount Pleasant, Highlands, Vainona, Gunhill, Chisipite, and Mandara."], ["Student or room sharing", "Mount Pleasant, Belvedere, Milton Park, Avenues, Sunningdale, and areas near transport routes."]] },
      { type: "info", tone: "warning", title: "Always compare the total cost", text: "A cheaper suburb can become expensive if transport, water, electricity backup, or security costs are high." },
      { type: "cta", variant: "rent" },
    ],
  },
  {
    title: "Hidden Costs of Buying Property in Zimbabwe",
    slug: "hidden-costs-of-buying-property-in-zimbabwe",
    category: "Buying Property",
    tags: ["buying property", "hidden costs", "transfer costs", "rates"],
    excerpt: "A buyer budget guide covering transfer fees, legal costs, rates clearance, arrears, repairs, occupation, security, and service upgrades.",
    focusKeyword: "hidden costs buying property Zimbabwe",
    image: "/images/kwekwe-flat.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Your budget should go beyond the purchase price" },
      { type: "paragraph", text: "A buyer who spends every dollar on the purchase price may struggle with transfer costs, repairs, rates, service reconnection, security upgrades, and moving expenses. Build a transaction budget before making the offer." },
      { type: "table", headers: ["Cost area", "Examples"], rows: [["Transaction costs", "Legal fees, transfer fees, agency commission allocation, bank charges, valuation, and registration costs."], ["Property debts", "Rates, water, levies, association fees, penalties, and service arrears."], ["Occupation costs", "Rent before transfer, insurance, utilities, security, and caretaker costs."], ["Immediate repairs", "Leaks, locks, electrical issues, plumbing, roof, paint, broken fittings, and cleaning."], ["Resilience upgrades", "Water tank, pump, solar, inverter, batteries, lighting, alarm, and boundary improvements."]] },
      { type: "download", label: "Download buyer due diligence checklist", url: "/downloads/blog/buyer-due-diligence-checklist.pdf" },
      { type: "cta", variant: "sale" },
    ],
  },
  {
    title: "How Infrastructure Affects Property Value in Zimbabwe",
    slug: "how-infrastructure-affects-property-value-in-zimbabwe",
    category: "Property Investment",
    tags: ["infrastructure", "property value", "market trends", "suburb research"],
    excerpt: "How roads, water, sewer, schools, transport, internet, retail, and security shape property prices and rentability.",
    focusKeyword: "infrastructure property value Zimbabwe",
    image: "/images/bulawayo-family-house.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Infrastructure turns location into liveability" },
      { type: "paragraph", text: "A suburb's value is shaped by more than distance from the CBD. Roads, drainage, water, sewer, schools, clinics, transport, internet, shopping, employment nodes, and security all affect what buyers and tenants are willing to pay." },
      { type: "table", headers: ["Infrastructure", "Value impact"], rows: [["Roads and drainage", "Affects access, vehicle costs, flood risk, and daily convenience."], ["Water and sewer", "Strong effect on family demand, health, and maintenance risk."], ["Schools and clinics", "Supports long-term family demand."], ["Transport", "Changes affordability for renters and workers."], ["Internet and power resilience", "Important for professionals, students, and businesses."], ["Retail and services", "Improves convenience and rental appeal."]] },
      { type: "heading", level: 2, text: "Investor research questions" },
      { type: "list", items: ["What public or private infrastructure is already complete?", "What is promised but not yet delivered?", "Which roads flood or become difficult in rainy season?", "Are new schools, clinics, malls, offices, or transport links changing demand?", "Are service improvements already priced into asking prices?"] },
      { type: "cta", variant: "search" },
    ],
  },
  {
    title: "Ask HouseLink: Should I Pay a Deposit Before Viewing a Property?",
    slug: "ask-houselink-should-i-pay-a-deposit-before-viewing-a-property",
    category: "Tenant Advice",
    tags: ["Ask HouseLink", "deposit", "tenant safety", "viewings"],
    excerpt: "A direct answer for renters who are being pushed to pay first: when to pause, what proof to ask for, and how to protect your money.",
    focusKeyword: "pay deposit before viewing Zimbabwe",
    image: "/images/houselink-hero.webp",
    layout: BlogArticleLayout.PROPERTY_GUIDE,
    blocks: [
      { type: "heading", level: 2, text: "Short answer" },
      { type: "paragraph", text: "Do not pay a deposit before you have viewed the actual property, confirmed who has authority to rent it, and agreed the terms in writing. If you are outside town, send someone trusted or ask for a live video walkthrough before any serious payment." },
      { type: "heading", level: 2, text: "Why this question matters" },
      { type: "paragraph", text: "In Zimbabwe, good rentals can move fast, especially in Harare, Bulawayo, Gweru, and areas close to schools, hospitals, industrial sites, and universities. Scammers use that pressure. They say many people are waiting, then ask for a small commitment fee. That is exactly when you must slow down." },
      { type: "list", items: ["Ask for the exact suburb and viewing arrangement.", "Confirm whether the person is the owner, agent, caretaker, or relative.", "Ask what the deposit covers and when it is refundable.", "Pay only through a traceable method and keep written proof.", "If anything changes suddenly, pause and verify again."] },
      { type: "download", label: "Download tenant viewing checklist", url: "/downloads/blog/tenant-viewing-checklist.pdf" },
      { type: "cta", variant: "rent" },
    ],
  },
  {
    title: "Ask HouseLink: My Landlord Wants to Increase Rent, What Should I Check?",
    slug: "ask-houselink-my-landlord-wants-to-increase-rent-what-should-i-check",
    category: "Tenant Advice",
    tags: ["Ask HouseLink", "rent increase", "lease agreement", "tenant advice"],
    excerpt: "Plain guidance for tenants facing a rent increase: check the lease, notice period, market rent, services, and how to respond calmly.",
    focusKeyword: "landlord rent increase Zimbabwe",
    image: "/images/property-management-dusk.webp",
    layout: BlogArticleLayout.STANDARD_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "Start with the lease" },
      { type: "paragraph", text: "Before arguing about the amount, check what your lease says about rent review, notice period, payment currency, service charges, and renewal. If there is no written lease, write down the current arrangement and ask for the new proposal in writing." },
      { type: "heading", level: 2, text: "Compare value, not only price" },
      { type: "paragraph", text: "A rent increase may be more reasonable if services have improved, repairs were done, security improved, or nearby rents have moved. It is less reasonable when water, power, access, or repairs are getting worse and no explanation is given." },
      { type: "table", headers: ["Check", "Simple question"], rows: [["Notice", "When does the new rent start?"], ["Lease", "Does the agreement allow this review now?"], ["Market", "What are similar homes nearby asking?"], ["Services", "Are water, ZESA, WiFi, levies, or security included?"], ["Repairs", "Are known defects being fixed?"]] },
      { type: "download", label: "Download rent review checklist", url: "/downloads/blog/rent-review-checklist.pdf" },
      { type: "cta", variant: "whatsapp" },
    ],
  },
  {
    title: "Harare, Bulawayo, Gweru and Mutare: How to Compare Suburbs Before Renting",
    slug: "compare-suburbs-before-renting-harare-bulawayo-gweru-mutare",
    category: "Renting in Zimbabwe",
    tags: ["suburb guide", "renting", "Harare", "Bulawayo", "Gweru", "Mutare"],
    excerpt: "A practical suburb-comparison guide for Zimbabwean renters looking at commute, water, power, security, transport, and total monthly cost.",
    focusKeyword: "compare suburbs before renting Zimbabwe",
    image: "/images/roommates-hero.webp",
    layout: BlogArticleLayout.LIST_ARTICLE,
    blocks: [
      { type: "heading", level: 2, text: "A good suburb must fit your daily routine" },
      { type: "paragraph", text: "Do not choose a suburb only because the name sounds good. Compare how you will actually live there: getting to work or school, buying groceries, finding transport, managing water and power cuts, and getting home safely at night." },
      { type: "table", headers: ["City", "What to compare"], rows: [["Harare", "Commute route, congestion, borehole or tank setup, security, parking, and proximity to work or school."], ["Bulawayo", "Water schedule, distance to CBD or industrial areas, family amenities, road access, and neighbourhood quietness."], ["Gweru", "Distance to MSU or work, transport availability, room sharing rules, and power/water reliability."], ["Mutare", "Slope, drainage, road access, distance to town, and whether the property is easy to reach in rainy weather."]] },
      { type: "heading", level: 2, text: "Questions to ask locals" },
      { type: "list", items: ["How often is water available here?", "What is transport like early morning and after dark?", "Are there noise, security, or flooding issues?", "Which shops, clinics, schools, or campuses are easy to reach?", "What extra costs do tenants usually forget in this area?"] },
      { type: "cta", variant: "search" },
    ],
  },
] as const;

const FEATURED_STARTER_SLUGS = new Set([
  "how-to-find-a-house-to-rent-in-zimbabwe-without-wasting-time",
  "how-to-spot-property-scams-in-zimbabwe-before-you-lose-money",
  "diaspora-buyer-checklist-for-buying-property-in-zimbabwe",
]);

type StarterArticle = (typeof STARTER_ARTICLES)[number];
type RelatedBlogListing = Prisma.ListingGetPayload<{ include: { media: true } }>;
export type BlogCommentThread = {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  body: string;
  status?: string;
  createdAt: Date;
  replies: BlogCommentThread[];
};

export const BLOG_SERIES = [
  {
    slug: "tenant-safety-series",
    title: "Tenant Safety Series",
    description: "Plain guides for viewing safely, checking deposits, understanding leases, and avoiding rental pressure.",
    category: "Tenant Advice",
    posts: [
      "tenant-safety-checklist-before-paying-a-deposit",
      "ask-houselink-should-i-pay-a-deposit-before-viewing-a-property",
      "what-should-be-in-a-proper-lease-agreement-in-zimbabwe",
      "how-to-spot-property-scams-in-zimbabwe-before-you-lose-money",
    ],
  },
  {
    slug: "buyer-due-diligence-series",
    title: "Buyer Due Diligence Series",
    description: "Step-by-step checks for ownership, title, cession, rates, hidden costs, and seller authority.",
    category: "Buying Property",
    posts: [
      "buying-property-in-zimbabwe-questions-to-ask-before-you-commit",
      "title-deeds-cession-and-agreements-of-sale-what-zimbabwe-buyers-should-understand",
      "hidden-costs-of-buying-property-in-zimbabwe",
      "diaspora-buyer-checklist-for-buying-property-in-zimbabwe",
    ],
  },
  {
    slug: "landlord-toolkit-series",
    title: "Landlord Toolkit Series",
    description: "Practical help for listing well, screening tenants, lease clarity, handovers, and property management.",
    category: "Landlord Advice",
    posts: [
      "how-landlords-can-create-better-property-listings",
      "what-landlords-should-check-before-accepting-a-tenant",
      "what-should-be-in-a-proper-lease-agreement-in-zimbabwe",
      "what-to-do-if-a-tenant-refuses-to-move-out-in-zimbabwe",
    ],
  },
] as const;

export const BLOG_HUBS = [
  { slug: "renting-in-harare", title: "Renting in Harare", city: "Harare", category: "Renting in Zimbabwe", description: "Rental guides for Harare tenants comparing suburbs, commute, deposits, water, ZESA, and safety." },
  { slug: "buying-in-bulawayo", title: "Buying in Bulawayo", city: "Bulawayo", category: "Buying Property", description: "Buyer guidance for Bulawayo families, investors, and diaspora buyers checking ownership, price, and services." },
  { slug: "student-accommodation-in-gweru", title: "Student Accommodation in Gweru", city: "Gweru", category: "Renting in Zimbabwe", description: "Student housing checks around Gweru and MSU: sharing rules, transport, study space, water, and total cost." },
  { slug: "moving-to-mutare", title: "Moving to Mutare", city: "Mutare", category: "Moving and Relocation", description: "Practical relocation guidance for access, drainage, slope, suburbs, transport, and family routines in Mutare." },
] as const;

function starterAuthor() {
  const now = new Date("2026-07-26T00:00:00.000Z");
  return {
    id: "starter-author-houselink-editorial-team",
    name: "HouseLink Editorial Team",
    slug: "houselink-editorial-team",
    role: "Property resources team",
    bio: "Practical property guidance from the HouseLink Zimbabwe team.",
    avatarUrl: null,
    email: null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

function starterCategories() {
  const now = new Date("2026-07-26T00:00:00.000Z");
  return DEFAULT_CATEGORIES.map(([name, description], sortOrder) => ({
    id: `starter-category-${slugify(name)}`,
    name,
    slug: slugify(name),
    description,
    imageUrl: null,
    seoTitle: `${name} | HouseLink Zimbabwe`,
    metaDescription: description,
    sortOrder,
    active: true,
    createdAt: now,
    updatedAt: now,
  }));
}

function starterTags() {
  const now = new Date("2026-07-26T00:00:00.000Z");
  const tags = new Map<string, string>();
  for (const article of STARTER_ARTICLES) {
    for (const tag of article.tags) tags.set(slugify(tag), tag);
  }
  return [...tags].map(([slug, name]) => ({
    id: `starter-tag-${slug}`,
    name,
    slug,
    description: null,
    active: true,
    createdAt: now,
    updatedAt: now,
    _count: { posts: STARTER_ARTICLES.filter((article) => article.tags.some((tag) => slugify(tag) === slug)).length },
  }));
}

function starterPost(article: StarterArticle, index: number) {
  const category = starterCategories().find((item) => item.name === article.category) ?? starterCategories()[0];
  const author = starterAuthor();
  const contentBlocks = enrichStarterBlocks(article);
  const contentText = blocksToText(contentBlocks);
  const publishedAt = new Date(Date.UTC(2026, 6, 26 - index, 8, 0, 0));
  return {
    id: `starter-post-${article.slug}`,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    status: "PUBLISHED" as BlogPostStatus,
    layout: article.layout,
    categoryId: category.id,
    authorId: author.id,
    featuredImageUrl: article.image,
    featuredImageAlt: article.title,
    socialImageUrl: article.image,
    contentBlocks,
    contentText,
    seoTitle: `${article.title} | HouseLink Zimbabwe`,
    metaDescription: article.excerpt,
    focusKeyword: article.focusKeyword,
    secondaryKeywords: [...article.tags],
    canonicalUrl: null,
    noIndex: false,
    featured: FEATURED_STARTER_SLUGS.has(article.slug),
    popular: ["Tenant Advice", "Landlord Advice", "Moving and Relocation", "Property Law"].includes(article.category),
    readTimeMinutes: estimateReadTime(contentText),
    viewCount: 0,
    searchVector: `${article.title} ${article.excerpt} ${contentText} ${article.tags.join(" ")}`,
    scheduledAt: null,
    publishedAt,
    lastEditedById: null,
    createdById: null,
    createdAt: publishedAt,
    updatedAt: publishedAt,
    archivedAt: null,
    category,
    author,
    tags: article.tags.map((tag) => ({
      id: `starter-tag-${slugify(tag)}`,
      name: tag,
      slug: slugify(tag),
      description: null,
      active: true,
      createdAt: publishedAt,
      updatedAt: publishedAt,
    })),
  };
}

function starterPosts() {
  return STARTER_ARTICLES.map(starterPost);
}

function enrichStarterBlocks(article: StarterArticle): BlogBlock[] {
  const blocks = article.blocks.map((block) => ({ ...block })) as BlogBlock[];
  if (blocks.some((block) => block.type === "heading" && block.text === "What this means on the ground in Zimbabwe")) return blocks;
  const download = article.category === "Tenant Advice" || article.category === "Renting in Zimbabwe"
    ? { type: "download", label: "Download tenant viewing checklist", url: "/downloads/blog/tenant-viewing-checklist.pdf" } satisfies BlogBlock
    : article.category === "Landlord Advice"
      ? { type: "download", label: "Download landlord handover form", url: "/downloads/blog/landlord-handover-form.pdf" } satisfies BlogBlock
      : article.category === "Buying Property" || article.category === "Property Law" || article.category === "Property Development"
        ? { type: "download", label: "Download buyer due diligence checklist", url: "/downloads/blog/buyer-due-diligence-checklist.pdf" } satisfies BlogBlock
        : null;
  const localChecklist = article.category === "Property Law"
    ? ["Do not rely only on WhatsApp messages when money is involved; ask for written documents.", "Check names, IDs, stand numbers, rates position, and authority to sell or rent.", "Use a conveyancer or qualified legal practitioner for big decisions, especially title deed, cession, estate, or divorce-related property."]
    : article.category === "Property Development"
      ? ["Confirm servicing first: roads, water, sewer, power, drainage, and access can change the real price.", "Ask who is responsible for approvals, inspections, levies, timelines, and handover documents.", "Visit the site at different times if possible, including after rain, so you understand access and drainage."]
    : article.category === "Landlord Advice"
      ? ["Be clear about rent, deposit, bills, repairs, house rules, and notice period before the tenant moves in.", "Keep receipts, inspection photos, and messages in one place so disagreements are easier to solve.", "A good tenant often chooses the landlord who communicates properly, not only the cheapest property."]
    : article.category === "Tenant Advice" || article.category === "Renting in Zimbabwe"
      ? ["Work with your full monthly budget, including transport, ZESA, water, WiFi, levies, and moving costs.", "View the actual place or send someone trusted before paying a deposit.", "Ask simple direct questions: who owns it, who manages repairs, what is included, and when can I move in?"]
    : article.category === "Buying Property"
      ? ["Slow down before paying a large deposit, even when the property looks like a bargain.", "Compare the asking price with similar homes in the same suburb, condition, services, and ownership route.", "Check ownership documents, rates, boundaries, approved plans, and seller authority before signing."]
      : article.category === "Selling Property"
        ? ["Prepare documents early so serious buyers do not lose confidence.", "Price against real comparable properties, not only what neighbours are asking.", "Clean photos, honest defects, and clear viewing arrangements help buyers trust the listing."]
        : ["Ask what the decision will cost in real life, not only what the advert says.", "Keep proof of payments, messages, agreements, and inspection notes.", "When something feels rushed or unclear, pause and verify before committing money."];
  return [
    ...blocks,
    { type: "heading", level: 2, text: "In simple words" },
    {
      type: "paragraph",
      text: "The main point is simple: do not rush a property decision because someone is putting pressure on you. Check the person, check the place, check the documents, and make sure the money trail is clear.",
    },
    { type: "heading", level: 2, text: "What this means on the ground in Zimbabwe" },
    {
      type: "paragraph",
      text: "Property decisions here are usually practical, family-involving, and money-sensitive. A useful article should help you know what to ask next, what proof to request, and where a deal can go wrong before you put cash down.",
    },
    { type: "list", items: localChecklist },
    { type: "heading", level: 3, text: "Example" },
    {
      type: "paragraph",
      text: article.category === "Renting in Zimbabwe" || article.category === "Tenant Advice"
        ? "If a tenant in Harare is told to pay today because many people are waiting, the safer move is to request a viewing, confirm who owns or manages the property, and get the deposit terms in writing first."
        : article.category === "Buying Property" || article.category === "Property Law" || article.category === "Property Development"
          ? "If a family is buying a stand or house in Bulawayo, Gweru, Mutare or Harare, they should verify ownership, rates, boundaries and seller authority before paying a large deposit."
          : article.category === "Landlord Advice" || article.category === "Selling Property"
            ? "If a landlord is handing over a cottage or house, a signed checklist with photos can prevent arguments later about keys, repairs, ZESA, water, and damage."
            : "If the details are not clear enough to explain to a family member, pause and ask for proof before you commit.",
    },
    ...(download ? [download] : []),
    { type: "heading", level: 2, text: "Common reader questions" },
    {
      type: "info",
      tone: "info",
      title: "Can I rely on a verbal agreement?",
      text: "For small discussions, maybe. For rent, deposits, sales, repairs, or occupation dates, write it down. A clear message, signed form, or lease is easier to defend than memory.",
    },
    {
      type: "info",
      tone: "info",
      title: "What should I do if I am not sure?",
      text: "Ask for proof, compare with similar properties, speak to someone experienced, and pause before paying. A serious person should be able to answer simple questions clearly.",
    },
    { type: "heading", level: 2, text: "Ask HouseLink" },
    {
      type: "paragraph",
      text: "Have a real property question from Harare, Bulawayo, Gweru, Mutare, Masvingo, Victoria Falls, or another Zimbabwean town? Use the comments to share it. Good reader questions can become future Ask HouseLink articles.",
    },
    {
      type: "info",
      tone: "info",
      title: "Plain advice",
      text: "If you cannot explain the deal in simple words, you probably need more information. Ask again, write it down, and get help before signing or paying.",
    },
  ];
}

function starterWhere(params: { query?: string; category?: string; tag?: string }) {
  const query = params.query?.trim().toLowerCase();
  return (post: ReturnType<typeof starterPost>) => {
    if (params.category && post.category?.slug !== params.category) return false;
    if (params.tag && !post.tags.some((tag) => tag.slug === params.tag)) return false;
    if (!query) return true;
    return [post.title, post.excerpt, post.contentText, post.focusKeyword, post.category?.name, post.tags.map((tag) => tag.name).join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query);
  };
}

function getStarterBlogIndex(params: { query?: string; category?: string; tag?: string; page?: number; limit?: number; popular?: boolean }) {
  const { page, limit } = normalisePaging(params);
  const allPosts = starterPosts().filter(starterWhere(params));
  const sorted = [...allPosts].sort((a, b) => {
    if (params.popular && a.popular !== b.popular) return a.popular ? -1 : 1;
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  });
  const posts = withUniqueBlogImages(sorted.slice((page - 1) * limit, page * limit));
  const everyPost = starterPosts();
  const categories = starterCategories();
  const featured = withHeroImage(everyPost.find((post) => post.featured) ?? everyPost[0] ?? null);
  const popular = withUniqueBlogImages(everyPost.filter((post) => post.popular).slice(0, 5));
  const editorsPicks = withUniqueBlogImages(everyPost.filter((post) => post.featured).slice(0, 4));
  const recentlyUpdated = withUniqueBlogImages([...everyPost].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 4));
  const latestNews = withUniqueBlogImages(everyPost.filter((post) => post.category?.slug === "houselink-news").slice(0, 4));
  const trendingTopics = starterTags().sort((a, b) => b._count.posts - a._count.posts).slice(0, 10);
  return { posts, total: sorted.length, page, limit, hasMore: page * limit < sorted.length, categories, featured, popular, editorsPicks, recentlyUpdated, latestNews, trendingTopics };
}

function getStarterBlogPost(slug: string) {
  const posts = starterPosts();
  const post = posts.find((item) => item.slug === slug);
  if (!post) return null;
  const related = posts.filter((item) => item.slug !== slug && (item.category?.slug === post.category?.slug || item.tags.some((tag) => post.tags.some((postTag) => postTag.slug === tag.slug)))).slice(0, 3);
  const index = posts.findIndex((item) => item.slug === slug);
  return {
    post,
    related,
    relatedListings: [] as RelatedBlogListing[],
    authorArticleCount: posts.filter((item) => item.author?.slug === post.author?.slug).length,
    relatedCategories: post.category ? [post.category] : [],
    previous: posts[index + 1] ? { title: posts[index + 1].title, slug: posts[index + 1].slug, publishedAt: posts[index + 1].publishedAt } : null,
    next: index > 0 ? { title: posts[index - 1].title, slug: posts[index - 1].slug, publishedAt: posts[index - 1].publishedAt } : null,
    comments: [] as BlogCommentThread[],
  };
}

function getStarterPostsBySlugs(slugs: readonly string[]) {
  const bySlug = new Map<string, ReturnType<typeof starterPost>>(starterPosts().map((post) => [post.slug, post]));
  return slugs.map((slug) => bySlug.get(slug)).filter(Boolean) as ReturnType<typeof starterPost>[];
}

export async function ensureBlogDefaults(actorId?: string) {
  await ensureBlogProductionSchema();
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
    const articleTags = [...article.tags];
    const articleBlocks = enrichStarterBlocks(article);
    const tagIds = await resolveTags(articleTags);
    const contentText = blocksToText(articleBlocks);
    const seedData = {
      title: article.title,
      excerpt: article.excerpt,
      status: "PUBLISHED" as const,
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
      featured: FEATURED_STARTER_SLUGS.has(article.slug),
      popular: ["Tenant Advice", "Landlord Advice", "Moving and Relocation", "Property Law"].includes(article.category),
      readTimeMinutes: estimateReadTime(contentText),
      searchVector: `${article.title} ${article.excerpt} ${contentText} ${articleTags.join(" ")}`,
    };
    if (existing) {
      if (shouldRefreshStarterArticle(existing.contentText, existing.updatedAt, existing.createdAt)) {
        await prisma.blogPost.update({
          where: { id: existing.id },
          data: {
            ...seedData,
            publishedAt: existing.publishedAt ?? new Date(),
            lastEditedById: actorId,
            tags: { set: tagIds.map((id) => ({ id })) },
          },
        });
      }
      continue;
    }
    await prisma.blogPost.create({
      data: {
        ...seedData,
        slug: article.slug,
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

function shouldRefreshStarterArticle(contentText: string | null, updatedAt: Date, createdAt: Date) {
  const wordCount = String(contentText ?? "").split(/\s+/).filter(Boolean).length;
  const looksLikeOriginalStarter = wordCount < 180;
  const wasOnlySeeded = Math.abs(updatedAt.getTime() - createdAt.getTime()) < 5000;
  return looksLikeOriginalStarter || wasOnlySeeded;
}

function normalisePaging(params: { page?: number; limit?: number }) {
  const page = Math.max(Math.floor(Number(params.page ?? 1)) || 1, 1);
  const limit = Math.min(Math.max(Math.floor(Number(params.limit ?? 9)) || 9, 1), 24);
  return { page, limit, skip: (page - 1) * limit };
}

function publishedPostWhere(params: { query?: string; category?: string; tag?: string; popular?: boolean }): Prisma.BlogPostWhereInput {
  const query = params.query?.trim();
  return {
    status: BlogPostStatus.PUBLISHED,
    noIndex: false,
    ...(params.category ? { category: { slug: params.category, active: true } } : {}),
    ...(params.tag ? { tags: { some: { slug: params.tag, active: true } } } : {}),
    ...(params.popular ? { popular: true } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { excerpt: { contains: query, mode: "insensitive" } },
            { contentText: { contains: query, mode: "insensitive" } },
            { focusKeyword: { contains: query, mode: "insensitive" } },
            { searchVector: { contains: query, mode: "insensitive" } },
            { category: { name: { contains: query, mode: "insensitive" } } },
            { tags: { some: { name: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

function publicOrderBy(popular?: boolean): Prisma.BlogPostOrderByWithRelationInput[] {
  return popular
    ? [{ popular: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }]
    : [{ publishedAt: "desc" }, { updatedAt: "desc" }];
}

function uniqueVisualUrl(post: { slug: string }, variant = "card") {
  return `/api/v1/blog/card-image/${post.slug}?variant=${variant}`;
}

function withUniqueBlogImages<T extends { slug: string; featuredImageUrl?: string | null; featuredImageAlt?: string | null; title: string }>(posts: T[]): T[] {
  const seen = new Set<string>();
  return posts.map((post) => {
    const image = post.featuredImageUrl || "";
    if (!image || seen.has(image)) {
      return { ...post, featuredImageUrl: uniqueVisualUrl(post), featuredImageAlt: post.featuredImageAlt || post.title };
    }
    seen.add(image);
    return post;
  });
}

function withHeroImage<T extends { slug: string; featuredImageUrl?: string | null; featuredImageAlt?: string | null; title: string } | null>(post: T): T {
  if (!post) return post;
  return { ...post, featuredImageUrl: post.featuredImageUrl || "/images/property-management-dusk.webp", featuredImageAlt: post.featuredImageAlt || post.title } as T;
}

async function getDatabaseBlogIndex(params: { query?: string; category?: string; tag?: string; page?: number; limit?: number; popular?: boolean }) {
  const prisma = getMainPrisma();
  const { page, limit, skip } = normalisePaging(params);
  const where = publishedPostWhere(params);
  const [posts, total, categories, featured, popular, editorsPicks, recentlyUpdated, latestNews, trendingTopics] = await Promise.all([
    prisma.blogPost.findMany({ where, include: blogIncludes(), orderBy: publicOrderBy(params.popular), skip, take: limit }),
    prisma.blogPost.count({ where }),
    prisma.blogCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.blogPost.findFirst({ where: { status: BlogPostStatus.PUBLISHED, noIndex: false, featured: true }, include: blogIncludes(), orderBy: publicOrderBy() }),
    prisma.blogPost.findMany({ where: { status: BlogPostStatus.PUBLISHED, noIndex: false, popular: true }, include: blogIncludes(), orderBy: publicOrderBy(true), take: 5 }),
    prisma.blogPost.findMany({ where: { status: BlogPostStatus.PUBLISHED, noIndex: false, featured: true }, include: blogIncludes(), orderBy: publicOrderBy(), take: 4 }),
    prisma.blogPost.findMany({ where: { status: BlogPostStatus.PUBLISHED, noIndex: false }, include: blogIncludes(), orderBy: [{ updatedAt: "desc" }], take: 4 }),
    prisma.blogPost.findMany({ where: { status: BlogPostStatus.PUBLISHED, noIndex: false, category: { slug: "houselink-news" } }, include: blogIncludes(), orderBy: publicOrderBy(), take: 4 }),
    prisma.blogTag.findMany({ where: { active: true }, include: { _count: { select: { posts: true } } }, orderBy: [{ name: "asc" }], take: 20 }),
  ]);
  return {
    posts: withUniqueBlogImages(posts),
    total,
    page,
    limit,
    hasMore: page * limit < total,
    categories,
    featured: withHeroImage(featured ?? posts[0] ?? null),
    popular: withUniqueBlogImages(popular),
    editorsPicks: withUniqueBlogImages(editorsPicks),
    recentlyUpdated: withUniqueBlogImages(recentlyUpdated),
    latestNews: withUniqueBlogImages(latestNews),
    trendingTopics: trendingTopics.sort((a, b) => b._count.posts - a._count.posts).slice(0, 10),
  };
}

async function getDatabaseBlogPost(slug: string, incrementView = false) {
  const prisma = getMainPrisma();
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: BlogPostStatus.PUBLISHED, noIndex: false },
    include: blogIncludes(),
  });
  if (!post) return null;
  if (incrementView) {
    void prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => null);
  }
  const relatedMatches = [
    post.category?.slug ? { category: { slug: post.category.slug } } : {},
    ...post.tags.map((tag) => ({ tags: { some: { slug: tag.slug } } })),
  ].filter((item) => Object.keys(item).length) as Prisma.BlogPostWhereInput[];
  const relatedWhere: Prisma.BlogPostWhereInput = {
    id: { not: post.id },
    status: BlogPostStatus.PUBLISHED,
    noIndex: false,
    ...(relatedMatches.length ? { OR: relatedMatches } : {}),
  };
  const [related, relatedListings, authorArticleCount, relatedCategories, previous, next, comments] = await Promise.all([
    prisma.blogPost.findMany({ where: relatedWhere, include: blogIncludes(), orderBy: publicOrderBy(), take: 3 }),
    prisma.listing.findMany({
      where: { status: ListingStatus.ACTIVE },
      include: { media: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: 3,
    }),
    post.author?.slug ? prisma.blogPost.count({ where: { status: BlogPostStatus.PUBLISHED, noIndex: false, author: { slug: post.author.slug } } }) : Promise.resolve(0),
    post.category ? prisma.blogCategory.findMany({ where: { id: post.category.id } }) : Promise.resolve([]),
    prisma.blogPost.findFirst({ where: { status: BlogPostStatus.PUBLISHED, noIndex: false, publishedAt: { lt: post.publishedAt ?? post.createdAt } }, select: { title: true, slug: true, publishedAt: true }, orderBy: [{ publishedAt: "desc" }] }),
    prisma.blogPost.findFirst({ where: { status: BlogPostStatus.PUBLISHED, noIndex: false, publishedAt: { gt: post.publishedAt ?? post.createdAt } }, select: { title: true, slug: true, publishedAt: true }, orderBy: [{ publishedAt: "asc" }] }),
    getPublicBlogComments(post.id),
  ]);
  return { post, related: withUniqueBlogImages(related), relatedListings, authorArticleCount, relatedCategories, previous, next, comments };
}

export async function getPublicBlogIndex(params: { query?: string; category?: string; tag?: string; page?: number; limit?: number; popular?: boolean }) {
  try {
    const result = await getDatabaseBlogIndex(params);
    if (result.total > 0) return result;
  } catch (error) {
    logBlogFallback("index", error);
  }
  return getStarterBlogIndex(params);
}

export async function getPublicBlogCategory(slug: string, params: { page?: number; limit?: number }) {
  try {
    const prisma = getMainPrisma();
    const category = await prisma.blogCategory.findFirst({ where: { slug, active: true } });
    if (category) return { category, ...(await getDatabaseBlogIndex({ category: slug, page: params.page, limit: params.limit })) };
  } catch (error) {
    logBlogFallback("category", error);
  }
  const category = starterCategories().find((item) => item.slug === slug);
  return category ? { category, ...getStarterBlogIndex({ category: slug, page: params.page, limit: params.limit }) } : null;
}

export async function getPublicBlogPost(slug: string, incrementView = false) {
  try {
    const post = await getDatabaseBlogPost(slug, incrementView);
    if (post) return post;
  } catch (error) {
    logBlogFallback("post", error);
  }
  return getStarterBlogPost(slug);
}

export async function getPublicBlogSeries(slug: string) {
  const series = BLOG_SERIES.find((item) => item.slug === slug);
  if (!series) return null;
  try {
    const prisma = getMainPrisma();
    const posts = await prisma.blogPost.findMany({ where: { slug: { in: [...series.posts] }, status: BlogPostStatus.PUBLISHED, noIndex: false }, include: blogIncludes(), orderBy: publicOrderBy() });
    return { series, posts: withUniqueBlogImages(posts), allSeries: BLOG_SERIES };
  } catch (error) {
    logBlogFallback("series", error);
  }
  return { series, posts: withUniqueBlogImages(getStarterPostsBySlugs(series.posts)), allSeries: BLOG_SERIES };
}

export async function getPublicBlogHub(slug: string) {
  const hub = BLOG_HUBS.find((item) => item.slug === slug);
  if (!hub) return null;
  try {
    const index = await getDatabaseBlogIndex({ category: slugify(hub.category), limit: 8 });
    return { hub, ...index, hubs: BLOG_HUBS };
  } catch (error) {
    logBlogFallback("hub", error);
  }
  return { hub, ...getStarterBlogIndex({ category: slugify(hub.category), limit: 8 }), hubs: BLOG_HUBS };
}

export async function getPublicBlogAuthor(slug: string, params: { page?: number; limit?: number }) {
  try {
    const prisma = getMainPrisma();
    const { page, limit, skip } = normalisePaging(params);
    const author = await prisma.blogAuthor.findFirst({ where: { slug, active: true } });
    if (author) {
      const where = { status: BlogPostStatus.PUBLISHED, noIndex: false, author: { slug } } satisfies Prisma.BlogPostWhereInput;
      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({ where, include: blogIncludes(), orderBy: publicOrderBy(), skip, take: limit }),
        prisma.blogPost.count({ where }),
      ]);
      return { author, posts: withUniqueBlogImages(posts), total, page, limit, hasMore: page * limit < total };
    }
  } catch (error) {
    logBlogFallback("author", error);
  }
  if (slug !== "houselink-editorial-team") return null;
  const fallback = getStarterBlogIndex({ page: params.page, limit: params.limit });
  return { author: starterAuthor(), posts: fallback.posts, total: fallback.total, page: fallback.page, limit: fallback.limit, hasMore: fallback.hasMore };
}

export async function getBlogSearchSuggestions(query: string) {
  const q = query.trim();
  if (!q) return { articles: [], categories: [], tags: [], authors: [] };
  try {
    const prisma = getMainPrisma();
    const [articles, categories, tags, authors] = await Promise.all([
      prisma.blogPost.findMany({
        where: publishedPostWhere({ query: q }),
        select: { title: true, slug: true, excerpt: true },
        orderBy: publicOrderBy(),
        take: 5,
      }),
      prisma.blogCategory.findMany({ where: { active: true, name: { contains: q, mode: "insensitive" } }, select: { name: true, slug: true }, take: 5 }),
      prisma.blogTag.findMany({ where: { active: true, name: { contains: q, mode: "insensitive" } }, select: { name: true, slug: true }, take: 5 }),
      prisma.blogAuthor.findMany({ where: { active: true, name: { contains: q, mode: "insensitive" } }, select: { name: true, slug: true }, take: 5 }),
    ]);
    if (articles.length || categories.length || tags.length || authors.length) return { articles, categories, tags, authors };
  } catch (error) {
    logBlogFallback("suggestions", error);
  }
  const lower = q.toLowerCase();
  const articles = starterPosts()
    .filter((post) => [post.title, post.excerpt, post.contentText].join(" ").toLowerCase().includes(lower))
    .slice(0, 5)
    .map(({ title, slug, excerpt }) => ({ title, slug, excerpt }));
  const categories = starterCategories().filter((category) => category.name.toLowerCase().includes(lower)).slice(0, 5).map(({ name, slug }) => ({ name, slug }));
  const tags = starterTags().filter((tag) => tag.name.toLowerCase().includes(lower)).slice(0, 5).map(({ name, slug }) => ({ name, slug }));
  const authors = starterAuthor().name.toLowerCase().includes(lower) ? [{ name: starterAuthor().name, slug: starterAuthor().slug }] : [];
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

export async function getPublicBlogComments(postId: string): Promise<BlogCommentThread[]> {
  await ensureBlogProductionSchema();
  const prisma = getMainPrisma();
  const comments = await prisma.blogComment.findMany({
    where: { postId, status: "APPROVED" },
    select: { id: true, postId: true, parentId: true, authorName: true, body: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const byId = new Map<string, BlogCommentThread>();
  const roots: BlogCommentThread[] = [];
  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] });
  }
  for (const comment of byId.values()) {
    if (comment.parentId && byId.has(comment.parentId)) {
      byId.get(comment.parentId)?.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }
  return roots;
}

export async function createBlogComment(input: { postId: string; parentId?: string | null; authorName: string; authorEmail?: string | null; body: string; ipHash?: string | null; userAgent?: string | null }) {
  await ensureBlogProductionSchema();
  const prisma = getMainPrisma();
  const post = await prisma.blogPost.findFirst({ where: { id: clean(input.postId), status: BlogPostStatus.PUBLISHED, noIndex: false }, select: { id: true } });
  if (!post) throw new Error("Article not found.");
  const parentId = stringOrNull(input.parentId);
  if (parentId) {
    const parent = await prisma.blogComment.findFirst({ where: { id: parentId, postId: post.id, status: "APPROVED" }, select: { id: true } });
    if (!parent) throw new Error("Reply target not found.");
  }
  const authorName = required(input.authorName, "Your name").slice(0, 80);
  const body = required(input.body, "Comment").slice(0, 1200);
  const authorEmail = stringOrNull(input.authorEmail)?.slice(0, 160) ?? null;
  const comment = await prisma.blogComment.create({
    data: {
      postId: post.id,
      parentId,
      authorName,
      authorEmail,
      body,
      status: "PENDING",
      ipHash: stringOrNull(input.ipHash),
      userAgent: stringOrNull(input.userAgent)?.slice(0, 240) ?? null,
    },
    select: { id: true, postId: true, parentId: true, authorName: true, body: true, status: true, createdAt: true },
  });
  return { ...comment, replies: [] as BlogCommentThread[] };
}

export async function createBlogArticleFeedback(input: { postId: string; vote: string; note?: string | null; ipHash?: string | null; userAgent?: string | null }) {
  await ensureBlogProductionSchema();
  const prisma = getMainPrisma();
  const post = await prisma.blogPost.findFirst({ where: { id: clean(input.postId), status: BlogPostStatus.PUBLISHED, noIndex: false }, select: { id: true } });
  if (!post) throw new Error("Article not found.");
  const vote = String(input.vote ?? "").toUpperCase() === "NEEDS_WORK" ? "NEEDS_WORK" : "HELPFUL";
  return prisma.blogArticleFeedback.create({
    data: {
      postId: post.id,
      vote,
      note: stringOrNull(input.note)?.slice(0, 600) ?? null,
      ipHash: stringOrNull(input.ipHash),
      userAgent: stringOrNull(input.userAgent)?.slice(0, 240) ?? null,
    },
  });
}

export async function createBlogReaderQuestion(input: { postId?: string | null; name: string; email?: string | null; city?: string | null; question: string; ipHash?: string | null; userAgent?: string | null }) {
  await ensureBlogProductionSchema();
  const prisma = getMainPrisma();
  const postId = stringOrNull(input.postId);
  if (postId) {
    const post = await prisma.blogPost.findFirst({ where: { id: postId, status: BlogPostStatus.PUBLISHED, noIndex: false }, select: { id: true } });
    if (!post) throw new Error("Article not found.");
  }
  return prisma.blogReaderQuestion.create({
    data: {
      postId,
      name: required(input.name, "Your name").slice(0, 80),
      email: stringOrNull(input.email)?.slice(0, 160) ?? null,
      city: stringOrNull(input.city)?.slice(0, 80) ?? null,
      question: required(input.question, "Question").slice(0, 1200),
      status: "NEW",
      ipHash: stringOrNull(input.ipHash),
      userAgent: stringOrNull(input.userAgent)?.slice(0, 240) ?? null,
    },
  });
}

export async function getPublicReaderQuestionDigest() {
  try {
    await ensureBlogProductionSchema();
    const prisma = getMainPrisma();
    const questions = await prisma.blogReaderQuestion.findMany({
      where: { status: { in: ["PLANNED", "ANSWERED"] } },
      include: { post: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
    return { questions, hubs: BLOG_HUBS, series: BLOG_SERIES };
  } catch (error) {
    if (!isMissingBlogEngagementTableError(error)) console.warn("Reader question digest unavailable", error);
    return { questions: [], hubs: BLOG_HUBS, series: BLOG_SERIES };
  }
}

async function getBlogContentGaps() {
  const prisma = getMainPrisma();
  let posts: Array<Prisma.BlogPostGetPayload<{ include: { category: true; tags: true; downloads: true } }>>;
  let feedbackNotes: Array<{ postId: string; vote: string; _count: { vote: number } }>;
  let questionCounts: Array<{ postId: string | null; _count: { postId: number } }>;
  try {
    [posts, feedbackNotes, questionCounts] = await Promise.all([
      prisma.blogPost.findMany({ include: { category: true, tags: true, downloads: true }, orderBy: { updatedAt: "desc" }, take: 120 }),
      prisma.blogArticleFeedback.groupBy({ by: ["postId", "vote"], _count: { vote: true } }),
      prisma.blogReaderQuestion.groupBy({ by: ["postId"], _count: { postId: true }, where: { postId: { not: null } } }),
    ]);
  } catch (error) {
    if (!isMissingBlogEngagementTableError(error)) throw error;
    console.warn("Blog engagement/question tables are unavailable; returning content gaps without reader signals.");
    posts = await prisma.blogPost.findMany({ include: { category: true, tags: true, downloads: true }, orderBy: { updatedAt: "desc" }, take: 120 });
    feedbackNotes = [];
    questionCounts = [];
  }
  const feedbackByPost = new Map<string, { helpful: number; needsWork: number }>();
  for (const item of feedbackNotes) {
    const current = feedbackByPost.get(item.postId) ?? { helpful: 0, needsWork: 0 };
    if (item.vote === "NEEDS_WORK") current.needsWork = item._count.vote;
    if (item.vote === "HELPFUL") current.helpful = item._count.vote;
    feedbackByPost.set(item.postId, current);
  }
  const questionsByPost = new Map(questionCounts.filter((item) => item.postId).map((item) => [item.postId as string, item._count.postId]));
  return posts.map((post) => {
    const blocks = Array.isArray(post.contentBlocks) ? post.contentBlocks as BlogBlock[] : [];
    const headings = blocks.filter((block) => block.type === "heading").length;
    const downloads = blocks.filter((block) => block.type === "download").length + post.downloads.length;
    const infoBlocks = blocks.filter((block) => block.type === "info").length;
    const words = String(post.contentText ?? "").split(/\s+/).filter(Boolean).length;
    const feedback = feedbackByPost.get(post.id) ?? { helpful: 0, needsWork: 0 };
    const issues = [
      words < 650 ? "Needs more depth" : "",
      headings < 3 ? "Needs clearer headings" : "",
      downloads < 1 ? "Add a checklist/download" : "",
      infoBlocks < 2 ? "Add FAQ or plain-English boxes" : "",
      feedback.needsWork > feedback.helpful ? "Readers asked for more detail" : "",
      (questionsByPost.get(post.id) ?? 0) > 0 ? "Reader questions waiting around this topic" : "",
    ].filter(Boolean);
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category?.name ?? "Uncategorised",
      words,
      headings,
      downloads,
      helpfulVotes: feedback.helpful,
      needsWorkVotes: feedback.needsWork,
      readerQuestions: questionsByPost.get(post.id) ?? 0,
      issues,
      score: Math.max(0, 100 - issues.length * 14 - Math.max(0, 650 - words) / 20),
    };
  }).filter((item) => item.issues.length).sort((a, b) => a.score - b.score).slice(0, 18);
}

export async function getBlogSitemapEntries() {
  const updatedAt = new Date("2026-07-26T00:00:00.000Z");
  return {
    posts: STARTER_ARTICLES.map((article) => ({ slug: article.slug, updatedAt })),
    categories: DEFAULT_CATEGORIES.map(([name]) => ({ slug: slugify(name), updatedAt })),
    authors: [{ slug: "houselink-editorial-team", updatedAt }],
    series: BLOG_SERIES.map((series) => ({ slug: series.slug, updatedAt })),
    hubs: BLOG_HUBS.map((hub) => ({ slug: hub.slug, updatedAt })),
  };
}

export async function getAdminBlogDashboard() {
  await ensureBlogDefaults();
  const prisma = getMainPrisma();
  const [posts, categories, authors, tags, engagement, questionData, contentGaps] = await Promise.all([
    prisma.blogPost.findMany({ include: blogIncludes(), orderBy: [{ updatedAt: "desc" }] }),
    prisma.blogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.blogAuthor.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.blogTag.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    getBlogEngagementDashboardData(prisma),
    getBlogReaderQuestionDashboardData(prisma),
    getBlogContentGaps(),
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
      commentQueue: engagement.commentQueue,
      approvedComments: engagement.approvedComments,
      helpfulVotes: engagement.helpfulVotes,
      needsWorkVotes: engagement.needsWorkVotes,
      readerQuestions: questionData.readerQuestions,
      newReaderQuestions: questionData.newReaderQuestions,
    },
    comments: engagement.comments,
    feedback: engagement.feedback,
    readerQuestions: questionData.questions,
    contentGaps,
    hubs: BLOG_HUBS,
    series: BLOG_SERIES,
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
  if (action === "bulk_posts") {
    const ids = arrayOfStrings(body.postIds).filter(Boolean).slice(0, 100);
    if (!ids.length) throw new Error("Select at least one article.");
    const operation = String(body.operation ?? "status");
    if (operation === "delete") {
      const result = await prisma.blogPost.deleteMany({ where: { id: { in: ids } } });
      await audit("blog.post.bulk_delete", "blog", actor.id, { ids, count: result.count });
      return result;
    }
    const status = enumValue(BlogPostStatus, body.status, BlogPostStatus.DRAFT);
    const result = await prisma.blogPost.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : undefined,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
        lastEditedById: actor.id,
      },
    });
    await audit("blog.post.bulk_status", "blog", actor.id, { ids, count: result.count, status });
    return result;
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
  if (action === "moderate_comment") {
    const commentId = required(body.commentId, "Comment");
    const status = ["APPROVED", "REJECTED", "SPAM"].includes(String(body.status)) ? String(body.status) : "PENDING";
    const comment = await prisma.blogComment.update({ where: { id: commentId }, data: { status }, include: { post: { select: { title: true, slug: true } }, parent: { select: { authorName: true, body: true } } } });
    await audit("blog.comment.moderate", comment.id, actor.id, { status, postId: comment.postId });
    return comment;
  }
  if (action === "update_comment") {
    const commentId = required(body.commentId, "Comment");
    const status = ["PENDING", "APPROVED", "REJECTED", "SPAM"].includes(String(body.status)) ? String(body.status) : undefined;
    const comment = await prisma.blogComment.update({
      where: { id: commentId },
      data: {
        authorName: clean(body.authorName).slice(0, 80) || undefined,
        authorEmail: stringOrNull(body.authorEmail)?.slice(0, 160) ?? null,
        body: clean(body.body).slice(0, 1800) || undefined,
        status,
      },
      include: { post: { select: { title: true, slug: true } }, parent: { select: { authorName: true, body: true } } },
    });
    await audit("blog.comment.update", comment.id, actor.id, { status: comment.status, postId: comment.postId });
    return comment;
  }
  if (action === "reply_comment") {
    const parent = await prisma.blogComment.findUnique({ where: { id: required(body.commentId, "Comment") }, include: { post: { select: { title: true, slug: true } } } });
    if (!parent) throw new Error("Comment not found.");
    const reply = await prisma.blogComment.create({
      data: {
        postId: parent.postId,
        parentId: parent.id,
        authorName: actor.name || "HouseLink Editorial Team",
        authorEmail: null,
        body: required(body.body, "Reply").slice(0, 1800),
        status: "APPROVED",
      },
      include: { post: { select: { title: true, slug: true } }, parent: { select: { authorName: true, body: true } } },
    });
    await audit("blog.comment.reply", reply.id, actor.id, { parentId: parent.id, postId: parent.postId });
    return reply;
  }
  if (action === "delete_comment") {
    const comment = await prisma.blogComment.delete({ where: { id: required(body.commentId, "Comment") } });
    await audit("blog.comment.delete", comment.id, actor.id, { postId: comment.postId });
    return comment;
  }
  if (action === "review_reader_question") {
    const status = ["NEW", "PLANNED", "ANSWERED", "ARCHIVED"].includes(String(body.status)) ? String(body.status) : "NEW";
    const question = await prisma.blogReaderQuestion.update({
      where: { id: required(body.questionId, "Reader question") },
      data: {
        status,
        adminNote: stringOrNull(body.adminNote),
        articleSlug: stringOrNull(body.articleSlug),
      },
      include: { post: { select: { title: true, slug: true } } },
    });
    await audit("blog.reader_question.review", question.id, actor.id, { status, articleSlug: question.articleSlug });
    return question;
  }
  if (action === "delete_reader_question") {
    const question = await prisma.blogReaderQuestion.delete({ where: { id: required(body.questionId, "Reader question") } });
    await audit("blog.reader_question.delete", question.id, actor.id, { status: question.status, postId: question.postId });
    return question;
  }
  if (action === "create_post_from_question") {
    const question = await prisma.blogReaderQuestion.findUnique({ where: { id: required(body.questionId, "Reader question") }, include: { post: { select: { categoryId: true, authorId: true } } } });
    if (!question) throw new Error("Reader question not found.");
    const title = clean(body.title) || question.question.slice(0, 90);
    const categoryId = stringOrNull(body.categoryId) ?? question.post?.categoryId ?? null;
    const authorId = stringOrNull(body.authorId) ?? question.post?.authorId ?? null;
    const post = await prisma.blogPost.create({
      data: {
        title,
        slug: await uniqueSlug(title),
        excerpt: `HouseLink answers a reader question: ${question.question}`.slice(0, 320),
        status: BlogPostStatus.DRAFT,
        layout: BlogArticleLayout.PROPERTY_GUIDE,
        categoryId,
        authorId,
        contentBlocks: [
          { type: "heading", level: 2, text: "Reader question" },
          { type: "quote", text: question.question, cite: question.name },
          { type: "heading", level: 2, text: "HouseLink answer" },
          { type: "paragraph", text: "Add a practical, plain-English answer for this reader question." },
          { type: "cta", variant: "search" },
        ] as Prisma.InputJsonValue,
        contentText: `${question.question} Add a practical, plain-English answer for this reader question.`,
        focusKeyword: question.question.split(/\s+/).slice(0, 5).join(" "),
        secondaryKeywords: ["Ask HouseLink", "Zimbabwe property questions"],
        createdById: actor.id,
        lastEditedById: actor.id,
        searchVector: `${title} ${question.question}`,
      },
      include: blogIncludes(),
    });
    await prisma.blogReaderQuestion.update({ where: { id: question.id }, data: { status: "PLANNED", articleSlug: post.slug, adminNote: `Draft created: /blog/${post.slug}` } });
    await audit("blog.reader_question.create_post", post.id, actor.id, { questionId: question.id });
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
  if (action === "merge_category") {
    const sourceId = required(body.sourceId, "Source category");
    const targetId = required(body.targetId, "Target category");
    if (sourceId === targetId) throw new Error("Choose a different target category.");
    const [source, target] = await Promise.all([
      prisma.blogCategory.findUnique({ where: { id: sourceId } }),
      prisma.blogCategory.findUnique({ where: { id: targetId } }),
    ]);
    if (!source || !target) throw new Error("Category not found.");
    const moved = await prisma.blogPost.updateMany({ where: { categoryId: sourceId }, data: { categoryId: targetId, lastEditedById: actor.id } });
    await prisma.blogCategory.update({ where: { id: sourceId }, data: { active: false, slug: await uniqueTaxonomySlug("category", `${source.slug}-merged`) } });
    await audit("blog.category.merge", targetId, actor.id, { sourceId, source: source.name, target: target.name, moved: moved.count });
    return { moved: moved.count, source, target };
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
  if (action === "delete_author") {
    const saved = await prisma.blogAuthor.update({ where: { id: String(body.authorId) }, data: { active: false } });
    await audit("blog.author.delete", saved.id, actor.id, { name: saved.name });
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
  if (action === "delete_tag") {
    const saved = await prisma.blogTag.update({ where: { id: String(body.tagId) }, data: { active: false } });
    await audit("blog.tag.delete", saved.id, actor.id, { name: saved.name });
    return saved;
  }
  if (action === "merge_tag") {
    const sourceId = required(body.sourceId, "Source tag");
    const targetId = required(body.targetId, "Target tag");
    if (sourceId === targetId) throw new Error("Choose a different target tag.");
    const [source, target, posts] = await Promise.all([
      prisma.blogTag.findUnique({ where: { id: sourceId } }),
      prisma.blogTag.findUnique({ where: { id: targetId } }),
      prisma.blogPost.findMany({ where: { tags: { some: { id: sourceId } } }, select: { id: true, tags: { select: { id: true } } } }),
    ]);
    if (!source || !target) throw new Error("Tag not found.");
    for (const post of posts) {
      const tagIds = Array.from(new Set(post.tags.map((tag) => tag.id).filter((id) => id !== sourceId).concat(targetId)));
      await prisma.blogPost.update({ where: { id: post.id }, data: { tags: { set: tagIds.map((id) => ({ id })) }, lastEditedById: actor.id } });
    }
    await prisma.blogTag.update({ where: { id: sourceId }, data: { active: false, slug: await uniqueTaxonomySlug("tag", `${source.slug}-merged`) } });
    await audit("blog.tag.merge", targetId, actor.id, { sourceId, source: source.name, target: target.name, moved: posts.length });
    return { moved: posts.length, source, target };
  }
  return null;
}

function blogIncludes() {
  return { category: true, author: true, tags: true } satisfies Prisma.BlogPostInclude;
}

function logBlogFallback(area: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const databaseUnavailable = code === "P1001" || /can't reach database server/i.test(message);
  if (databaseUnavailable) {
    console.warn(`Blog database unavailable; using starter blog ${area} fallback.`);
    return;
  }
  console.warn(`Falling back to starter blog ${area}`, error);
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
    tags: arrayOfTagNames(input.tags),
    searchVector: `${title} ${input.excerpt ?? ""} ${contentText} ${arrayOfTagNames(input.tags).join(" ")}`.slice(0, 12000),
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

async function uniqueTaxonomySlug(kind: "category" | "tag", base: string) {
  const prisma = getMainPrisma();
  let slug = slugify(base);
  let index = 2;
  const exists = (value: string) => kind === "category"
    ? prisma.blogCategory.findUnique({ where: { slug: value } })
    : prisma.blogTag.findUnique({ where: { slug: value } });
  while (await exists(slug)) {
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

function arrayOfTagNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === "object" && item !== null && "name" in item ? clean((item as { name?: unknown }).name) : clean(item))
      .filter(Boolean);
  }
  return arrayOfStrings(value);
}

function enumValue<T extends Record<string, string>>(source: T, value: unknown, fallback: T[keyof T]) {
  const candidate = String(value ?? "");
  return Object.values(source).includes(candidate) ? candidate as T[keyof T] : fallback;
}

function estimateReadTime(text: string) {
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 220));
}
