export type AgentApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_REVIEW"
  | "INTERVIEW_SCHEDULED"
  | "DOCUMENTS_REQUESTED"
  | "TRAINING"
  | "VERIFICATION"
  | "APPROVED"
  | "DECLINED"
  | "SUSPENDED";

export type AgentLevel = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "ELITE";

export type LeadAssignmentStrategy =
  | "ROUND_ROBIN"
  | "NEAREST_AGENT"
  | "HIGHEST_RATED"
  | "TERRITORY"
  | "MANUAL"
  | "PREMIUM_PRIORITY"
  | "CUSTOM";

export type LeadStatus =
  | "NEW"
  | "ASSIGNED"
  | "ACCEPTED"
  | "REJECTED"
  | "CONTACTED"
  | "VIEWING_SCHEDULED"
  | "OFFER"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export type CommissionType = "SALE" | "RENTAL" | "MANAGEMENT" | "REFERRAL" | "BONUS" | "RECURRING";

export type CommissionStatus = "PENDING" | "APPROVED" | "PAID" | "CANCELLED" | "DISPUTED";
export type LeadSource = "HOMELINK" | "AGENT";
export type LeadAcquisitionChannel =
  | "HOMELINK_WEBSITE"
  | "HOMELINK_MOBILE_APP"
  | "HOMELINK_SOCIAL_MEDIA"
  | "HOMELINK_FACEBOOK"
  | "HOMELINK_MARKETING_CAMPAIGN"
  | "HOMELINK_ADVERTISING"
  | "HOMELINK_PARTNERSHIP"
  | "HOMELINK_REFERRAL"
  | "WALK_IN"
  | "COMPANY_ENQUIRY"
  | "AGENT_NETWORK"
  | "AGENT_REFERRAL"
  | "AGENT_PROSPECTING"
  | "OTHER";
export type CommissionRuleScope =
  | "DEFAULT"
  | "AGENT"
  | "TRANSACTION"
  | "BRANCH"
  | "PROPERTY_TYPE"
  | "PROMOTION"
  | "AGENT_LEVEL";

export type LeadOwnershipAuditEntry = {
  id: string;
  changedById: string;
  changedByName: string;
  changedAt: string;
  oldLeadSource?: LeadSource;
  newLeadSource: LeadSource;
  oldAssignedAgentId?: string;
  newAssignedAgentId?: string;
  reason: string;
};

export type CommissionAuditEntry = {
  id: string;
  changedById: string;
  changedByName: string;
  changedAt: string;
  action: "CREATED" | "PENDING" | "APPROVED" | "PAID" | "CANCELLED" | "DISPUTED" | "RULE_CHANGED" | "OWNERSHIP_CHANGED";
  oldHomelinkSplitPercent?: number;
  newHomelinkSplitPercent?: number;
  oldAgentSplitPercent?: number;
  newAgentSplitPercent?: number;
  reason: string;
};

export type AgentPersonalInfo = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  nationalId: string;
  passport: string;
  phone: string;
  whatsapp: string;
  email: string;
  residentialAddress: string;
};

export type AgentProfessionalInfo = {
  yearsExperience: number;
  currentEmployer: string;
  previousEmployer: string;
  hasDriversLicence: boolean;
  hasOwnVehicle: boolean;
  languages: string[];
  province: string;
  city: string;
  areasCovered: string[];
  propertyTypes: string[];
  specialisations: string[];
};

export type AgentDocuments = {
  nationalIdUrl?: string;
  cvUrl?: string;
  profilePictureUrl?: string;
  policeClearanceUrl?: string;
  professionalCertificatesUrl?: string;
  estateAgencyLicenceUrl?: string;
};

export type AgentBanking = {
  bank: string;
  branch: string;
  accountName: string;
  accountNumber: string;
  ecocash: string;
  onemoney: string;
  innbucks: string;
};

export type AgentReference = {
  name: string;
  company: string;
  phone: string;
  email: string;
  relationship: string;
};

export type AgentApplication = {
  id: string;
  userId?: string;
  status: AgentApplicationStatus;
  personal: AgentPersonalInfo;
  professional: AgentProfessionalInfo;
  documents: AgentDocuments;
  banking: AgentBanking;
  references: AgentReference[];
  emergencyContact: { name: string; phone: string; relationship: string };
  declarationAccepted: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  agentContractAccepted: boolean;
  agentContractSignedAt?: string;
  signatureDataUrl?: string;
  adminNotes: AgentAdminNote[];
  interviewAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentAdminNote = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type AgentProfile = {
  id: string;
  userId: string;
  applicationId: string;
  agentNumber: string;
  agentIdCode: string;
  qrCodeData: string;
  level: AgentLevel;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  biography: string;
  photoUrl?: string;
  areasServed: string[];
  languages: string[];
  specialisations: string[];
  propertyTypes: string[];
  yearsExperience: number;
  completedDeals: number;
  permissions: AgentPermissions;
  territoryIds: string[];
  managerId?: string;
  trainingCompleted: boolean;
  certificateUrl?: string;
  averageRating: number;
  ratingCount: number;
  publicSlug: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentPermissions = {
  canListProperties: boolean;
  canSell: boolean;
  canRent: boolean;
  canManageCommercial: boolean;
  canManageLand: boolean;
  canViewReports: boolean;
  canApproveOffers: boolean;
  canManageClients: boolean;
  canUploadDocuments: boolean;
};

export type AgentTerritory = {
  id: string;
  name: string;
  province: string;
  city: string;
  suburbs: string[];
  postalCodes: string[];
  agentIds: string[];
  active: boolean;
};

export type AgentLead = {
  id: string;
  listingId?: string;
  listingTitle?: string;
  clientUserId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientType: "BUYER" | "TENANT" | "LANDLORD" | "REFERRAL";
  source: string;
  leadSource?: LeadSource;
  acquisitionChannel?: LeadAcquisitionChannel;
  status: LeadStatus;
  createdById?: string;
  createdByName?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  propertyOwnerId?: string;
  propertyOwnerName?: string;
  propertyOwnerEmail?: string;
  propertyOwnerPhone?: string;
  ownershipLocked?: boolean;
  ownershipAudit?: LeadOwnershipAuditEntry[];
  duplicateOwnerReview?: {
    status: "NOT_REQUIRED" | "PENDING_ADMIN_REVIEW" | "CLEARED" | "DUPLICATE_BLOCKED";
    matchedLeadId?: string;
    matchedListingId?: string;
    reason?: string;
    reviewedById?: string;
    reviewedAt?: string;
  };
  city?: string;
  suburb?: string;
  province?: string;
  notes: string;
  viewingAt?: string;
  dealRef?: string;
  closedAt?: string;
  ratingSubmitted?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentCommission = {
  id: string;
  agentId: string;
  agentName: string;
  type: CommissionType;
  status: CommissionStatus;
  dealRef: string;
  leadId?: string;
  listingId?: string;
  leadSource?: LeadSource;
  commissionRuleId?: string;
  commissionRuleLabel?: string;
  commissionPercent?: number;
  paymentStatus?: CommissionStatus;
  reason?: string;
  grossAmount: number;
  homelinkAmount: number;
  agentAmount: number;
  taxAmount: number;
  netAgentAmount: number;
  currency: string;
  ruleSnapshot: CommissionRuleSnapshot;
  auditHistory?: CommissionAuditEntry[];
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  payout?: AgentCommissionPayout;
  createdAt: string;
  updatedAt: string;
};

export type AgentCommissionPayout = {
  method: "bank_transfer" | "ecocash" | "onemoney" | "innbucks" | "cash";
  sourceAccount: string;
  destinationAccount: string;
  reference: string;
  processedBy: string;
  note?: string;
};

export type CommissionRuleSnapshot = {
  ratePercent: number;
  homelinkSplitPercent: number;
  agentSplitPercent: number;
  vatPercent: number;
  leadSource?: LeadSource;
  ruleId?: string;
  ruleLabel?: string;
  scope?: CommissionRuleScope;
  reason?: string;
};

export type CommissionRule = {
  id: string;
  type: CommissionType;
  label: string;
  leadSource?: LeadSource | "ANY";
  scope?: CommissionRuleScope;
  agentId?: string;
  transactionId?: string;
  branchId?: string;
  propertyType?: string;
  agentLevel?: string;
  promotionCode?: string;
  priority?: number;
  reason?: string;
  startsAt?: string;
  endsAt?: string;
  ratePercent: number;
  homelinkSplitPercent: number;
  agentSplitPercent: number;
  minAmount: number;
  maxAmount: number;
  vatPercent: number;
  bonusPercent: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AgentTrainingModule = {
  id: string;
  title: string;
  description: string;
  type: "VIDEO" | "DOCUMENT" | "QUIZ" | "ASSIGNMENT";
  track: AgentTrainingTrack;
  level: AgentTrainingLevel;
  contentUrl?: string;
  durationMinutes: number;
  required: boolean;
  active?: boolean;
  order: number;
  lessons?: AgentTrainingLesson[];
  quiz?: AgentTrainingQuiz;
  resources?: AgentTrainingResource[];
  certificateTitle?: string;
  certificateUrl?: string;
  expiresAfterDays?: number;
  manualSections?: AgentTrainingManualSection[];
};

export type AgentTrainingTrack = "BEGINNER" | "VERIFIED_AGENT" | "SENIOR_AGENT" | "PROPERTY_MANAGER";

export type AgentTrainingLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type AgentTrainingManualSection = {
  id: string;
  title: string;
  body: string;
};

export type AgentTrainingLesson = {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  keyPoints: string[];
};

export type AgentTrainingQuiz = {
  passMark: number;
  questions: AgentTrainingQuestion[];
};

export type AgentTrainingQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export type AgentTrainingResource = {
  id: string;
  title: string;
  description: string;
  url: string;
  type: "PDF" | "DOC" | "CHECKLIST" | "TEMPLATE" | "LINK";
};

export type AgentTrainingProgress = {
  id: string;
  agentId: string;
  moduleId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  score?: number;
  passed?: boolean;
  attemptCount?: number;
  submittedAnswers?: Record<string, string>;
  completedAt?: string;
  expiresAt?: string;
  certificateUrl?: string;
  certificateTitle?: string;
  track?: AgentTrainingTrack;
};

export type AgentTrainingTrackCertificate = {
  track: AgentTrainingTrack;
  title: string;
  completed: boolean;
  completedAt?: string;
  expiresAt?: string;
  certificateUrl?: string;
  requiredModuleIds: string[];
};

export type AgentTrainingAnalytics = {
  totalModules: number;
  requiredModules: number;
  activeModules: number;
  agentsTrained: number;
  averageScore: number;
  failedAttempts: number;
  incompleteAgents: number;
  expiredCompletions: number;
  trackCompletion: Array<{ track: AgentTrainingTrack; completedAgents: number; totalAgents: number; percent: number }>;
};

export type AgentRating = {
  id: string;
  agentId: string;
  customerId: string;
  customerName: string;
  dealRef: string;
  professionalism: number;
  communication: number;
  knowledge: number;
  responsiveness: number;
  overall: number;
  comment?: string;
  createdAt: string;
};

export type AgentAppointment = {
  id: string;
  agentId: string;
  leadId?: string;
  clientName: string;
  clientPhone?: string;
  listingId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes?: string;
};

export type AgentTask = {
  id: string;
  agentId: string;
  title: string;
  dueAt?: string;
  status: "OPEN" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
};

export type AgentWalletEntry = {
  id: string;
  agentId: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balanceAfter: number;
  reference: string;
  description: string;
  createdAt: string;
};

export type ApprovalWorkflowSettings = {
  mode: "MANUAL" | "AUTOMATIC";
  interviewRequired: boolean;
  trainingRequired: boolean;
  documentVerificationRequired: boolean;
  stages: string[];
};

export type AgentSystemSettings = {
  commissionRules: CommissionRule[];
  leadAssignmentStrategy: LeadAssignmentStrategy;
  approvalWorkflow: ApprovalWorkflowSettings;
  levelThresholds: Record<AgentLevel, { minDeals: number; minRating: number }>;
  levelBenefits: Record<AgentLevel, string[]>;
  applicationFormFields: Record<string, boolean>;
  notificationTemplates: Record<string, string>;
  commissionAuditLog?: CommissionAuditEntry[];
  futureAgentLevels?: Array<{ code: string; label: string; description: string; enabled: boolean }>;
  referralBonusPercent: number;
  updatedAt: string;
};

export type AgentPlatformState = {
  settings: AgentSystemSettings;
  applications: AgentApplication[];
  profiles: AgentProfile[];
  territories: AgentTerritory[];
  leads: AgentLead[];
  commissions: AgentCommission[];
  trainingModules: AgentTrainingModule[];
  trainingProgress: AgentTrainingProgress[];
  ratings: AgentRating[];
  appointments: AgentAppointment[];
  tasks: AgentTask[];
  walletEntries: AgentWalletEntry[];
  roundRobinIndex: number;
};

export type AgentDashboardStats = {
  activeLeads: number;
  pendingCommissions: number;
  walletBalance: number;
  completedDeals: number;
  averageRating: number;
  listingsCount: number;
  totalListings: number;
  activeListings: number;
  homelinkLeads: number;
  agentLeads: number;
  closedDeals: number;
  pendingDeals: number;
  expectedEarnings: number;
  pendingCommissionAmount: number;
  approvedCommissionAmount: number;
  paidCommissionAmount: number;
  averageMonthlyEarnings: number;
  leadConversionRate: number;
  appointmentsToday: number;
  openTasks: number;
};

export type AgentAdminAnalytics = {
  totalAgents: number;
  pendingApplications: number;
  approvedAgents: number;
  rejectedAgents: number;
  suspendedAgents: number;
  totalSales: number;
  totalRentals: number;
  totalRevenue: number;
  totalCompanyCommission: number;
  totalAgentCommission: number;
  commissionAwaitingApproval: number;
  commissionAlreadyPaid: number;
  outstandingCommission: number;
  homelinkGeneratedRevenue: number;
  agentGeneratedRevenue: number;
  totalCommissionPaid: number;
  topAgents: Array<{ id: string; name: string; deals: number; revenue: number; rating: number }>;
  topCities: Array<{ city: string; leads: number; closed: number; revenue: number }>;
  topBranches: Array<{ branch: string; leads: number; revenue: number }>;
  leadSourceStats: Array<{ leadSource: LeadSource; leads: number; closed: number; revenue: number }>;
  leadConversionRate: number;
  provincePerformance: Array<{ province: string; leads: number; closed: number }>;
  training?: AgentTrainingAnalytics;
};
