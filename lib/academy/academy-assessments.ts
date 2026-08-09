/** Module-aligned quizzes and assignments for HouseLink Agent Academy programmes. */

export type AcademyQuizSeed = {
  id: string;
  courseId: string;
  moduleTitle: string;
  title: string;
  description: string;
  sortOrder: number;
  timeLimitMinutes: number;
  questions: Array<{
    prompt: string;
    answers: string[];
    correct: number;
    explanation: string;
  }>;
};

export type AcademyAssignmentSeed = {
  id: string;
  courseId: string;
  moduleTitle: string;
  title: string;
  description: string;
  points: number;
  dueDays: number;
  sortOrder: number;
};

function q(prompt: string, answers: string[], correct: number, explanation: string) {
  return { prompt, answers, correct, explanation };
}

export const ACADEMY_QUIZ_SEEDS: AcademyQuizSeed[] = [
  {
    id: "academy-quiz-beginner-orientation",
    courseId: "academy-course-beginner",
    moduleTitle: "Introduction to the HouseLink Zimbabwe Standard",
    title: "HouseLink Orientation Checkpoint",
    description: "Confirms you understand the Academy pathway, HouseLink standards, and how to use lesson notes and field toolkits.",
    sortOrder: 0,
    timeLimitMinutes: 15,
    questions: [
      q(
        "What is the primary purpose of the HouseLink Agent Academy staged programmes?",
        [
          "Build professional competence step-by-step with practical tools and checkpoints.",
          "Replace all field mentoring with self-study only.",
          "Memorise the full manual in one sitting.",
          "Skip documentation until a deal closes.",
        ],
        0,
        "The Academy is designed as progressive stages with practical application.",
      ),
      q(
        "Where should you find print-ready forms and checklists for daily field work?",
        [
          "The Toolkit tab — programme-specific branded PDF forms.",
          "The full training manual only.",
          "Generic internet templates.",
          "Lesson notes PDFs.",
        ],
        0,
        "Forms live in Toolkit; lesson notes PDFs are study guides in Lesson Notes.",
      ),
      q(
        "What should you do after completing each lesson?",
        [
          "Download the lesson notes PDF, apply linked toolkit forms, and track progress.",
          "Move on without reviewing or practising.",
          "Wait until all three programmes are finished before using any tools.",
          "Only read the manual appendix.",
        ],
        0,
        "Each lesson connects study material to field-ready HouseLink resources.",
      ),
      q(
        "Which habit best supports a sustainable agent career?",
        [
          "Weekly goal review using planners and honest pipeline tracking.",
          "Avoiding written records to save time.",
          "Only working when a client calls.",
          "Publishing listings before verifying owner authority.",
        ],
        0,
        "Structured planning and review habits underpin long-term success.",
      ),
      q(
        "A learner finds a Toolkit form linked inside a lesson. How should they treat it?",
        [
          "As a field tool to practise with immediately and submit when required.",
          "As optional branding material that never affects competence.",
          "As a replacement for all trainer review.",
          "As a file to use only after becoming an admin.",
        ],
        0,
        "The Academy is designed around applying tools in real or practice scenarios.",
      ),
      q(
        "What does HouseLink certificate completion on the staged pathway require beyond reading lessons?",
        [
          "Passing quizzes, submitting practical evidence, and meeting programme requirements.",
          "Only opening every PDF once.",
          "Paying the course fee without assessment.",
          "Memorising scripts without field practice.",
        ],
        0,
        "Certification combines knowledge checks with practical assignments.",
      ),
    ],
  },
  {
    id: "academy-quiz-foundations",
    courseId: "academy-course-beginner",
    moduleTitle: "Foundations of Real Estate",
    title: "Foundations Knowledge Check",
    description: "Capstone quiz for Module 2 — professional duties, ethics, terminology, and client communication.",
    sortOrder: 1,
    timeLimitMinutes: 25,
    questions: [
      q(
        "What is the agent's first responsibility when working with a new client?",
        ["Understand the client's needs and document them accurately.", "Push the highest commission property first.", "Avoid written records until the deal is closed.", "Only communicate through social media."],
        0,
        "Professional needs analysis and accurate records come first.",
      ),
      q(
        "Which behaviour best reflects HouseLink professional conduct?",
        ["Transparent communication and accurate property information.", "Withholding defects until after viewing.", "Changing offer terms verbally.", "Letting clients sign incomplete forms."],
        0,
        "Ethical conduct requires honesty, clarity, and proper documentation.",
      ),
      q(
        "A seller asks you to list above market value. What is the professional response?",
        ["Explain market evidence, comparable sales, and realistic pricing strategy.", "Agree immediately to keep the mandate.", "Refuse to work with the seller.", "Publish any price the seller requests."],
        0,
        "Agents guide clients with evidence-based market advice.",
      ),
      q(
        "When explaining real estate terms to a first-time buyer, what approach is best?",
        ["Use plain language and practical examples they can relate to.", "Use as much industry jargon as possible.", "Refer them to read the manual alone.", "Avoid answering technical questions."],
        0,
        "Clear communication builds trust and credibility.",
      ),
      q(
        "What is the purpose of the Agent Daily Workflow planner?",
        ["Structure prospecting, follow-ups, viewings, and admin in a consistent daily routine.", "Replace all client registration forms.", "Calculate conveyancing fees.", "Store title deeds."],
        0,
        "Daily planning keeps agents accountable to high-value activities.",
      ),
      q(
        "A client asks whether a disputed estate property can be sold immediately. What should the agent do?",
        ["Explain the process limits and escalate for qualified legal or admin review.", "Give a legal opinion to keep the client happy.", "Advertise first and check documents after an offer.", "Tell the client all estate sales are impossible."],
        0,
        "Agents recognise risk and escalate legal interpretation instead of giving legal advice.",
      ),
      q(
        "Which listing instruction should be treated as high-risk?",
        ["A person who cannot prove authority asks you to market a property urgently.", "An owner provides documents and agrees to written checks.", "A landlord requests a viewing register.", "A seller asks for comparable pricing evidence."],
        0,
        "Authority gaps are a core verification risk and must be resolved before marketing.",
      ),
    ],
  },
  {
    id: "academy-quiz-intermediate-listings",
    courseId: "academy-course-intermediate",
    moduleTitle: "Prospecting, Listings and Property Marketing",
    title: "Listings & Marketing Checkpoint",
    description: "Validates prospecting discipline, listing capture, appraisals, photography, and marketing workflow.",
    sortOrder: 0,
    timeLimitMinutes: 25,
    questions: [
      q(
        "Before publishing a property listing, what must be completed?",
        ["Listing details, owner authority, photos and compliance checks.", "Only a WhatsApp message from the owner.", "A buyer registration form.", "A commission invoice only."],
        0,
        "Verified listing information and complete records are mandatory.",
      ),
      q(
        "What does a Comparative Market Analysis (CMA) help you do?",
        ["Estimate realistic market value using similar sold or available properties.", "Register a tenant legally.", "Prepare a title deed transfer.", "Replace a property inspection."],
        0,
        "CMAs support accurate appraisals and credible pricing conversations.",
      ),
      q(
        "An exclusive mandate means:",
        ["One agency has the exclusive right to market the property for an agreed period.", "Any agent may market the property without restriction.", "The owner must accept the first offer received.", "No written agreement is required."],
        0,
        "Exclusive mandates clarify marketing responsibility with clear terms.",
      ),
      q(
        "Why is property photography quality critical on HouseLink?",
        ["Online photos create the first impression and drive viewing enquiries.", "Photos replace the need for descriptions.", "Only luxury properties need photos.", "Photos are optional for rentals."],
        0,
        "First impressions online determine whether buyers book viewings.",
      ),
      q(
        "What belongs on a Property Marketing Checklist before go-live?",
        ["Listing copy, photography, portal upload, and social/WhatsApp promotion.", "Only the asking price.", "Verbal owner approval.", "Commission agreement only."],
        0,
        "Complete marketing workflow ensures consistent professional presentation.",
      ),
      q(
        "A seller wants a price far above comparable properties. What is the strongest agent response?",
        ["Show the CMA evidence, explain market risk, and agree a documented pricing strategy.", "Accept the price silently to win the listing.", "Refuse to discuss comparable evidence.", "Promise a buyer will pay the requested price."],
        0,
        "Pricing advice should be evidence-based and documented.",
      ),
      q(
        "What should a basic CMA include?",
        ["Comparable properties, location and condition adjustments, price range, and assumptions.", "Only the seller's preferred price.", "A commission invoice and social media caption.", "A title deed transfer estimate only."],
        0,
        "A useful CMA records evidence, adjustments, range, and assumptions.",
      ),
      q(
        "During a listing presentation, which close is most professional?",
        ["Confirm next actions, required documents, marketing plan, and written mandate terms.", "Leave without written follow-up.", "Promise a sale date.", "Avoid discussing commission until after advertising."],
        0,
        "A listing presentation should end with clear documented next steps.",
      ),
    ],
  },
  {
    id: "academy-quiz-intermediate-clients",
    courseId: "academy-course-intermediate",
    moduleTitle: "Working with Clients",
    title: "Client Service Checkpoint",
    description: "Assesses buyer/tenant qualification, viewings, feedback capture, and professional offer presentation.",
    sortOrder: 1,
    timeLimitMinutes: 25,
    questions: [
      q(
        "What is the purpose of a viewing feedback form?",
        ["To record buyer or tenant reactions and guide follow-up.", "To replace an offer to purchase.", "To register a landlord.", "To calculate mileage only."],
        0,
        "Structured feedback improves follow-up and listing strategy.",
      ),
      q(
        "After a viewing, what should happen in your client workflow?",
        ["Log the viewing, capture feedback, and schedule structured follow-up.", "Wait for the client to call you.", "Remove the listing immediately.", "Send the contract without discussion."],
        0,
        "Professional follow-up converts interest into offers.",
      ),
      q(
        "Why complete buyer or tenant registration forms early?",
        ["To document needs, budget, and authority before shortlisting properties.", "To delay the client journey.", "To avoid CRM records.", "To skip qualification."],
        0,
        "Registration and needs analysis enable ethical, efficient matching.",
      ),
      q(
        "When presenting an offer to a seller, the agent should:",
        ["Explain price, conditions, timelines, and contingencies clearly without pressure.", "Guarantee acceptance.", "Hide unfavourable conditions.", "Discourage written records."],
        0,
        "Transparent offer presentation supports informed client decisions.",
      ),
      q(
        "What makes a property viewing professional and safe?",
        ["Confirmed appointments, punctuality, identity checks where required, and full register entries.", "Arriving unannounced to save time.", "Allowing unlimited attendees without records.", "Skipping feedback to move faster."],
        0,
        "Viewing standards protect clients, owners, and agents.",
      ),
      q(
        "A buyer says they want 'anything in Harare' and refuses to discuss budget. What should the agent do first?",
        ["Qualify the enquiry with budget, location, timing, and decision-maker questions.", "Book several random viewings immediately.", "Ignore the enquiry forever.", "Send an offer template before registration."],
        0,
        "Professional matching begins with structured qualification.",
      ),
      q(
        "What is the safest way to handle a counter-offer?",
        ["Record the terms, deadlines, and response in writing, then escalate legal questions.", "Pass it verbally and rely on memory.", "Change the offer document without confirmation.", "Pressure both sides to agree quickly."],
        0,
        "Counter-offers must be accurately documented and communicated neutrally.",
      ),
      q(
        "Why should shortlists be limited and explained?",
        ["They show the client how each property fits documented needs and trade-offs.", "They hide weak options from the client.", "They avoid follow-up work.", "They replace viewing feedback forms."],
        0,
        "Focused shortlists improve trust and decision quality.",
      ),
    ],
  },
  {
    id: "academy-quiz-compliance",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Documentation, Legal Awareness and Compliance",
    title: "Documentation & Compliance Checkpoint",
    description: "Assesses file completeness, confidentiality, document accuracy, and compliance checklists.",
    sortOrder: 0,
    timeLimitMinutes: 25,
    questions: [
      q(
        "Why should every client file be checked before submission?",
        ["To confirm required documents are complete, accurate and traceable.", "To reduce the number of forms agents use.", "To avoid audit logs.", "To delay the transaction."],
        0,
        "Complete files protect the client, agent, and HouseLink from avoidable risk.",
      ),
      q(
        "Which item should be treated as confidential?",
        ["Client identity, contact, financial and agreement details.", "Only public listing photos.", "Generic marketing slogans.", "Published branch names."],
        0,
        "Private client and transaction information must be handled professionally.",
      ),
      q(
        "Before submitting transaction documents, you must verify:",
        ["All fields are complete, signatures are present, and copies are filed correctly.", "Only the cover page is signed.", "Documents can be submitted incomplete and fixed later.", "Client ID is never required."],
        0,
        "Document accuracy prevents delays, disputes, and compliance failures.",
      ),
      q(
        "What should a File Checklist confirm?",
        ["Client documents, property documents, agreements, marketing records, and communications are complete.", "Only the listing photo is stored.", "Verbal agreements are sufficient.", "Records can be destroyed after viewing."],
        0,
        "Audit-ready files include every stage of the transaction trail.",
      ),
      q(
        "When should you refer a client to a legal professional?",
        ["When questions involve legal interpretation, contract terms, or rights beyond your role.", "Never — agents must answer all legal questions.", "Only after the deal fails.", "Only for commercial property."],
        0,
        "Agents explain process; qualified professionals handle legal advice.",
      ),
      q(
        "Which file note is strongest when a document risk appears?",
        ["Record the issue, documents requested, person escalated to, and action paused.", "Write 'client seems fine' and continue.", "Delete the note once the client complains.", "Only mention the issue verbally."],
        0,
        "Clear file notes create an audit trail and protect the transaction.",
      ),
      q(
        "A mandate names one owner but another person signs instructions. What should happen?",
        ["Pause and verify authority before advertising or accepting offers.", "Advertise immediately because a signature exists.", "Let the buyer investigate after paying.", "Ignore the mismatch if commission is high."],
        0,
        "Name and authority mismatches are risk flags requiring verification.",
      ),
      q(
        "What should an agent explain about commission before a client signs?",
        ["Who pays, how it is calculated, when it is due, and what service is included.", "Only the amount after closing.", "That commission terms are never negotiable.", "Nothing until a dispute starts."],
        0,
        "Commercial clarity prevents disputes and supports informed consent.",
      ),
    ],
  },
  {
    id: "academy-quiz-advanced-performance",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Becoming a Top-Performing Agent",
    title: "Performance & Pipeline Checkpoint",
    description: "Tests daily routines, KPI tracking, pipeline management, and long-term reputation building.",
    sortOrder: 1,
    timeLimitMinutes: 20,
    questions: [
      q(
        "What distinguishes top-performing agents in time management?",
        ["They prioritise high-value activities like prospecting, viewings, and follow-ups daily.", "They react to messages only when convenient.", "They avoid planning to stay flexible.", "They delegate all documentation."],
        0,
        "Structured priorities convert time into measurable pipeline progress.",
      ),
      q(
        "Why track KPIs such as leads, listings, viewings, and closed deals?",
        ["To measure progress, identify gaps, and adjust activity with data.", "To replace client conversations.", "To avoid field work.", "To publish rankings publicly without consent."],
        0,
        "KPI tracking enables continuous improvement and accountability.",
      ),
      q(
        "What should a Weekly Performance Review include?",
        ["Wins, challenges, follow-ups completed, listings progressed, and next week's focus.", "Only closed deals.", "Social media likes.", "Competitor gossip."],
        0,
        "Weekly reviews turn experience into deliberate skill growth.",
      ),
      q(
        "How do professional agents build long-term reputation?",
        ["Consistent ethics, reliable follow-through, and referrals earned through service quality.", "Aggressive pressure tactics.", "Withholding information to control clients.", "Publishing unverified claims."],
        0,
        "Reputation compounds through trust delivered repeatedly over time.",
      ),
      q(
        "Your leads are high but viewings are low. What is the best next step?",
        ["Diagnose qualification, listing quality, pricing, and follow-up using pipeline data.", "Ignore the data and post more random adverts.", "Stop recording enquiries.", "Assume all clients are unserious."],
        0,
        "Pipeline data helps identify the real skill or process gap.",
      ),
      q(
        "What evidence belongs in a field apprenticeship portfolio?",
        ["Prospecting log, listing file, qualification file, viewing record, compliance audit, and KPI review.", "Only a certificate screenshot.", "Only social media likes.", "A blank toolkit folder."],
        0,
        "A portfolio proves practical readiness across the agent workflow.",
      ),
    ],
  },
  {
    id: "academy-quiz-professional-toolkit",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Professional Agent Resource Kit",
    title: "Professional Toolkit Mastery Check",
    description: "Confirms you know when and how to apply key forms, flowcharts, and trackers from the complete HouseLink kit.",
    sortOrder: 2,
    timeLimitMinutes: 20,
    questions: [
      q(
        "When should you use the Property Selling Process Flowchart?",
        ["To guide sellers and your team through each stage from appraisal to completion.", "Only after a deal is closed.", "Instead of client communication.", "To replace listing forms."],
        0,
        "Flowcharts provide shared process clarity for complex transactions.",
      ),
      q(
        "What is the correct use of journey flowcharts (buyer, seller, landlord, tenant)?",
        ["Explain stages and expectations clearly to clients at the start of the relationship.", "Hide stages to simplify conversations.", "Use only internally without client visibility.", "Replace all registration forms."],
        0,
        "Journey maps reduce confusion and improve client confidence.",
      ),
      q(
        "Which toolkit resources support daily operations planning?",
        ["Daily Activity Planner, Appointment Schedule, and Lead Tracking Sheet.", "Only the full training manual.", "Social media memes.", "Unbranded spreadsheets."],
        0,
        "Operations planners keep field activity structured and measurable.",
      ),
      q(
        "Why keep Closed Deals Register and Sales Performance Tracker updated?",
        ["To analyse conversion, celebrate wins, and forecast income professionally.", "To share client financial data publicly.", "To avoid compliance.", "To replace CRM entirely without records."],
        0,
        "Performance registers turn completed work into business intelligence.",
      ),
      q(
        "What makes the resource kit useful during real client work?",
        ["Clear folder structure, current templates, consistent naming, and weekly file review.", "Saving every file with random names.", "Keeping only blank forms and no records.", "Using the full manual instead of transaction documents."],
        0,
        "Toolkit mastery depends on fast retrieval, consistent filing, and active review.",
      ),
      q(
        "When should journey flowcharts be introduced to clients?",
        ["At the start, so expectations, stages, and responsibilities are clear.", "Only after a dispute.", "Never, because clients should not see process steps.", "After all documents are lost."],
        0,
        "Flowcharts help clients understand the process before pressure begins.",
      ),
    ],
  },
];

export const ACADEMY_ASSIGNMENT_SEEDS: AcademyAssignmentSeed[] = [
  {
    id: "academy-assignment-goal-planner",
    courseId: "academy-course-beginner",
    moduleTitle: "Introduction to the HouseLink Zimbabwe Standard",
    title: "Personal Goal Planner Submission",
    description: "Complete the Personal Goal Planner with 90-day income, skill, and activity targets. Submit a photo or PDF showing your written goals and first weekly review notes.",
    points: 50,
    dueDays: 7,
    sortOrder: 0,
  },
  {
    id: "academy-assignment-foundations-standards",
    courseId: "academy-course-beginner",
    moduleTitle: "Foundations of Real Estate",
    title: "Professional Standards & Ethics Reflection",
    description: "Document a real or practice client scenario showing ethical needs analysis, confidentiality, verification questions, and accurate record-keeping. Rubric: 30 pts client facts, 30 pts risk/ethics judgement, 20 pts records, 20 pts reflection. Submit your completed Agent Daily Workflow planner for one week.",
    points: 100,
    dueDays: 14,
    sortOrder: 1,
  },
  {
    id: "academy-assignment-verification-risk-drill",
    courseId: "academy-course-beginner",
    moduleTitle: "Foundations of Real Estate",
    title: "Verification & Risk Flag Drill",
    description: "Review three practice enquiries or listings and mark each ready, incomplete, or high-risk. Rubric: 30 pts correct risk classification, 30 pts follow-up questions, 20 pts escalation judgement, 20 pts clear file notes.",
    points: 100,
    dueDays: 14,
    sortOrder: 2,
  },
  {
    id: "academy-assignment-prospecting-log",
    courseId: "academy-course-intermediate",
    moduleTitle: "Prospecting, Listings and Property Marketing",
    title: "Weekly Prospecting Activity Log",
    description: "Submit one week of completed Daily Activity Planner and Lead Tracking Sheet entries showing prospecting calls, follow-ups, and lead status updates.",
    points: 75,
    dueDays: 10,
    sortOrder: 0,
  },
  {
    id: "academy-assignment-listing-file",
    courseId: "academy-course-intermediate",
    moduleTitle: "Prospecting, Listings and Property Marketing",
    title: "Complete Listing File Submission",
    description: "Prepare a listing file using the listing form, file checklist, marketing checklist and compliance checklist for a practice or real property. Rubric: 30 pts complete listing facts, 25 pts owner authority and compliance notes, 25 pts marketing readiness, 20 pts professional presentation.",
    points: 100,
    dueDays: 14,
    sortOrder: 1,
  },
  {
    id: "academy-assignment-cma-pricing-pack",
    courseId: "academy-course-intermediate",
    moduleTitle: "Prospecting, Listings and Property Marketing",
    title: "CMA Pricing Pack & Seller Conversation",
    description: "Submit a Property Appraisal Form with at least three comparables, recommended price range, assumptions, and seller conversation notes. Rubric: 35 pts comparable evidence, 25 pts price reasoning, 20 pts objection handling, 20 pts documented next steps.",
    points: 100,
    dueDays: 14,
    sortOrder: 2,
  },
  {
    id: "academy-assignment-listing-roleplay",
    courseId: "academy-course-intermediate",
    moduleTitle: "Prospecting, Listings and Property Marketing",
    title: "Listing Presentation Roleplay",
    description: "Submit a five-minute script, recording, or notes for a listing presentation that covers seller goals, CMA evidence, commission, marketing plan, documents required, and close. Rubric: 25 pts structure, 25 pts evidence, 25 pts objection handling, 25 pts professional close.",
    points: 100,
    dueDays: 14,
    sortOrder: 3,
  },
  {
    id: "academy-assignment-viewing-record",
    courseId: "academy-course-intermediate",
    moduleTitle: "Working with Clients",
    title: "Viewing Record and Client Follow-Up",
    description: "Record a viewing in the Property Viewing Register, complete the Viewing Feedback Form, and submit your written follow-up plan.",
    points: 100,
    dueDays: 14,
    sortOrder: 4,
  },
  {
    id: "academy-assignment-client-qualification-simulation",
    courseId: "academy-course-intermediate",
    moduleTitle: "Working with Clients",
    title: "Buyer & Tenant Qualification Simulation",
    description: "Complete one buyer needs analysis and one tenant needs analysis from practice conversations. Rubric: 30 pts discovery questions, 25 pts documented needs, 25 pts shortlist criteria, 20 pts professional judgement on weak enquiries.",
    points: 100,
    dueDays: 14,
    sortOrder: 5,
  },
  {
    id: "academy-assignment-offer-negotiation-roleplay",
    courseId: "academy-course-intermediate",
    moduleTitle: "Working with Clients",
    title: "Offer Negotiation Roleplay",
    description: "Submit a script or notes showing how you present an offer, record a counter-offer, confirm deadlines, and escalate legal questions. Rubric: 30 pts neutral communication, 25 pts accuracy, 25 pts documentation, 20 pts risk escalation.",
    points: 100,
    dueDays: 14,
    sortOrder: 6,
  },
  {
    id: "academy-assignment-compliance-file",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Documentation, Legal Awareness and Compliance",
    title: "Compliance File Audit Submission",
    description: "Build a sample client file using the File Checklist and Compliance Checklist. Submit evidence that all required document categories are complete and filed correctly.",
    points: 100,
    dueDays: 14,
    sortOrder: 0,
  },
  {
    id: "academy-assignment-property-inspection",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Documentation, Legal Awareness and Compliance",
    title: "Practical Property Inspection Upload",
    description: "Inspect a property, complete the branded inspection checklist, upload photos and submit condition notes for admin review.",
    points: 100,
    dueDays: 14,
    sortOrder: 1,
  },
  {
    id: "academy-assignment-document-risk-review",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Documentation, Legal Awareness and Compliance",
    title: "Document Risk Review & Escalation Notes",
    description: "Review a practice file with authority, signature, estate, cession, or mandate issues. Submit risk flags and file notes. Rubric: 35 pts risk spotting, 25 pts escalation route, 20 pts clear file notes, 20 pts action paused or approved with reasons.",
    points: 100,
    dueDays: 14,
    sortOrder: 2,
  },
  {
    id: "academy-assignment-performance-review",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Becoming a Top-Performing Agent",
    title: "Monthly KPI & Performance Review",
    description: "Complete the Monthly KPI Tracker and Weekly Performance Review for a full month. Submit your analysis of wins, gaps, and next-month targets.",
    points: 100,
    dueDays: 21,
    sortOrder: 3,
  },
  {
    id: "academy-assignment-pipeline-coaching-review",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Becoming a Top-Performing Agent",
    title: "Pipeline Diagnosis & Coaching Plan",
    description: "Submit one monthly KPI dashboard with a written diagnosis and 30-day improvement plan. Rubric: 30 pts accurate metrics, 25 pts diagnosis, 25 pts practical improvement plan, 20 pts weekly follow-up metric.",
    points: 100,
    dueDays: 21,
    sortOrder: 4,
  },
  {
    id: "academy-assignment-field-portfolio",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Becoming a Top-Performing Agent",
    title: "Field Apprenticeship Evidence Portfolio",
    description: "Submit a portfolio containing prospecting log, listing file, qualification file, viewing record, compliance audit, KPI review, and reflection. Rubric: 30 pts completeness, 25 pts quality of evidence, 25 pts confidentiality and organisation, 20 pts learner reflection.",
    points: 150,
    dueDays: 30,
    sortOrder: 5,
  },
];

export const ACADEMY_FINAL_EXAM = {
  id: "academy-final-exam-certified-houselink-agent",
  courseId: "academy-course-advanced-professional",
  title: "HouseLink Agent Foundations Final Examination",
  description: "Capstone examination drawing from all three HouseLink training programmes: Foundations, Listing & Client Mastery, and Professional Training.",
  durationMinutes: 120,
  passingScore: 85,
  attemptLimit: 2,
  minimumQuestions: 35,
};

export function quizIdsForCourse(courseId: string) {
  return ACADEMY_QUIZ_SEEDS.filter((quiz) => quiz.courseId === courseId).map((quiz) => quiz.id);
}

export function assignmentIdsForCourse(courseId: string) {
  return ACADEMY_ASSIGNMENT_SEEDS.filter((assignment) => assignment.courseId === courseId).map((assignment) => assignment.id);
}

export function assessmentMetaForQuiz(quizId: string) {
  const quiz = ACADEMY_QUIZ_SEEDS.find((entry) => entry.id === quizId);
  return quiz ? { moduleTitle: quiz.moduleTitle, sortOrder: quiz.sortOrder } : null;
}

export function assessmentMetaForAssignment(assignmentId: string) {
  const assignment = ACADEMY_ASSIGNMENT_SEEDS.find((entry) => entry.id === assignmentId);
  return assignment ? { moduleTitle: assignment.moduleTitle, sortOrder: assignment.sortOrder } : null;
}
