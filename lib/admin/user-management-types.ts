import type { AccountStatus, PublicAdminUser, UserRole } from "@/lib/store/types";

export type UserListQuery = {
  role?: UserRole | "ALL";
  status?: AccountStatus | "ALL";
  q?: string;
};

export type LandlordProfile = PublicAdminUser & {
  activeListings: number;
  rentedListings: number;
  totalViews: number;
  totalEnquiries: number;
  avgResponseMin: number;
  occupancyRate: number;
  complaints: number;
  reviews: number;
};

export type AgentProfile = PublicAdminUser & {
  agencyName: string;
  propertiesManaged: number;
  sales: number;
  rentals: number;
  leadConversion: number;
};

export type AgencySummary = {
  id: string;
  name: string;
  city: string;
  email: string;
  phone: string;
  verificationStatus: string;
  subscriptionTier: string;
  agentCount: number;
  listingCount: number;
  revenue: number;
  leadConversion: number;
  topAgents: Array<{ name: string; listings: number }>;
  accountStatus?: string;
};
