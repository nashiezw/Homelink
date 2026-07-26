export type AcademyBankQuestion = {
  id: string;
  prompt: string;
  topic: string;
  answers: Array<{ id: string; label: string; value: string }>;
  correctValue: string;
  explanation: string;
};

type BankSeed = {
  prompt: string;
  topic: string;
  answers: string[];
  correct: number;
  explanation: string;
};

const BANK: Record<string, BankSeed[]> = {
  "academy-quiz-beginner-orientation": [
    {
      topic: "Academy pathway",
      prompt: "A learner completes the reading but never downloads or uses the toolkit. What is the professional concern?",
      answers: [
        "They may understand ideas but have not shown practical field application.",
        "Downloads are only decorative and do not matter.",
        "The learner should skip assignments and ask for the certificate.",
        "Toolkit use is only required for admins.",
      ],
      correct: 0,
      explanation: "The staged programme is designed to connect learning with field-ready tools and evidence.",
    },
    {
      topic: "Progress discipline",
      prompt: "A new agent wants to rush all lessons in one afternoon. What is the better HouseLink approach?",
      answers: [
        "Study each stage, complete practical tasks, and review progress with real evidence.",
        "Open every lesson once and rely on memory.",
        "Ignore checkpoints if the agent has property experience.",
        "Complete the final exam before the foundations work.",
      ],
      correct: 0,
      explanation: "Certification value comes from staged competence, not speed alone.",
    },
    {
      topic: "Professional evidence",
      prompt: "Which evidence best proves a learner is becoming field-ready?",
      answers: [
        "Completed planners, file notes, checklist use, quiz passes, and reviewed assignments.",
        "A screenshot of the course page.",
        "A promise that they understand the material.",
        "A list of property WhatsApp groups.",
      ],
      correct: 0,
      explanation: "Field readiness requires evidence a trainer can review.",
    },
  ],
  "academy-quiz-foundations": [
    {
      topic: "Client qualification",
      prompt: "A tenant says they need a place today but will not share budget, work location, or move-in date. What should the agent do?",
      answers: [
        "Qualify the enquiry first and explain why those facts protect everyone involved.",
        "Send random listings until one looks interesting.",
        "Book viewings immediately to avoid losing the lead.",
        "Tell the tenant to pay a deposit before asking questions.",
      ],
      correct: 0,
      explanation: "Strong client work begins with needs analysis and safe qualification.",
    },
    {
      topic: "Ethics and disclosure",
      prompt: "You notice a listing has an old photo that hides current water damage. What is the professional response?",
      answers: [
        "Pause promotion, update the record, and disclose the current condition accurately.",
        "Keep the photo because it attracts more enquiries.",
        "Wait until the client asks during viewing.",
        "Remove all photos and keep the description vague.",
      ],
      correct: 0,
      explanation: "Accurate representation protects client trust and reduces disputes.",
    },
    {
      topic: "Escalation judgement",
      prompt: "A client asks whether a disputed inheritance property can be sold immediately. What should you do?",
      answers: [
        "Explain process limits and escalate legal interpretation to a qualified person.",
        "Give a legal opinion from experience.",
        "Advertise first because documents can be checked later.",
        "Tell the client every estate property is impossible to sell.",
      ],
      correct: 0,
      explanation: "Agents must recognise legal risk and escalate beyond their role.",
    },
  ],
  "academy-quiz-intermediate-listings": [
    {
      topic: "Listing verification",
      prompt: "A landlord sends only a bedroom photo and asks you to publish today. What should happen before go-live?",
      answers: [
        "Collect full property facts, authority, current photos, pricing details, and availability.",
        "Publish immediately and fix mistakes if clients complain.",
        "Use another listing's photos temporarily.",
        "Add premium wording to cover missing details.",
      ],
      correct: 0,
      explanation: "Listings must be verified and complete before publication.",
    },
    {
      topic: "Pricing evidence",
      prompt: "Your CMA shows a lower range than the seller wants. What is the strongest professional action?",
      answers: [
        "Present comparable evidence, discuss risk, and document the agreed pricing strategy.",
        "Hide the CMA to avoid a hard conversation.",
        "Promise the seller the higher price will work.",
        "Refuse to explain pricing because the seller decides.",
      ],
      correct: 0,
      explanation: "Pricing advice should be evidence-based and documented.",
    },
    {
      topic: "Marketing quality",
      prompt: "Which listing description is most useful to a serious buyer?",
      answers: [
        "One with rooms, condition, utilities, access, neighbourhood facts, costs, and restrictions.",
        "One that says beautiful, secure, and must see.",
        "One that avoids defects until after viewing.",
        "One that only lists the asking price.",
      ],
      correct: 0,
      explanation: "High-quality listing copy helps clients decide with real information.",
    },
  ],
  "academy-quiz-intermediate-clients": [
    {
      topic: "Viewing safety",
      prompt: "A client asks to bring several unknown people to a private viewing. What is the best response?",
      answers: [
        "Confirm attendees, keep a register, follow access rules, and protect owner/client safety.",
        "Allow anyone to attend if the client sounds serious.",
        "Cancel all viewings with groups.",
        "Avoid recording names to keep the process friendly.",
      ],
      correct: 0,
      explanation: "Viewing control protects everyone and creates a clear record.",
    },
    {
      topic: "Offer handling",
      prompt: "A buyer makes a verbal offer with several conditions. What should the agent do next?",
      answers: [
        "Record price, conditions, timelines, and contingencies clearly before presentation.",
        "Tell the seller only the price.",
        "Change the conditions to make the offer simpler.",
        "Pressure the buyer to remove all conditions immediately.",
      ],
      correct: 0,
      explanation: "Offers must be complete, accurate, and neutrally presented.",
    },
    {
      topic: "Follow-up discipline",
      prompt: "After a viewing, the client says they are unsure. What is the most useful follow-up?",
      answers: [
        "Capture feedback, identify objections, agree next steps, and update the property record.",
        "Wait silently until they call again.",
        "Mark the client unserious.",
        "Send the same property again every day.",
      ],
      correct: 0,
      explanation: "Structured follow-up turns uncertainty into useful next actions.",
    },
  ],
  "academy-quiz-compliance": [
    {
      topic: "Authority verification",
      prompt: "A person gives you keys but cannot prove they may market the property. What should you do?",
      answers: [
        "Pause marketing until authority is verified and documented.",
        "List the property because keys are enough proof.",
        "Accept deposits but warn clients later.",
        "Use vague ownership wording in the advert.",
      ],
      correct: 0,
      explanation: "Authority must be verified before marketing or taking transaction steps.",
    },
    {
      topic: "Confidentiality",
      prompt: "A landlord asks for another tenant's ID copy as a sample. What is the correct response?",
      answers: [
        "Refuse to share private client documents and use a blank template instead.",
        "Send the ID after hiding the phone number only.",
        "Forward it because the landlord is trusted.",
        "Share it in a group chat for speed.",
      ],
      correct: 0,
      explanation: "Client identity documents are confidential and must be protected.",
    },
    {
      topic: "File audit",
      prompt: "A file has missing signatures but the client says they will sign later. What is safest?",
      answers: [
        "Flag the gap, pause submission if needed, and record the corrective action required.",
        "Submit the file and hope signatures arrive.",
        "Delete incomplete pages.",
        "Let the buyer decide if it matters.",
      ],
      correct: 0,
      explanation: "Incomplete documents create audit and transaction risk.",
    },
  ],
  "academy-quiz-advanced-performance": [
    {
      topic: "Pipeline diagnosis",
      prompt: "Your leads are high but offers are low. What should you examine first?",
      answers: [
        "Qualification quality, listing fit, follow-up timing, pricing, and viewing feedback.",
        "Only the number of social media posts.",
        "Whether clients are wasting time.",
        "How to stop recording pipeline data.",
      ],
      correct: 0,
      explanation: "Pipeline data should diagnose the real conversion gap.",
    },
    {
      topic: "Professional habits",
      prompt: "Which weekly review note shows strongest agent discipline?",
      answers: [
        "Leads contacted, viewings completed, objections found, follow-ups due, and next improvements.",
        "I was busy and tried hard.",
        "Clients were difficult this week.",
        "I will remember everything next week.",
      ],
      correct: 0,
      explanation: "Top agents review measurable activity and behaviour.",
    },
    {
      topic: "Portfolio quality",
      prompt: "A learner submits only a certificate screenshot as portfolio evidence. What is missing?",
      answers: [
        "Field files, client notes, checklist use, KPI review, compliance evidence, and reflection.",
        "Nothing, the certificate is enough.",
        "Only a social media profile link.",
        "A longer biography.",
      ],
      correct: 0,
      explanation: "Portfolio evidence must prove practical competence.",
    },
  ],
  "academy-quiz-professional-toolkit": [
    {
      topic: "Toolkit application",
      prompt: "A buyer is confused about the process after viewing. Which toolkit item helps most?",
      answers: [
        "The buyer journey flowchart with next steps, responsibilities, and documents needed.",
        "A blank commission invoice.",
        "A landlord inspection checklist.",
        "The social media caption template only.",
      ],
      correct: 0,
      explanation: "Journey flowcharts make process expectations visible to clients.",
    },
    {
      topic: "Operational control",
      prompt: "Which habit makes the resource kit useful under pressure?",
      answers: [
        "Consistent file names, current templates, folder discipline, and weekly review.",
        "Keeping every file in one download folder.",
        "Renaming forms randomly after each use.",
        "Using screenshots instead of completed documents.",
      ],
      correct: 0,
      explanation: "Operational discipline makes tools fast and reliable in real work.",
    },
    {
      topic: "Performance records",
      prompt: "Why keep a closed deals register after commission is paid?",
      answers: [
        "To analyse conversion, forecast income, improve service, and support future reporting.",
        "Only because it looks professional.",
        "To replace all client records.",
        "To publish client transaction details publicly.",
      ],
      correct: 0,
      explanation: "Completed deals become business intelligence when recorded properly.",
    },
  ],
};

export function supplementalQuestionsForQuiz(quizId: string): AcademyBankQuestion[] {
  return (BANK[quizId] ?? []).map((question, questionIndex) => ({
    id: `bank-${quizId}-${questionIndex + 1}`,
    prompt: question.prompt,
    topic: question.topic,
    answers: question.answers.map((answer, answerIndex) => ({
      id: `bank-${quizId}-${questionIndex + 1}-answer-${answerIndex}`,
      label: answer,
      value: String(answerIndex),
    })),
    correctValue: String(question.correct),
    explanation: question.explanation,
  }));
}

export function supplementalQuestionsForQuizzes(quizIds: string[]) {
  return quizIds.flatMap((quizId) => supplementalQuestionsForQuiz(quizId));
}

export function isSupplementalQuestionId(questionId: string) {
  return questionId.startsWith("bank-");
}
