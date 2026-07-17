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
    description: "Document a real or practice client scenario showing ethical needs analysis, confidentiality, and accurate record-keeping. Submit your completed Agent Daily Workflow planner for one week.",
    points: 100,
    dueDays: 14,
    sortOrder: 1,
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
    description: "Prepare a listing file using the listing form, file checklist, marketing checklist and compliance checklist for a practice or real property.",
    points: 100,
    dueDays: 14,
    sortOrder: 1,
  },
  {
    id: "academy-assignment-viewing-record",
    courseId: "academy-course-intermediate",
    moduleTitle: "Working with Clients",
    title: "Viewing Record and Client Follow-Up",
    description: "Record a viewing in the Property Viewing Register, complete the Viewing Feedback Form, and submit your written follow-up plan.",
    points: 100,
    dueDays: 14,
    sortOrder: 2,
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
    id: "academy-assignment-performance-review",
    courseId: "academy-course-advanced-professional",
    moduleTitle: "Becoming a Top-Performing Agent",
    title: "Monthly KPI & Performance Review",
    description: "Complete the Monthly KPI Tracker and Weekly Performance Review for a full month. Submit your analysis of wins, gaps, and next-month targets.",
    points: 100,
    dueDays: 21,
    sortOrder: 2,
  },
];

export const ACADEMY_FINAL_EXAM = {
  id: "academy-final-exam-certified-houselink-agent",
  courseId: "academy-course-advanced-professional",
  title: "Certified HouseLink Agent Final Examination",
  description: "Capstone examination drawing from all three programmes — Foundations, Listing & Client Mastery, and Professional Certification.",
  durationMinutes: 90,
  passingScore: 80,
  attemptLimit: 2,
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
