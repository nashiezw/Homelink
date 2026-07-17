import type { PublicUser } from "@/lib/api/client";
import type { UserRole } from "@/lib/store/types";

export function hasRole(user: PublicUser | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
}

export function hasAnyRole(user: PublicUser | null, roles: UserRole[]): boolean {
  return hasRole(user, ...roles);
}

/** Primary dashboard for a signed-in user (used after login / auth redirect). */
export function getDefaultDashboard(user: PublicUser): string {
  if (user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN") || user.roles.includes("ACADEMY_ADMIN")) return "/dashboard/admin";
  if (user.roles.some((role) => ["SUPPORT", "BILLING", "TECH_SUPPORT", "TRUST_SAFETY"].includes(role))) return "/dashboard/admin?tab=support";
  if (user.roles.includes("AGENCY_ADMIN")) return "/dashboard/agency";
  if (user.roles.includes("CONSULTANT")) return "/dashboard/consultant";
  if (user.roles.includes("AGENT")) return "/dashboard/agent";
  if (user.roles.includes("PUBLIC_LEARNER") || user.roles.includes("TRAINER")) return "/dashboard/academy";
  if (user.roles.includes("LANDLORD")) return "/dashboard/landlord";
  return "/saved";
}

export function canListProperty(user: PublicUser | null): boolean {
  return hasRole(user, "LANDLORD", "AGENT", "AGENCY_ADMIN", "ADMIN");
}

export type NavLinkItem = {
  label: string;
  href: string;
  description?: string;
  /** User must have at least one of these roles (omit = any signed-in user). */
  roles?: UserRole[];
  /** Hide when user has any of these roles. */
  hideForRoles?: UserRole[];
  /** Show only when signed in. */
  signedInOnly?: boolean;
  /** Show only when signed out. */
  signedOutOnly?: boolean;
};

export function filterNavForUser(items: NavLinkItem[], user: PublicUser | null): NavLinkItem[] {
  return items.filter((item) => {
    if (item.signedInOnly && !user) return false;
    if (item.signedOutOnly && user) return false;
    if (item.hideForRoles?.length && user && item.hideForRoles.some((r) => user.roles.includes(r))) {
      return false;
    }
    if (item.roles?.length) {
      if (!user) return false;
      if (!item.roles.some((r) => user.roles.includes(r))) return false;
    }
    return true;
  });
}

export const OWNER_NAV: NavLinkItem[] = [
  {
    label: "Become an Agent",
    href: "/become-agent",
    description: "Join HouseLink as a verified agent",
    hideForRoles: ["AGENT"],
  },
  {
    label: "Property Management",
    href: "/property-management",
    description: "Full-service management for owners",
  },
];

export const WORKSPACE_NAV: NavLinkItem[] = [
  {
    label: "Admin Control Center",
    href: "/dashboard/admin",
    description: "Platform operations and moderation",
    roles: ["ADMIN", "SUPER_ADMIN", "ACADEMY_ADMIN", "MODERATOR", "SUPPORT", "BILLING", "TECH_SUPPORT", "TRUST_SAFETY"],
  },
  {
    label: "Agent Dashboard",
    href: "/dashboard/agent",
    description: "Leads, commissions & listings",
    roles: ["AGENT", "ADMIN"],
  },
  {
    label: "Landlord Dashboard",
    href: "/dashboard/landlord",
    description: "Manage your listings",
    roles: ["LANDLORD", "ADMIN"],
  },
  {
    label: "Agency Dashboard",
    href: "/dashboard/agency",
    description: "Manage your team",
    roles: ["AGENCY_ADMIN", "ADMIN"],
  },
  {
    label: "Consultant Portal",
    href: "/dashboard/consultant",
    description: "Property management workflow",
    roles: ["CONSULTANT", "ADMIN"],
  },
  {
    label: "Academy Dashboard",
    href: "/dashboard/academy",
    description: "Courses, payments, certificates and resources",
    roles: ["PUBLIC_LEARNER", "TRAINER", "AGENT", "ADMIN", "ACADEMY_ADMIN"],
  },
  {
    label: "Owner Portal",
    href: "/dashboard/owner",
    description: "Track property management requests",
    signedInOnly: true,
  },
];

export const ACCOUNT_NAV: NavLinkItem[] = [
  { label: "Saved properties", href: "/saved", signedInOnly: true },
  { label: "My enquiries", href: "/enquiries", signedInOnly: true },
  { label: "Messages", href: "/messages", signedInOnly: true },
  { label: "Tenancies", href: "/dashboard/tenancies", signedInOnly: true },
  { label: "Roommate profile", href: "/roommates/profile", signedInOnly: true },
  { label: "Payments", href: "/payments", signedInOnly: true },
];
