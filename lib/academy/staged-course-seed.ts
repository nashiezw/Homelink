import { readFile } from "fs/promises";
import path from "path";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { ACADEMY_FULL_MANUAL_URL } from "@/lib/academy/academy-constants";
import { ACADEMY_PROGRAMME_COURSES, LEGACY_COURSE_ID } from "@/lib/academy/academy-programme";
import { lessonHandoutStoragePath } from "@/lib/academy/lesson-handouts";
import {
  RECERTIFICATION_REQUIREMENTS,
  SPECIALISATION_TRACKS,
} from "@/lib/academy/academy-excellence";

const MANIFEST_PATH = path.join(process.cwd(), "public", "uploads", "academy", "academy-resources-manifest.json");

type ManifestItem = {
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  sourceCategory?: string;
  category: string;
};

type LessonSeed = {
  title: string;
  stage: "Beginner" | "Intermediate" | "Advanced" | "Professional Kit";
  summary: string;
  richText: string;
  objectives: string[];
  estimatedMinutes: number;
  videoUrl?: string;
  embeddedVideoUrl?: string;
  completionRequirement?: string;
  resourceTitles?: string[];
  discussionPrompt?: string;
};

type ModuleSeed = {
  title: string;
  stage: LessonSeed["stage"];
  description: string;
  objectives: string[];
  lessons: LessonSeed[];
};

function practicalLesson(sections: Array<{ heading: string; body: string }>) {
  return sections
    .map((section) => `<p><strong>${section.heading}</strong></p><p>${section.body}</p>`)
    .join("");
}

function inDepthLesson(lesson: {
  title: string;
  summary: string;
  richText: string;
  objectives: string[];
  resourceTitles?: string[];
  discussionPrompt?: string;
}) {
  const title = lesson.title.toLowerCase();
  const mode = /listing|appraisal|cma|marketing|photo|property/.test(title)
    ? "listing"
    : /client|buyer|tenant|viewing|offer|negotiation|qualification/.test(title)
      ? "client"
      : /document|legal|compliance|contract|confidential|deed|cession|lease|mandate|risk/.test(title)
        ? "compliance"
        : /prospecting|pipeline|performance|career|routine|kpi|reputation|specialisation|recertification|portfolio/.test(title)
          ? "performance"
          : "foundation";

  const depth = lessonSpecificDepth(lesson, mode);
  const objectives = lesson.objectives.map((item) => `<li>${item}</li>`).join("");
  const resources = (lesson.resourceTitles ?? []).slice(0, 5).map((item) => `<li>${item}</li>`).join("");
  const prompt = lesson.discussionPrompt
    ? `<h3>Coach's reflection</h3><p>${lesson.discussionPrompt}</p>`
    : `<h3>Coach's reflection</h3><p>Write three decisions this lesson would change in your next client conversation, listing file, or follow-up routine.</p>`;

  return [
    `<h2>${lesson.title}</h2>`,
    `<p>${lesson.summary}</p>`,
    lesson.richText,
    `<h3>Why this matters in Zimbabwe</h3><p>${depth.market}</p>`,
    `<h3>Professional operating standard</h3><p>${depth.standard}</p>`,
    `<ul>${depth.checklist.map((item) => `<li>${item}</li>`).join("")}</ul>`,
    `<h3>Field example</h3><p>${depth.example}</p>`,
    `<h3>What to practise</h3><p>${depth.practice}</p>`,
    resources ? `<h3>Tools to use in this lesson</h3><ul>${resources}</ul>` : "",
    `<h3>Learning outcomes</h3><ul>${objectives}</ul>`,
    prompt,
  ].filter(Boolean).join("");
}

const lessonDepthByMode = {
  foundation: {
    market: "Zimbabwe property clients often deal with incomplete information, fast-moving WhatsApp enquiries, informal referrals, and uneven document quality. A trained HouseLink agent creates order: verified facts, clear next steps, written records, and calm guidance before anyone is asked to trust a listing or decision.",
    standard: "Do not treat the lesson as theory. Turn it into a repeatable field habit: what to verify, what to write down, what to explain, what to refuse, and what to escalate. A premium agent is measured by consistency under pressure.",
    checklist: [
      "Identify the client, property, decision, risk, and next action before advising.",
      "Separate confirmed facts from assumptions or hearsay.",
      "Record material conversations in a file note or approved tracker.",
      "Escalate legal, safety, payment, or authority questions before proceeding.",
    ],
    example: "A new client asks for quick advice before you know the exact suburb, authority to market, price history, or document status. Instead of guessing, you explain what is missing, ask focused questions, and give a clear next step that protects both the client and HouseLink.",
    practice: "Create a one-page field note for this lesson. Include the facts you would verify, the client wording you would use, the record you would keep, and the point where you would escalate to a senior agent or admin.",
  },
  listing: {
    market: "A listing is often the first proof of professionalism a client sees. In Zimbabwe, price, water, power, access, title confidence, road condition, photos, and hidden costs can change the decision. Thin listings waste time and damage marketplace trust.",
    standard: "A HouseLink listing should be accurate enough for a serious client to decide whether to enquire, view, shortlist, negotiate, or walk away. Every important claim must be supported by a source: owner instruction, inspection note, photo, document, comparable, or written confirmation.",
    checklist: [
      "Confirm authority, price, availability, location, access, services, defects, and restrictions.",
      "Use evidence when discussing price; avoid flattering guesses.",
      "Write descriptions that answer real buyer or tenant questions.",
      "Update stale listings quickly when price, availability, or condition changes.",
    ],
    example: "A seller wants a high asking price because a neighbour advertised higher. You compare location, land size, finishes, water reliability, title status, and time on market, then explain a defendable range and the risk of launching too high.",
    practice: "Audit one listing against this lesson. Rewrite the description, list missing facts, identify weak photos, prepare three client questions, and note what must be verified before publishing.",
  },
  client: {
    market: "Clients may be emotional, rushed, budget-sensitive, or unclear about documents. A top agent slows the process just enough to qualify needs, protect safety, and keep momentum without creating pressure or confusion.",
    standard: "Every serious enquiry needs a documented brief. Record budget, area, timing, must-haves, decision makers, payment readiness, documents needed, viewing feedback, objections, and next action. Good service is both warm and traceable.",
    checklist: [
      "Qualify before recommending too many options.",
      "Confirm viewing logistics, identity expectations, and safety rules.",
      "Summarise calls and viewings in writing.",
      "Keep negotiation neutral and document all material terms.",
    ],
    example: "A tenant says they can pay today if you reserve the property. You still confirm the landlord instruction, viewing status, deposit terms, lease requirements, identity documents, and payment channel before allowing urgency to drive the process.",
    practice: "Write a short WhatsApp or call script for this lesson. Include the opening, qualifying questions, risk check, recommended next step, and follow-up message after the client responds.",
  },
  compliance: {
    market: "The biggest property losses often begin with small document gaps: unclear authority, missing signatures, rushed deposits, inconsistent names, estate complications, or verbal promises no one recorded. Agents must recognise these issues early.",
    standard: "Your role is not to give legal advice. Your role is to collect complete information, explain process in plain language, protect confidential data, document instructions, and pause or escalate when the file is not safe.",
    checklist: [
      "Check names, IDs, authority, signatures, dates, property references, amounts, and payment instructions.",
      "Keep client files audit-ready and avoid scattered private-chat records.",
      "Mask or protect confidential data when submitting portfolio evidence.",
      "Escalate unusual ownership, estate, company, boundary, or payment situations.",
    ],
    example: "A person with keys wants you to advertise urgently, but the owner name on available paperwork is different. A professional agent pauses marketing, records the mismatch, requests authority evidence, and escalates before exposing clients to risk.",
    practice: "Build a risk note for one document scenario. State the red flag, evidence requested, who you escalated to, what action is paused, and the client wording you would use.",
  },
  performance: {
    market: "A strong agent is not built by motivation alone. Performance comes from routines: prospecting, listing quality, response speed, follow-up, document discipline, market learning, reviews, and honest self-correction.",
    standard: "Use numbers to coach yourself. Track leads, qualified conversations, appointments, listings won, viewings, offers, closed deals, response times, document gaps, and client feedback. Improve one bottleneck at a time.",
    checklist: [
      "Plan daily prospecting and follow-up blocks before reactive work begins.",
      "Review pipeline and KPIs weekly.",
      "Keep a portfolio of corrected work, not only successful work.",
      "Build a niche where your local knowledge becomes hard to replace.",
    ],
    example: "Your lead count is high but viewings are low. Instead of blaming the market, you review enquiry qualification, listing fit, response time, and follow-up quality, then set a 30-day improvement plan with one measurable habit.",
    practice: "Create a 30-day improvement plan. Include the metric you will improve, the daily habit required, the tool you will use, and the review date with a mentor or branch lead.",
  },
};

function lessonSpecificDepth(
  lesson: {
    title: string;
    summary: string;
    objectives: string[];
    resourceTitles?: string[];
  },
  mode: keyof typeof lessonDepthByMode,
) {
  const base = lessonDepthByMode[mode];
  const title = lesson.title;
  const titleLower = title.toLowerCase();
  const objectiveText = lesson.objectives.slice(0, 2).join(" and ").toLowerCase();
  const toolText = lesson.resourceTitles?.length
    ? ` Use ${lesson.resourceTitles.slice(0, 3).join(", ")} as the working evidence for this lesson.`
    : "";

  if (/welcome|orientation|academy/.test(titleLower)) {
    return {
      market: `${title} matters because learners need to understand the HouseLink promise before they touch real clients: verified information, safer transactions, disciplined communication, and market-specific judgement for Zimbabwe property work.`,
      standard: `By the end of this lesson, the learner should be able to ${objectiveText || "explain the HouseLink Academy pathway"} without sounding vague. The standard is simple: know the pathway, know the evidence expected, and know what behaviour HouseLink will not tolerate.`,
      checklist: [
        "Explain the HouseLink promise in one clear client-friendly sentence.",
        "Identify the next course action: lesson, toolkit, quiz, assignment, or certificate requirement.",
        "Describe what evidence proves progress instead of relying on attendance alone.",
        "Commit to written records, respectful communication, and escalation when facts are missing.",
      ],
      example: "A new learner receives a landlord enquiry before completing training. The correct response is not to improvise as an expert, but to use the HouseLink workflow, ask for the required facts, and seek mentor guidance before advising.",
      practice: "Write your personal HouseLink operating promise in five lines: who you serve, what you verify, how you communicate, what you record, and when you escalate.",
    };
  }

  if (/goal|career|90|professional readiness|routine/.test(titleLower)) {
    return {
      market: `${title} is practical because Zimbabwe property agents are judged by daily reliability, not motivational language. Clients remember who followed up, who verified facts, and who kept calm when a deal became messy.`,
      standard: "Turn this lesson into a measurable work rhythm: prospecting blocks, follow-up times, listing checks, document review, client updates, and weekly pipeline review. A top agent can show the work, not only describe ambition.",
      checklist: [
        "Set weekly targets for qualified conversations, listings reviewed, viewings, follow-ups, and portfolio evidence.",
        "Record what happened, what changed, who must act next, and by when.",
        "Review one weak point every week and choose one corrective habit.",
        "Keep a portfolio of corrected work as well as successful work.",
      ],
      example: "An agent has many WhatsApp enquiries but few viewings. Instead of blaming the market, they audit response time, qualification questions, listing fit, and follow-up discipline, then fix one bottleneck for 30 days.",
      practice: "Create a 30-day agent scoreboard with five metrics and one weekly review question your mentor could use to coach you.",
    };
  }

  if (/market|area|neighbourhood|infrastructure|value|pricing|cma|appraisal/.test(titleLower)) {
    return {
      market: `${title} needs Zimbabwe-specific judgement because value changes with water reliability, power, road access, schools, security, title confidence, transport, internet, and nearby development. Generic price talk is not enough.`,
      standard: "Support every value opinion with evidence: comparable listings, recent client feedback, condition notes, location trade-offs, infrastructure realities, and documented assumptions. Do not present a price as certain when the file only supports a range.",
      checklist: [
        "List the local value drivers that affect this specific property type.",
        "Separate confirmed comparables from weak or outdated examples.",
        "Document assumptions behind the recommended price or rental range.",
        "Explain the risk of overpricing, underpricing, or hiding local constraints.",
      ],
      example: "Two homes have similar bedrooms, but one has better road access, stronger water supply, and cleaner documentation. A trained agent explains those differences before recommending a price range.",
      practice: "Build a mini market note for one suburb: three comparables, three value drivers, two risks, and one pricing recommendation you can defend.",
    };
  }

  if (/photo|description|advert|marketing|listing quality/.test(titleLower)) {
    return {
      market: `${title} affects trust immediately. Zimbabwe clients often decide whether to enquire from photos, price clarity, location confidence, and whether the description answers practical questions before a viewing.`,
      standard: "A listing should help a serious client self-qualify. Include truthful photos, accurate features, costs, access details, defects, availability, restrictions, and the next step. Never let attractive wording cover missing facts.",
      checklist: [
        "Capture honest photos of key rooms, exterior, access, bathrooms, kitchen, parking, and defects.",
        "Write facts before adjectives: size, rooms, utilities, condition, costs, location, and restrictions.",
        "Confirm availability and authority before publishing.",
        "Update the listing when price, condition, availability, or landlord instruction changes.",
      ],
      example: "A flat looks attractive online but has limited parking and unreliable water. A strong listing states those facts clearly so the right client enquires and the wrong client does not waste time.",
      practice: "Rewrite one weak listing into a client-ready version with verified facts, missing questions, photo checklist, and a short viewing script.",
    };
  }

  if (/viewing|client|tenant|buyer|lead|qualification|enquiry/.test(titleLower)) {
    return {
      market: `${title} matters because property enquiries in Zimbabwe often arrive fast, informal, and incomplete. A professional agent must qualify without sounding cold and protect everyone before arranging access.`,
      standard: "Every serious client interaction should produce a usable brief: identity context, budget, area, timing, decision makers, documents needed, viewing plan, risks, and next action.",
      checklist: [
        "Ask focused qualification questions before sending many options.",
        "Confirm viewing time, access, safety expectations, and who will attend.",
        "Summarise the conversation in writing after important calls or viewings.",
        "Pause if payment, identity, authority, or safety details are unclear.",
      ],
      example: "A tenant says they can pay today. The agent still confirms documents, viewing status, landlord terms, payment channel, and lease process before allowing urgency to drive the decision.",
      practice: "Write a five-message WhatsApp flow: greeting, qualification, recommended option, viewing confirmation, and post-viewing follow-up.",
    };
  }

  if (/offer|negotiation|objection|close|deal/.test(titleLower)) {
    return {
      market: `${title} requires discipline because negotiation can become emotional, rushed, or undocumented. HouseLink agents protect trust by keeping terms clear and separating facts from pressure.`,
      standard: "Document offer terms, deadlines, conditions, counter-offers, accepted items, rejected items, and who approved each step. Stay neutral; your job is to guide the process, not manipulate either side.",
      checklist: [
        "Confirm all material terms in writing before presenting an offer.",
        "Separate client preference from legal, payment, or documentation requirements.",
        "Record counter-offers and deadlines accurately.",
        "Escalate unusual clauses, payment risks, or disputes before closing.",
      ],
      example: "A buyer wants a discount because repairs are needed. The agent documents the repair evidence, presents the request neutrally, and records the seller's response instead of arguing from opinion.",
      practice: "Draft an offer summary template with price, conditions, deadline, evidence, client wording, and escalation triggers.",
    };
  }

  if (/legal|document|mandate|compliance|confidential|risk|fraud|safety|lease|contract/.test(titleLower)) {
    return {
      market: `${title} is high-stakes because many property problems begin with small document gaps: unclear authority, inconsistent names, rushed deposits, verbal promises, or payment details that are not verified.`,
      standard: "Collect complete information, protect confidential data, explain process clearly, and pause when authority, identity, payment, or legal meaning is uncertain. Do not give legal advice beyond your role.",
      checklist: [
        "Check names, IDs, authority, signatures, dates, amounts, property references, and payment instructions.",
        "Keep audit-ready notes instead of scattered private-chat promises.",
        "Protect personal documents when submitting evidence.",
        "Escalate ownership, estate, company, boundary, or payment concerns.",
      ],
      example: "A person with keys wants urgent marketing, but paperwork names someone else. A trained agent pauses publication, records the mismatch, requests authority evidence, and escalates before exposing clients to risk.",
      practice: "Write a risk note for one document problem: red flag, evidence requested, action paused, escalation route, and client wording.",
    };
  }

  return {
    market: `${title} matters in the Zimbabwe property market because ${lesson.summary.charAt(0).toLowerCase()}${lesson.summary.slice(1)} The learner must connect the concept to real client decisions, not only remember theory.`,
    standard: `${base.standard}${toolText}`,
    checklist: base.checklist,
    example: `${base.example} In this lesson, the agent should specifically show how the topic changes what they verify, what they record, and what they tell the client next.`,
    practice: `${base.practice}${toolText}`,
  };
}

export const modules: ModuleSeed[] = [
  {
    title: "Introduction to the HouseLink Zimbabwe Standard",
    stage: "Beginner",
    description: "Orientation to HouseLink, professional expectations, and how to use the Academy programme.",
    objectives: ["Understand HouseLink's mission and your role", "Navigate the Academy and resource kit", "Set professional development goals"],
    lessons: [
      {
        title: "Welcome to HouseLink Zimbabwe",
        stage: "Beginner",
        summary: "Your official entry into the HouseLink agent community and Zimbabwe's premium property marketplace.",
        richText: `<p>Welcome to HouseLink Zimbabwe — a marketplace built on trust, verified listings, and professional agent standards. As an agent, you represent both your clients and the HouseLink brand in every conversation, viewing, and transaction.</p><p>This programme is structured in stages: <strong>Beginner</strong>, <strong>Intermediate</strong>, and <strong>Advanced</strong>, so you build confidence step by step rather than trying to absorb everything at once.</p><p>Complete each lesson in order, download the branded tools provided, and apply them in the field before moving to the next stage.</p>`,
        objectives: ["Explain HouseLink's role in Zimbabwe property", "Describe the staged training pathway", "Commit to professional conduct standards"],
        estimatedMinutes: 20,
        discussionPrompt: "What motivated you to join HouseLink, and what does professional success look like for you in the next 90 days?",
      },
      {
        title: "How to use this Academy",
        stage: "Beginner",
        summary: "How to progress through modules, use branded downloads, and track your HouseLink certificate path.",
        richText: `<p>Each lesson includes reading material, practical downloads, and checkpoints. Branded PDFs in this Academy are print-ready HouseLink resources — forms, checklists, and planners — not generic placeholders.</p><p>Use <strong>Continue learning</strong> on your dashboard to resume where you left off. Bookmark lessons you want to revisit. The full training manual is available once in the Resource Library for reference — individual lessons link only to the tools you need for that topic.</p><p>Quizzes and assignments appear at stage checkpoints. Pass marks and certificates are tracked in your learner dashboard.</p>`,
        objectives: ["Navigate the learner dashboard", "Use lesson downloads correctly", "Understand quiz and certificate requirements"],
        estimatedMinutes: 15,
        resourceTitles: ["Agent Daily Workflow"],
      },
      {
        title: "Your journey to becoming a professional agent",
        stage: "Beginner",
        summary: "Set goals and routines for a sustainable, ethical real estate career with HouseLink.",
        richText: `<h2>What professional readiness means</h2><p>Top agents combine daily discipline with client care. Your journey starts with honest communication, accurate records, verified facts, and consistent follow-through. A certificate is only valuable when it is backed by habits clients can feel in every enquiry, viewing, negotiation, and follow-up.</p><p>In Zimbabwe's property market, trust is built through clarity. Clients want to know whether the property is real, whether the price is fair, whether the person marketing it has authority, and whether their money and documents are safe. Your role is to reduce confusion and help people make better decisions.</p><h3>Your 90-day operating plan</h3><ul><li>Set a weekly prospecting target for landlords, sellers, buyers, tenants, and referral partners.</li><li>Track every enquiry, viewing, objection, offer, landlord instruction, and follow-up date.</li><li>Choose two skills to improve first: listing quality, qualification, negotiation, documentation, local area knowledge, or closing discipline.</li><li>Review your pipeline every week and adjust your activity using evidence, not mood.</li></ul><h3>The HouseLink professional standard</h3><p>HouseLink expects every agent to protect client confidentiality, represent properties accurately, communicate delays early, and escalate legal, safety, payment, or documentation issues through proper channels.</p><blockquote>Professionalism is visible in small decisions: what you verify, what you write down, what you refuse to guess, and how quickly you correct bad information.</blockquote><h3>Field practice</h3><p>Use the Personal Goal Planner to define income targets, skill milestones, weekly activity goals, and the evidence you will keep. Then complete the Weekly Performance Review after your first week of outreach so you can compare your plan with real pipeline data.</p>`,
        objectives: ["Set 90-day professional goals", "Adopt weekly review habits", "Identify your first skill priorities"],
        estimatedMinutes: 25,
        resourceTitles: ["Personal Goal Planner", "Weekly Performance Review"],
      },
    ],
  },
  {
    title: "Foundations of Real Estate",
    stage: "Beginner",
    description: "Industry basics, agent duties, ethics, terminology, and your first knowledge checkpoint.",
    objectives: ["Master core real estate concepts", "Apply HouseLink ethics in daily work", "Pass the foundations knowledge check"],
    lessons: [
      {
        title: "Understanding the real estate industry",
        stage: "Beginner",
        summary: "How sales, lettings, and property management work in Zimbabwe's market context.",
        richText: `<p>Real estate in Zimbabwe spans residential sales, rentals, commercial property, and land. Agents connect owners, buyers, tenants, and landlords while managing documentation, viewings, and negotiations.</p><p>Success depends on market knowledge, reliable data, and professional networks — not pressure tactics. HouseLink gives you a verified platform; your job is to add local expertise and trustworthy service.</p>`,
        objectives: ["Describe key market segments", "Explain the agent's place in a transaction", "Identify HouseLink's marketplace advantages"],
        estimatedMinutes: 30,
      },
      {
        title: "Role, duties and responsibilities of a professional agent",
        stage: "Beginner",
        summary: "What clients and HouseLink expect from you every day.",
        richText: `<p>Your duties include accurate listing information, timely communication, safe viewings, proper documentation, and transparent fee discussions. You must never misrepresent availability, price, or property condition.</p><p>Document every material conversation and keep client files complete. When in doubt, ask a senior agent or HouseLink admin before proceeding.</p>`,
        objectives: ["List core agent duties", "Document client interactions properly", "Recognise when to escalate"],
        estimatedMinutes: 35,
        resourceTitles: ["Client Information Sheet"],
      },
      {
        title: "Professional ethics, conduct and customer service",
        stage: "Beginner",
        summary: "Ethical standards that protect clients, HouseLink, and your reputation.",
        richText: `<p>Ethical conduct means honesty, confidentiality, fair dealing, and respect — especially under pressure. Never share one client's details with another without consent. Never guarantee outcomes you cannot control.</p><p>Customer service on HouseLink is responsive, clear, and solution-focused. Acknowledge messages promptly, confirm appointments in writing, and follow up after every viewing.</p>`,
        objectives: ["Apply HouseLink ethics checklist", "Handle confidential information safely", "Deliver consistent client communication"],
        estimatedMinutes: 30,
      },
      {
        title: "Essential real estate terminology",
        stage: "Beginner",
        summary: "Key terms for sales, lettings, offers, and compliance conversations.",
        richText: `<p>Fluency in industry language builds client confidence. Know the difference between mandate types, deposit vs. bond, lease vs. licence, and sole vs. open mandate.</p><p>When explaining terms to clients, use plain language first, then confirm understanding. Keep a personal glossary and add local practice notes as you gain experience.</p>`,
        objectives: ["Define 15+ core terms accurately", "Explain terms clearly to clients", "Avoid common terminology mistakes"],
        estimatedMinutes: 25,
      },
      {
        title: "Zimbabwe property law awareness for agents",
        stage: "Beginner",
        summary: "Know the legal topics an agent must recognise, explain carefully, and escalate to qualified professionals.",
        richText: practicalLesson([
          {
            heading: "What agents must know",
            body: "Professional agents do not give legal advice, but they must recognise the legal themes that shape Zimbabwe property transactions: ownership authority, mandate terms, leases, offers, deposits, rates, transfer processes, and client identity records. Your role is to explain process, gather complete information, and refer legal interpretation to qualified professionals.",
          },
          {
            heading: "Risk signals",
            body: "Pause and escalate when a seller cannot prove authority, a landlord wants cash-only arrangements without records, a deceased estate is involved, signatures are missing, boundaries are disputed, or a client asks you to ignore document gaps. A professional agent protects the transaction before speed.",
          },
          {
            heading: "Field standard",
            body: "For every serious client, keep a record of who gave instructions, what authority they claimed, what documents were reviewed, and what matters were referred. This habit keeps HouseLink files audit-ready and helps learners understand where an agent's role ends.",
          },
        ]),
        objectives: ["Recognise common legal risk areas", "Explain process without giving legal advice", "Know when to escalate to admin or legal professionals"],
        estimatedMinutes: 40,
        resourceTitles: ["Compliance Checklist", "Document Submission Checklist"],
      },
      {
        title: "Verification, trust and scam prevention basics",
        stage: "Beginner",
        summary: "Protect clients from false listings, unauthorised instructions, and unsafe transaction shortcuts.",
        richText: practicalLesson([
          {
            heading: "Trust is the product",
            body: "A property platform becomes valuable when people believe the listings, agents, and process are reliable. Your daily verification habits are part of HouseLink's market reputation.",
          },
          {
            heading: "Minimum verification routine",
            body: "Confirm the person giving instructions, property access arrangements, price, availability, location, condition, and any known defects before advertising. For rentals, confirm who receives payments and what documentation supports the arrangement. For sales, check owner authority and escalate anything unusual.",
          },
          {
            heading: "Practice drill",
            body: "Review three sample enquiries or listings. Mark each as ready, incomplete, or high-risk, then write the exact follow-up question you would ask before proceeding.",
          },
        ]),
        objectives: ["Spot incomplete or suspicious listing instructions", "Ask verification questions before publishing", "Protect clients from unsafe shortcuts"],
        estimatedMinutes: 35,
        resourceTitles: ["File Checklist", "Compliance Checklist", "Client Information Sheet"],
        discussionPrompt: "What verification step is most often skipped by new agents, and what could go wrong if it is missed?",
      },
      {
        title: "Chapter 1 knowledge check and practical assessment",
        stage: "Beginner",
        summary: "Consolidate foundations and complete the Chapter 1 quiz.",
        richText: `<p>Review modules one and two before attempting the knowledge check. Focus on duties, ethics, terminology, and client communication scenarios.</p><p>After passing the quiz, complete any pending downloads and note areas for field practice with your mentor or branch lead.</p>`,
        objectives: ["Pass the Chapter 1 knowledge check", "Identify gaps for field practice", "Prepare for Intermediate stage"],
        estimatedMinutes: 40,
        completionRequirement: "QUIZ",
      },
    ],
  },
  {
    title: "Prospecting, Listings and Property Marketing",
    stage: "Intermediate",
    description: "Generate business, win listings, capture quality data, and market properties professionally.",
    objectives: ["Run a daily prospecting routine", "Publish compliant listings", "Use HouseLink marketing tools"],
    lessons: [
      {
        title: "Prospecting and daily business generation",
        stage: "Intermediate",
        summary: "Build a predictable pipeline with structured daily activity.",
        richText: `<p>Prospecting is disciplined outreach: calls, follow-ups, referrals, and community visibility. Plan targets daily and log every lead in your tracker.</p><p>Use the Daily Activity Planner and Lead Tracking Sheet to stay accountable. Consistency beats occasional bursts of activity.</p>`,
        objectives: ["Plan daily prospecting blocks", "Log leads systematically", "Measure weekly activity KPIs"],
        estimatedMinutes: 35,
        resourceTitles: ["Daily Activity Planner", "Lead Tracking Sheet", "Cold Calling Scripts", "Telephone Scripts"],
      },
      {
        title: "Winning listings and conducting property appraisals",
        stage: "Intermediate",
        summary: "Present professionally, appraise accurately, and secure mandates.",
        richText: `<p>Listing presentations should demonstrate market knowledge, marketing plan, and HouseLink's reach. Appraisals must be evidence-based — comparable sales, condition, location, and demand.</p><p>Complete the Property Appraisal Form on every serious listing appointment and attach photos where possible.</p>`,
        objectives: ["Structure a listing presentation", "Complete appraisal documentation", "Handle common vendor objections"],
        estimatedMinutes: 40,
        resourceTitles: ["Property Appraisal Form", "Listing Agreement Template", "Objection Handling Guide"],
      },
      {
        title: "Comparative Market Analysis pricing workshop",
        stage: "Intermediate",
        summary: "Build a defendable price opinion from comparable listings, location, condition, urgency, and demand.",
        richText: practicalLesson([
          {
            heading: "Why pricing skill matters",
            body: "Overpricing wins temporary approval but loses time, trust, and buyer attention. Underpricing creates disputes and reputational damage. A top agent explains price with evidence and helps the client choose a strategy, not a guess.",
          },
          {
            heading: "CMA method",
            body: "Collect at least three comparable properties, adjust for location, land size, improvements, condition, urgency, and features, then write a price range with reasons. Separate facts from assumptions and note where data is weak.",
          },
          {
            heading: "Workshop output",
            body: "Complete a Property Appraisal Form for a real or practice property. Include comparables, recommended range, listing strategy, likely objections, and the conversation you would have if the owner insists on a higher price.",
          },
        ]),
        objectives: ["Prepare a basic CMA", "Defend a pricing recommendation with evidence", "Handle unrealistic owner price expectations"],
        estimatedMinutes: 60,
        completionRequirement: "ASSIGNMENT",
        resourceTitles: ["Property Appraisal Form", "Objection Handling Guide", "Listing Agreement Template", "Overpriced Seller CMA Case File"],
        discussionPrompt: "How would you explain a lower-than-expected valuation to a seller without damaging trust?",
      },
      {
        title: "Collecting accurate listing information",
        stage: "Intermediate",
        summary: "Capture complete, verified property details before publishing.",
        richText: `<p>Incomplete listings damage trust and waste buyer time. Verify ownership authority, pricing, availability, keys/access, utilities, and material defects before go-live.</p><p>Use the Property Listing Form and File Checklist together — nothing goes to market until both are satisfied.</p>`,
        objectives: ["Verify listing authority and facts", "Complete listing forms accurately", "Apply file checklist before submission"],
        estimatedMinutes: 35,
        resourceTitles: ["Property Listing Form", "File Checklist", "Property Inspection Checklist"],
      },
      {
        title: "Property photography, descriptions and marketing channels",
        stage: "Intermediate",
        summary: "Present properties at a premium standard across HouseLink and social channels.",
        richText: `<p>Photography should be bright, straight, and honest — no misleading angles. Descriptions must highlight features without exaggeration.</p><p>Follow the Property Photography and Marketing checklists. Use WhatsApp and social templates for consistent HouseLink-branded outreach.</p>`,
        objectives: ["Apply photography standards", "Write accurate descriptions", "Execute multi-channel marketing"],
        estimatedMinutes: 40,
        resourceTitles: ["Property Photography Checklist", "Property Marketing Checklist", "Property Description Template", "WhatsApp Marketing Templates", "Social Media Content Planner"],
      },
      {
        title: "Listing presentation and objection handling simulation",
        stage: "Intermediate",
        summary: "Practise the conversation that turns a property owner into a committed, well-informed client.",
        richText: practicalLesson([
          {
            heading: "Presentation structure",
            body: "Open by confirming the owner's goals, timeline, and concerns. Present market evidence, explain HouseLink's marketing process, agree documentation requirements, then confirm next actions in writing.",
          },
          {
            heading: "Common objections",
            body: "Expect questions about commission, price, exclusivity, speed, advertising reach, and whether another agent can do it cheaper. Strong agents answer calmly with evidence, process clarity, and service value.",
          },
          {
            heading: "Simulation",
            body: "Record or script a five-minute listing presentation. Include one price objection, one commission objection, and one document request. Submit the script or roleplay notes with your completed listing file.",
          },
        ]),
        objectives: ["Deliver a structured listing presentation", "Respond to price and commission objections", "Close with documented next steps"],
        estimatedMinutes: 55,
        completionRequirement: "ASSIGNMENT",
        resourceTitles: ["Objection Handling Guide", "Listing Agreement Template", "Property Marketing Checklist", "Seller Listing Presentation Video Script"],
      },
      {
        title: "Chapter 2 knowledge check and practical assessment",
        stage: "Intermediate",
        summary: "Validate listings and marketing competency before client-work modules.",
        richText: `<p>Complete the Chapter 2 quiz and submit the listing file assignment using your branded forms. Your submission should include a completed listing form, inspection checklist, and marketing checklist.</p>`,
        objectives: ["Pass Chapter 2 knowledge check", "Submit listing file assignment", "Demonstrate marketing workflow"],
        estimatedMinutes: 45,
        completionRequirement: "QUIZ",
        resourceTitles: ["Listing Tracker", "Compliance Checklist"],
      },
    ],
  },
  {
    title: "Working with Clients",
    stage: "Intermediate",
    description: "Qualify buyers and tenants, run viewings, and manage offers professionally.",
    objectives: ["Qualify clients properly", "Run safe, productive viewings", "Manage offers and follow-up"],
    lessons: [
      {
        title: "Qualifying buyers and tenants",
        stage: "Intermediate",
        summary: "Match clients to suitable properties with proper registration and needs analysis.",
        richText: `<p>Qualification protects everyone: budget, timeline, location, must-haves, and authority to proceed. Use registration forms for every serious enquiry.</p><p>Buyer and tenant needs analysis forms structure your discovery conversation and feed better property matches.</p>`,
        objectives: ["Complete buyer/tenant registration", "Run needs analysis interviews", "Filter unsuitable enquiries early"],
        estimatedMinutes: 35,
        resourceTitles: ["Buyer Registration Form", "Tenant Registration Form", "Buyer Needs Analysis Form", "Tenant Needs Analysis Form"],
      },
      {
        title: "Buyer and tenant qualification simulation",
        stage: "Intermediate",
        summary: "Practise turning a vague enquiry into a documented, qualified client brief.",
        richText: practicalLesson([
          {
            heading: "The problem",
            body: "Many enquiries begin with incomplete information: 'I need a house in Harare' or 'Do you have rentals?' A professional agent turns that into a qualified brief before arranging viewings.",
          },
          {
            heading: "Qualification script",
            body: "Confirm budget, preferred suburbs, timing, decision makers, finance or payment readiness, must-haves, deal-breakers, and communication preference. For tenants, ask about move-in date, employer or income evidence, occupants, pets, and lease term.",
          },
          {
            heading: "Simulation output",
            body: "Complete one buyer needs analysis and one tenant needs analysis from practice conversations. Write the shortlist criteria you would use and which enquiries you would decline or park for later.",
          },
        ]),
        objectives: ["Run structured qualification conversations", "Document buyer and tenant needs", "Decide which enquiries deserve immediate action"],
        estimatedMinutes: 55,
        completionRequirement: "ASSIGNMENT",
        resourceTitles: ["Buyer Needs Analysis Form", "Tenant Needs Analysis Form", "Buyer Registration Form", "Tenant Registration Form", "Buyer Qualification Roleplay Script", "Tenant Screening Case File"],
      },
      {
        title: "Matching clients with the right property",
        stage: "Intermediate",
        summary: "Shortlist ethically and explain fit clearly.",
        richText: `<p>Present no more than a focused shortlist aligned to documented needs. Explain trade-offs honestly — location vs. budget, condition vs. price.</p><p>Log every match and client reaction in your follow-up register for accountability and better recommendations next time.</p>`,
        objectives: ["Build evidence-based shortlists", "Document client preferences", "Manage expectations transparently"],
        estimatedMinutes: 30,
        resourceTitles: ["Client Follow-Up Register", "Email Templates"],
      },
      {
        title: "Managing property viewings",
        stage: "Intermediate",
        summary: "Safe, punctual, professional viewings with full records.",
        richText: `<p>Confirm viewings in writing, arrive early, respect the property, and never rush clients. Safety first: verify identity where required and follow HouseLink viewing guidelines.</p><p>Every viewing goes in the Property Viewing Register; feedback captured on the Viewing Feedback Form drives next steps.</p>`,
        objectives: ["Run viewings to HouseLink standard", "Complete viewing register entries", "Capture structured feedback"],
        estimatedMinutes: 35,
        resourceTitles: ["Property Viewing Register", "Viewing Feedback Form", "Open House Checklist", "Appointment Schedule"],
      },
      {
        title: "Understanding and presenting offers",
        stage: "Intermediate",
        summary: "Guide clients through offers, rentals applications, and next steps.",
        richText: `<p>Present offers clearly: price, conditions, timelines, and contingencies. Never pressure clients. Ensure rental applications and offer documents are complete before submission.</p><p>Use official templates and escalate legal questions to qualified professionals.</p>`,
        objectives: ["Explain offer components clearly", "Use correct application templates", "Maintain neutral professional guidance"],
        estimatedMinutes: 35,
        resourceTitles: ["Offer to Purchase Template", "Rental Application Form"],
      },
      {
        title: "Offer negotiation and counter-offer roleplay",
        stage: "Intermediate",
        summary: "Practise presenting offers and counter-offers without pressure, confusion, or undocumented changes.",
        richText: practicalLesson([
          {
            heading: "Negotiation standard",
            body: "The agent's role is to communicate accurately, keep records, and help each party understand options. Do not create terms verbally or pressure a party into agreement. Every material change must be documented.",
          },
          {
            heading: "Roleplay scenario",
            body: "A buyer offers below asking price with conditions. The seller counters with a higher price and a shorter acceptance deadline. Prepare the conversation you would have with each side, including risks, deadlines, and next documents.",
          },
          {
            heading: "Evidence required",
            body: "Submit a short script or notes showing how you present the offer, record the response, confirm the counter-offer, and escalate legal or contractual questions.",
          },
        ]),
        objectives: ["Present offers neutrally", "Document counter-offers and deadlines", "Escalate legal questions at the right moment"],
        estimatedMinutes: 50,
        completionRequirement: "ASSIGNMENT",
        resourceTitles: ["Offer to Purchase Template", "Rental Application Form", "Client Follow-Up Register", "Offer Negotiation Case File"],
      },
      {
        title: "Chapter 3 client service simulation",
        stage: "Intermediate",
        summary: "Apply client workflows in a practical assignment.",
        richText: `<p>Submit a viewing record assignment: viewing register entry, feedback form, and written follow-up plan for a real or practice scenario.</p><p>This checkpoint confirms you can execute the full client journey before advancing to compliance modules.</p>`,
        objectives: ["Complete viewing record assignment", "Demonstrate follow-up planning", "Ready for Advanced stage"],
        estimatedMinutes: 45,
        completionRequirement: "ASSIGNMENT",
      },
    ],
  },
  {
    title: "Documentation, Legal Awareness and Compliance",
    stage: "Advanced",
    description: "Handle documents, contracts, and confidentiality to HouseLink standard.",
    objectives: ["Maintain complete client files", "Apply compliance checklists", "Protect confidential data"],
    lessons: [
      {
        title: "Why documentation matters",
        stage: "Advanced",
        summary: "Documentation protects clients, agents, and HouseLink from dispute and loss.",
        richText: `<p>Verbal agreements fail under pressure. Written, signed, dated records create clarity and audit trails. Treat every file as if it will be reviewed tomorrow.</p>`,
        objectives: ["Explain documentation risks", "Adopt file-first habits", "Use checklists consistently"],
        estimatedMinutes: 25,
      },
      {
        title: "Common documents used by real estate agents",
        stage: "Advanced",
        summary: "Know which form applies to each transaction stage.",
        richText: `<p>From registration forms to mandates, inspection reports, applications, and compliance submissions — each document has a purpose. Keep master copies in your resource kit and complete them fully before upload to HouseLink or branch records.</p>`,
        objectives: ["Match documents to transaction stages", "Access the correct branded templates", "Avoid incomplete submissions"],
        estimatedMinutes: 30,
        resourceTitles: ["Document Submission Checklist", "Seller Information Form", "Landlord Registration Form"],
      },
      {
        title: "Completing documents accurately",
        stage: "Advanced",
        summary: "Accuracy, legibility, and consistency on every form.",
        richText: `<p>Illegible or inconsistent data causes delays and disputes. Double-check names, IDs, amounts, dates, and signatures. Use the Document Submission Checklist before any file leaves your desk.</p>`,
        objectives: ["Apply accuracy standards", "Complete submission checklist", "Review files before handover"],
        estimatedMinutes: 30,
        resourceTitles: ["Document Submission Checklist", "File Checklist"],
      },
      {
        title: "Title deed, cession and estate risk flags",
        stage: "Advanced",
        summary: "Recognise document situations that require careful escalation before marketing or transacting.",
        richText: practicalLesson([
          {
            heading: "Agent awareness",
            body: "Agents often encounter title deeds, cession arrangements, deceased estates, company-owned property, family disputes, and missing document chains. You are not expected to solve legal issues, but you must recognise when a file is not ordinary.",
          },
          {
            heading: "Risk flags",
            body: "Escalate when names do not match, the person instructing is not the owner, an estate executor or company resolution is mentioned, original documents are unavailable, boundaries or rates are disputed, or clients resist written records.",
          },
          {
            heading: "File note practice",
            body: "For each risk flag, write a short file note: what you observed, what you requested, who you escalated to, and what action is paused until clearance is received.",
          },
        ]),
        objectives: ["Identify high-risk document scenarios", "Create clear escalation file notes", "Pause unsafe transactions before harm is done"],
        estimatedMinutes: 55,
        completionRequirement: "ASSIGNMENT",
        resourceTitles: ["Compliance Checklist", "File Checklist", "Document Submission Checklist", "Document Risk Case File"],
      },
      {
        title: "Understanding contracts and confidentiality",
        stage: "Advanced",
        summary: "Confidentiality, mandate terms, and when to seek legal advice.",
        richText: `<p>You are not a lawyer — but you must understand mandate basics, confidentiality duties, and referral boundaries. Never advise on legal interpretation; escalate to qualified professionals.</p><p>Client financial and identity data stays confidential unless disclosure is legally required or authorised.</p>`,
        objectives: ["Protect confidential client data", "Recognise legal referral boundaries", "Explain mandate basics accurately"],
        estimatedMinutes: 35,
      },
      {
        title: "Lease, mandate and commission agreement essentials",
        stage: "Advanced",
        summary: "Understand the business terms agents must explain clearly before clients sign or proceed.",
        richText: practicalLesson([
          {
            heading: "Commercial clarity",
            body: "Clients should understand who the agent represents, what service is being provided, how commission is calculated, when payment is due, and what happens if terms change. This must be clear before conflict arises.",
          },
          {
            heading: "Documents to review",
            body: "For rentals, check lease term, deposit, monthly rent, handover condition, maintenance responsibilities, and payment channels. For sales and listings, check mandate type, marketing period, commission, asking price, and authority to advertise.",
          },
          {
            heading: "Practice output",
            body: "Prepare a plain-language explanation of commission and mandate terms for a first-time seller, plus a plain-language rental handover explanation for a tenant.",
          },
        ]),
        objectives: ["Explain commercial terms in plain language", "Check lease and mandate basics", "Reduce disputes through early clarity"],
        estimatedMinutes: 50,
        resourceTitles: ["Listing Agreement Template", "Commission Calculation Worksheet", "Rental Application Form"],
      },
      {
        title: "Chapter 4 compliance assessment",
        stage: "Advanced",
        summary: "Compliance quiz and file review checkpoint.",
        richText: `<p>Pass the Chapter 4 knowledge check and review your sample client file against the File and Compliance checklists. Fix any gaps before proceeding to performance modules.</p>`,
        objectives: ["Pass compliance knowledge check", "Audit a sample client file", "Correct documentation gaps"],
        estimatedMinutes: 40,
        completionRequirement: "QUIZ",
        resourceTitles: ["Compliance Checklist"],
      },
    ],
  },
  {
    title: "Becoming a Top-Performing Agent",
    stage: "Advanced",
    description: "Performance habits, KPIs, reputation, and HouseLink certificate readiness.",
    objectives: ["Build sustainable performance routines", "Track KPIs weekly", "Prepare for final certificate completion"],
    lessons: [
      {
        title: "Building a successful real estate career",
        stage: "Advanced",
        summary: "Long-term career design: specialisation, reputation, and continuous learning.",
        richText: `<p>Sustainable careers combine skill, reputation, and systems. Choose niches where you can excel — rentals, sales, commercial — and deepen expertise rather than chasing every lead.</p>`,
        objectives: ["Define your career niche", "Plan continuous learning", "Build referral networks"],
        estimatedMinutes: 30,
      },
      {
        title: "Daily, weekly and monthly success routines",
        stage: "Advanced",
        summary: "Planners and workflows that top agents use consistently.",
        richText: `<p>Structure beats motivation. Use the Daily Activity Planner each morning, Weekly Planner for priorities, and Monthly KPI Tracker for results review.</p><p>The Agent Daily Workflow flowchart gives a visual checklist for high-productivity days.</p>`,
        objectives: ["Implement daily planning ritual", "Run weekly performance reviews", "Track monthly KPIs"],
        estimatedMinutes: 35,
        resourceTitles: ["Daily Activity Planner", "Weekly Planner", "Monthly Planner", "Agent Daily Workflow", "Monthly KPI Tracker"],
      },
      {
        title: "Tracking pipeline and performance",
        stage: "Advanced",
        summary: "Measure what matters: leads, viewings, listings, and closed deals.",
        richText: `<p>Pipeline visibility prevents feast-or-famine cycles. Update your Listing Tracker, Closed Deals Register, and Sales Performance Tracker weekly.</p><p>Commission calculations should be understood early — use the Commission Calculation Worksheet for transparency with clients and personal forecasting.</p>`,
        objectives: ["Maintain live pipeline data", "Review conversion metrics", "Forecast commission accurately"],
        estimatedMinutes: 35,
        resourceTitles: ["Listing Tracker", "Closed Deals Register", "Sales Performance Tracker", "Commission Calculation Worksheet", "Expense Tracker", "Mileage Log"],
      },
      {
        title: "Pipeline diagnosis and coaching review",
        stage: "Advanced",
        summary: "Use real activity numbers to diagnose weak points and choose the next professional habit to improve.",
        richText: practicalLesson([
          {
            heading: "What top agents review",
            body: "A pipeline review looks at leads generated, qualified enquiries, listings won, viewings booked, offers received, deals closed, response times, and follow-up gaps. The numbers show which skill needs attention.",
          },
          {
            heading: "Diagnosis examples",
            body: "Many leads but few viewings may mean qualification or listing quality is weak. Many viewings but few offers may point to pricing, property fit, or follow-up. Many offers but few closures may reveal negotiation or document delays.",
          },
          {
            heading: "Coaching output",
            body: "Submit one monthly dashboard with a written diagnosis and a 30-day improvement plan. Include one habit to stop, one habit to improve, and one metric to watch weekly.",
          },
        ]),
        objectives: ["Diagnose pipeline weaknesses", "Use KPI data for coaching decisions", "Build a realistic 30-day improvement plan"],
        estimatedMinutes: 50,
        completionRequirement: "ASSIGNMENT",
        resourceTitles: ["Monthly KPI Tracker", "Weekly Performance Review", "Lead Tracking Sheet", "Sales Performance Tracker", "Zimbabwe Market Intelligence Update Template"],
      },
      {
        title: "Professional reputation and long-term growth",
        stage: "Advanced",
        summary: "Reviews, referrals, and brand building on HouseLink.",
        richText: `<p>Your reputation is your most valuable asset. Deliver on promises, respond professionally to complaints, and ask satisfied clients for reviews through proper HouseLink channels.</p><p>Personal branding should align with HouseLink standards — professional photos, consistent messaging, no misleading claims.</p>`,
        objectives: ["Grow reviews ethically", "Build referral habits", "Align personal brand with HouseLink"],
        estimatedMinutes: 30,
      },
      {
        title: "Specialisation pathways for top agents",
        stage: "Advanced",
        summary: "Choose the advanced track that can make you unusually valuable in the market.",
        richText: practicalLesson([
          {
            heading: "Why specialists win",
            body: "The best agents become known for a clear type of client, property, or transaction. HouseLink's core training certificate shows baseline completion; specialisation gives you a sharper market identity and deeper advisory value.",
          },
          {
            heading: "Available pathways",
            body: SPECIALISATION_TRACKS.map((track) => `${track.title}: ${track.outcome}`).join(" "),
          },
          {
            heading: "Specialisation plan",
            body: "Pick one pathway for the next 90 days. Define the client type, property type, top objections, required documents, local market signals, and three expert contacts you need to build around that niche.",
          },
        ]),
        objectives: ["Select a professional niche", "Define specialist knowledge gaps", "Create a 90-day specialisation plan"],
        estimatedMinutes: 45,
        resourceTitles: ["Personal Goal Planner", "Monthly KPI Tracker", "Lead Tracking Sheet"],
      },
      {
        title: "Annual training renewal and continuing professional development",
        stage: "Advanced",
        summary: "Keep your certificate meaningful after the first year through renewal, compliance refreshers, and market updates.",
        richText: practicalLesson([
          {
            heading: "Why renewal matters",
            body: "Markets, scams, document risks, and client expectations change. Annual training renewal keeps the HouseLink credential credible and protects clients from agents who stop learning after the first certificate.",
          },
          {
            heading: "Renewal requirements",
            body: RECERTIFICATION_REQUIREMENTS.join(" "),
          },
          {
            heading: "Professional habit",
            body: "Keep a small renewal file throughout the year: one market update quiz result, one refreshed compliance checklist, one reviewed client file, one KPI review, and one mentor note.",
          },
        ]),
        objectives: ["Understand annual certificate renewal", "Maintain a renewal evidence file", "Use market updates for ongoing competence"],
        estimatedMinutes: 35,
        resourceTitles: ["Weekly Performance Review", "Compliance Checklist", "Zimbabwe Market Intelligence Update Template"],
      },
      {
        title: "Field apprenticeship evidence portfolio",
        stage: "Advanced",
        summary: "Compile proof that you can perform core agent tasks, not only pass knowledge checks.",
        richText: practicalLesson([
          {
            heading: "Portfolio purpose",
            body: "Certification should prove field readiness. A portfolio gives admin, mentors, and branch leads evidence that you can prospect, qualify, list, market, show, document, and review performance professionally.",
          },
          {
            heading: "Required evidence",
            body: "Include a prospecting log, one listing file, one client qualification file, one viewing record, one compliance audit, one KPI review, and a short reflection on the most important correction you made during training.",
          },
          {
            heading: "Professional standard",
            body: "Remove or mask private client details where required. Label each document clearly and make sure every file shows dates, next actions, and supervisor or self-review notes.",
          },
        ]),
        objectives: ["Assemble evidence of field competence", "Protect confidential information in submissions", "Prepare for mentor or admin review"],
        estimatedMinutes: 75,
        completionRequirement: "ASSIGNMENT",
        resourceTitles: ["File Checklist", "Daily Activity Planner", "Property Viewing Register", "Monthly KPI Tracker", "Compliance Checklist", "Field Portfolio Mentor Sign-Off Form"],
      },
      {
        title: "Final competency checklist",
        stage: "Advanced",
        summary: "Confirm readiness for the HouseLink Agent Foundations final examination.",
        richText: `<p>Before the final exam, verify you have completed all stage lessons, downloaded and used key branded tools, passed module quizzes, and submitted practical assignments.</p><p>The full training manual remains in the Resource Library for deep reference - your HouseLink training certificate is based on this staged programme and assessments.</p>`,
        objectives: ["Complete competency checklist", "Schedule final examination", "Identify final revision areas"],
        estimatedMinutes: 30,
        completionRequirement: "QUIZ",
        resourceTitles: ["Weekly Performance Review"],
      },
    ],
  },
  {
    title: "Professional Agent Resource Kit",
    stage: "Professional Kit",
    description: "HouseLink-branded print-ready forms, planners, flowcharts, and templates — your field toolkit.",
    objectives: ["Access all branded Academy downloads", "Know which tool to use when", "Keep a complete digital field kit"],
    lessons: [
      {
        title: "Client document forms",
        stage: "Professional Kit",
        summary: "Print-ready buyer, seller, tenant, and landlord forms with HouseLink branding.",
        richText: `<p>These A4 forms are recreated for HouseLink agents — use them on every qualified client engagement. Download, print or fill digitally, and store copies in the client file.</p>`,
        objectives: ["Download all client registration forms", "Use correct form per client type", "File completed forms properly"],
        estimatedMinutes: 20,
        resourceTitles: ["Seller Information Form", "Buyer Registration Form", "Tenant Registration Form", "Landlord Registration Form", "Client Information Sheet"],
      },
      {
        title: "Operations planners and registers",
        stage: "Professional Kit",
        summary: "Daily planners, viewing registers, and appointment tools.",
        richText: `<p>Operational excellence runs on simple registers. Keep viewing, follow-up, and appointment records current — they protect you in disputes and improve conversion.</p><p><strong>Practical exercise:</strong> Set up your weekly planner template today. Block prospecting, follow-up, and admin time before adding client appointments.</p><p>Review every open enquiry in your Client Follow-Up Register each Friday and schedule next actions before the week ends.</p>`,
        objectives: ["Set up operational templates", "Maintain viewing and follow-up registers", "Plan appointments systematically"],
        estimatedMinutes: 20,
        resourceTitles: ["Daily Activity Planner", "Weekly Planner", "Monthly Planner", "Appointment Schedule", "Property Viewing Register", "Client Follow-Up Register"],
      },
      {
        title: "Marketing templates and scripts",
        stage: "Professional Kit",
        summary: "WhatsApp, social, email, and telephone scripts aligned to HouseLink.",
        richText: `<p>Consistent messaging builds brand trust. Adapt templates to each client but keep tone professional and compliant with HouseLink marketing rules.</p><p><strong>Practical exercise:</strong> Customise the WhatsApp introduction template for three property types you list most often. Save versions in your toolkit folder.</p><p>Never promise outcomes in scripts — focus on clarity, next steps, and permission to follow up.</p>`,
        objectives: ["Use WhatsApp and social templates", "Apply telephone and cold-call scripts", "Plan campaigns with content planner"],
        estimatedMinutes: 25,
        resourceTitles: ["WhatsApp Marketing Templates", "Social Media Content Planner", "Email Templates", "Telephone Scripts", "Cold Calling Scripts"],
      },
      {
        title: "Administration and compliance tools",
        stage: "Professional Kit",
        summary: "Checklists for files, compliance, inspections, and submissions.",
        richText: `<p>Run every listing and client file through the File, Compliance, and Document Submission checklists before handover. These tools prevent the most common compliance failures.</p><p><strong>Practical exercise:</strong> Audit one recent file against all three checklists. Document gaps and corrective actions with dates.</p><p>Inspection and open-house checklists protect you when access, safety, or neighbour issues arise.</p>`,
        objectives: ["Apply file and compliance checklists", "Use inspection and open-house tools", "Submit complete document packs"],
        estimatedMinutes: 25,
        resourceTitles: ["File Checklist", "Compliance Checklist", "Document Submission Checklist", "Property Inspection Checklist", "Open House Checklist"],
      },
      {
        title: "Building your live field kit workflow",
        stage: "Professional Kit",
        summary: "Set up the exact folder, naming, and review routine that keeps forms usable in real deals.",
        richText: practicalLesson([
          {
            heading: "Toolkit setup",
            body: "A resource kit only has value when you can use it quickly under client pressure. Create folders for leads, listings, buyers, tenants, landlords, compliance, marketing, and performance. Keep blank templates separate from completed client files.",
          },
          {
            heading: "Naming standard",
            body: "Use clear names that include date, client or property reference, document type, and status. Example: 2026-07-26-Ms-Moyo-buyer-needs-analysis-draft. Consistent naming reduces lost documents and handover confusion.",
          },
          {
            heading: "Weekly review",
            body: "Every Friday, check open files against the File Checklist and update next actions. This creates a professional operating rhythm that supports HouseLink admins, clients, and your own pipeline.",
          },
        ]),
        objectives: ["Organise the complete toolkit for field use", "Apply consistent document naming", "Run a weekly open-file review"],
        estimatedMinutes: 35,
        resourceTitles: ["File Checklist", "Compliance Checklist", "Client Follow-Up Register", "Weekly Planner"],
      },
      {
        title: "Performance trackers and quick reference guides",
        stage: "Professional Kit",
        summary: "KPI trackers, journey flowcharts, and process guides.",
        richText: `<p>Flowcharts for buyer, seller, landlord, rental, and sales journeys give you and clients a shared mental model. Pin them in your workspace and refer to them during complex transactions.</p><p>The complete manual PDF is available separately in the Academy Resource Library for deep reading — these lesson tools are what you use in the field every day.</p>`,
        objectives: ["Use KPI and performance trackers", "Apply journey flowcharts in client meetings", "Keep quick references accessible"],
        estimatedMinutes: 25,
        resourceTitles: ["Monthly KPI Tracker", "Sales Performance Tracker", "Buyer Journey Flowchart", "Seller Journey Flowchart", "Landlord Journey Flowchart", "Property Selling Process Flowchart", "Property Rental Process Flowchart"],
      },
    ],
  },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
}

function buildManifestMap(items: ManifestItem[]) {
  return new Map(items.map((item) => [item.title, item]));
}

function downloadsForTitles(map: Map<string, ManifestItem>, titles: string[] = []) {
  return titles.flatMap((title) => {
    const item = map.get(title);
    if (!item) return [];
    return [{ title: item.title, url: item.fileUrl, type: "PDF" as const }];
  });
}

async function archiveLegacyCourse(prisma: ReturnType<typeof getMainPrisma>) {
  await prisma.trainingModule.deleteMany({ where: { courseId: LEGACY_COURSE_ID } }).catch(() => undefined);
  await prisma.trainingCourse
    .update({
      where: { id: LEGACY_COURSE_ID },
      data: {
        status: "ARCHIVED",
        registrationOpen: false,
        featured: false,
        title: "HouseLink Zimbabwe Real Estate Agent Training (Legacy)",
        updatedAt: new Date(),
      },
    })
    .catch(() => undefined);
}

async function migrateLegacyEnrollments(prisma: ReturnType<typeof getMainPrisma>) {
  const foundationsId = ACADEMY_PROGRAMME_COURSES[0].id;
  const legacyApplications = await prisma.academyLearnerApplication.findMany({
    where: { courseId: LEGACY_COURSE_ID, status: "APPROVED" },
  });

  for (const legacy of legacyApplications) {
    const existing = await prisma.academyLearnerApplication.findUnique({
      where: { learnerId_courseId: { learnerId: legacy.learnerId, courseId: foundationsId } },
    });
    if (!existing) {
      await prisma.academyLearnerApplication.create({
        data: {
          learnerId: legacy.learnerId,
          courseId: foundationsId,
          paymentId: legacy.paymentId,
          learnerType: legacy.learnerType,
          status: "APPROVED",
          fullName: legacy.fullName,
          email: legacy.email,
          phone: legacy.phone,
          organisation: legacy.organisation,
          motivation: legacy.motivation,
          amount: legacy.amount,
          currency: legacy.currency,
          accessStartsAt: legacy.accessStartsAt ?? new Date(),
          accessEndsAt: legacy.accessEndsAt,
        },
      });
    }
    await prisma.courseEnrolment.upsert({
      where: { courseId_agentId: { courseId: foundationsId, agentId: legacy.learnerId } },
      create: {
        courseId: foundationsId,
        agentId: legacy.learnerId,
        status: "ACTIVE",
        dueAt: legacy.accessEndsAt,
      },
      update: { status: "ACTIVE", dueAt: legacy.accessEndsAt },
    });
  }

  await prisma.academyLearnerApplication.updateMany({
    where: { courseId: LEGACY_COURSE_ID },
    data: {
      status: "EXPIRED",
      adminNote: "Superseded by the HouseLink Agent Foundations programme. Your access continues on the new staged training certificate path.",
    },
  });
  await prisma.courseEnrolment.updateMany({
    where: { courseId: LEGACY_COURSE_ID },
    data: { status: "ARCHIVED" },
  });
}

export async function seedStagedCourseStructure(options?: { forceRebuild?: boolean }) {
  const prisma = getMainPrisma();
  await archiveLegacyCourse(prisma);
  await migrateLegacyEnrollments(prisma);

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as ManifestItem[];
  const manifestMap = buildManifestMap(manifest);

  const category = await prisma.trainingCategory.upsert({
    where: { slug: "new-agent-programme" },
    create: { name: "New Agent Programme", slug: "new-agent-programme", description: "Three-course HouseLink agent training certificate pathway - Beginner, Intermediate, Advanced.", sortOrder: 0 },
    update: { name: "New Agent Programme", description: "Three-course HouseLink agent training certificate pathway.", active: true },
  });

  const totalExisting = await prisma.trainingLesson.count({
    where: { section: { module: { courseId: { in: [...ACADEMY_PROGRAMME_COURSES.map((c) => c.id), LEGACY_COURSE_ID] } } } },
  });
  if (totalExisting > 10 && !options?.forceRebuild) {
    await updateExistingOfficialLessonDepth(prisma);
    return {
      rebuilt: false,
      courses: ACADEMY_PROGRAMME_COURSES.map((course) => ({ id: course.id, title: course.title })),
      lessonCount: totalExisting,
    };
  }

  let globalLessonIndex = 0;
  const courseResults: Array<{ id: string; title: string; lessonCount: number; moduleCount: number }> = [];

  for (const programmeCourse of ACADEMY_PROGRAMME_COURSES) {
    const courseModules = modules.filter((module) => programmeCourse.moduleStages.includes(module.stage));
    const lessonCount = courseModules.reduce((n, m) => n + m.lessons.length, 0);

    await prisma.trainingCourse.upsert({
      where: { id: programmeCourse.id },
      create: {
        id: programmeCourse.id,
        title: programmeCourse.title,
        subtitle: programmeCourse.subtitle,
        slug: programmeCourse.slug,
        shortDescription: programmeCourse.shortDescription,
        description: programmeCourse.description,
        categoryId: category.id,
        instructor: "HouseLink Zimbabwe Academy",
        coInstructors: ["HouseLink Training Team"],
        learningOutcomes: programmeCourse.learningOutcomes,
        targetAudience: programmeCourse.sortOrder === 0
          ? "New HouseLink agents and public learners starting the training certificate pathway"
          : `Agents who completed ${ACADEMY_PROGRAMME_COURSES[programmeCourse.sortOrder - 1]?.title ?? "the previous programme"}`,
        tags: [programmeCourse.theme.label.toLowerCase(), "houselink", "training", "certificate", "agent"],
        difficulty: programmeCourse.difficulty,
        durationMinutes: lessonCount * 30,
        estimatedHours: Math.max(1, Math.ceil((lessonCount * 30) / 60)),
        language: "English",
        passingPercentage: 80,
        certificateEnabled: true,
        price: programmeCourse.publicPrice,
        publicPrice: programmeCourse.publicPrice,
        agentPrice: programmeCourse.agentPrice,
        currency: "USD",
        registrationOpen: true,
        accessDurationDays: 365,
        status: "PUBLISHED",
        featured: programmeCourse.featured,
        visibility: "PUBLIC",
        roleNames: ["AGENT", "ADMIN", "PUBLIC_LEARNER"],
        thumbnailUrl: "/brand/houselink-full-lockup.png",
        bannerUrl: "/brand/houselink-full-lockup.png",
        enrollmentType: "OPEN",
      },
      update: {
        title: programmeCourse.title,
        subtitle: programmeCourse.subtitle,
        slug: programmeCourse.slug,
        shortDescription: programmeCourse.shortDescription,
        description: programmeCourse.description,
        difficulty: programmeCourse.difficulty,
        estimatedHours: Math.max(1, Math.ceil((lessonCount * 30) / 60)),
        durationMinutes: lessonCount * 30,
        learningOutcomes: programmeCourse.learningOutcomes,
        status: "PUBLISHED",
        featured: programmeCourse.featured,
        registrationOpen: true,
        certificateEnabled: true,
        updatedAt: new Date(),
      },
    });

    await prisma.trainingModule.deleteMany({ where: { courseId: programmeCourse.id } });

    for (const [moduleIndex, module] of courseModules.entries()) {
      await prisma.trainingModule.create({
        data: {
          courseId: programmeCourse.id,
          title: module.title,
          description: module.description,
          objectives: module.objectives,
          estimatedMinutes: module.lessons.reduce((n, l) => n + l.estimatedMinutes, 0),
          sortOrder: moduleIndex,
          sections: {
            create: [{
              title: module.title,
              description: `${module.stage} · ${module.lessons.length} lessons`,
              sortOrder: 0,
              lessons: {
                create: module.lessons.map((lesson, sortOrder) => {
                  globalLessonIndex += 1;
                  const resourceTitles = lesson.resourceTitles ?? [];
                  const downloads = downloadsForTitles(manifestMap, resourceTitles);
                  const pdfUrl = lessonHandoutStoragePath(programmeCourse.id, lesson.title);
                  return {
                    id: `${programmeCourse.id}-lesson-${globalLessonIndex}-${slugify(lesson.title).slice(0, 28)}`,
                    title: lesson.title,
                    summary: lesson.summary,
                    richText: inDepthLesson(lesson),
                    videoUrl: lesson.videoUrl,
                    embeddedVideoUrl: lesson.embeddedVideoUrl,
                    objectives: lesson.objectives,
                    discussionPrompt: lesson.discussionPrompt ?? null,
                    pdfUrl,
                    estimatedMinutes: lesson.estimatedMinutes,
                    completionRequirement: lesson.completionRequirement ?? "VIEW",
                    sortOrder,
                    lessonDownloads: downloads.length ? { create: downloads } : undefined,
                    lessonResources: resourceTitles.length
                      ? {
                          create: resourceTitles.map((title, index) => {
                            const item = manifestMap.get(title);
                            return {
                              title: item?.title ?? title,
                              body: item?.description ?? "HouseLink branded print-ready resource.",
                              type: "PDF",
                              sortOrder: index,
                            };
                          }),
                        }
                      : undefined,
                  };
                }),
              },
            }],
          },
        },
      });
    }

    courseResults.push({
      id: programmeCourse.id,
      title: programmeCourse.title,
      lessonCount,
      moduleCount: courseModules.length,
    });
  }

  return { rebuilt: true, courses: courseResults, lessonCount: globalLessonIndex };
}

async function updateExistingOfficialLessonDepth(prisma: ReturnType<typeof getMainPrisma>) {
  const officialCourseIds = ACADEMY_PROGRAMME_COURSES.map((course) => course.id);
  const existingLessons = await prisma.trainingLesson.findMany({
    where: { section: { module: { courseId: { in: officialCourseIds } } } },
    include: { lessonDownloads: true },
  });
  const seedsByTitle = new Map(modules.flatMap((module) => module.lessons).map((lesson) => [lesson.title, lesson]));
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as ManifestItem[];
  const manifestByUrl = new Map(manifest.map((item) => [item.fileUrl, item.title]));

  for (const existing of existingLessons) {
    const seed = seedsByTitle.get(existing.title);
    if (!seed) continue;
    const resourceTitles = seed.resourceTitles?.length
      ? seed.resourceTitles
      : existing.lessonDownloads.map((download) => manifestByUrl.get(download.url) ?? download.title);
    await prisma.trainingLesson.update({
      where: { id: existing.id },
      data: {
        summary: seed.summary,
        richText: inDepthLesson({ ...seed, resourceTitles }),
        objectives: seed.objectives,
        discussionPrompt: seed.discussionPrompt ?? existing.discussionPrompt,
        estimatedMinutes: Math.max(seed.estimatedMinutes, existing.estimatedMinutes),
      },
    });
  }
}

/** Full manual — course library only, not per-lesson default */
export { ACADEMY_FULL_MANUAL_URL };
