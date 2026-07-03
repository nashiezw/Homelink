export type AdminOverview = {
  properties: {
    total: number;
    addedToday: number;
    active: number;
    sold: number;
    rented: number;
    pendingApprovals: number;
    flagged: number;
    duplicates: number;
    fakeDetected: number;
    expired: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    today: number;
    monthly: number;
    forecast: number;
  };
  users: {
    total: number;
    online: number;
    registrationsToday: number;
  };
  alerts: number;
  systemHealth: "healthy" | "degraded" | "critical";
};

export type ChartPoint = { label: string; value: number };

export type AdminUserAnalytics = {
  totals: Record<string, number>;
  growth: ChartPoint[];
  devices: ChartPoint[];
  browsers: ChartPoint[];
  topCities: ChartPoint[];
  registrationSources: ChartPoint[];
};

export type AdminPropertyAnalytics = {
  byCity: ChartPoint[];
  byType: ChartPoint[];
  byProvince: ChartPoint[];
  avgRent: number;
  avgSale: number;
  mostViewed: Array<{ id: string; title: string; views: number }>;
  mostSaved: Array<{ id: string; title: string; saves: number }>;
  qualityIssues: Record<string, number>;
};

export type VerificationItem = {
  id: string;
  userId: string;
  userName: string;
  type: string;
  subject: string;
  submittedAt: string;
  status: string;
  priority: string;
  documentUrl?: string;
};

export type ModerationItem = {
  id: string;
  type: string;
  title: string;
  reason: string;
  priority: string;
  status: string;
  createdAt: string;
  targetId?: string;
  targetType?: string;
  details?: Array<{ label: string; value: string }>;
};

export type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  team?: string;
  assignee: string;
  createdAt: string;
  userName: string;
  customerEmail?: string;
  escalationReason?: string;
  resolutionNote?: string;
  body?: string;
};

export type SystemHealth = {
  api: string;
  database: string;
  email: string;
  sms: string;
  whatsapp: string;
  cloudinary: string;
  payments: string;
  maps: string;
  cpu: number;
  memory: number;
  storage: number;
  queueDepth: number;
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  createdAt: string;
};

export type ActivityItem = {
  id: string;
  message: string;
  time: string;
  type: string;
};
