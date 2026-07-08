import {
  Building2,
  Calculator,
  HandCoins,
  Home,
  type LucideIcon,
  Percent,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

export type CalculatorId =
  | "move-in-cost"
  | "rental-affordability"
  | "agent-commission"
  | "landlord-income";

export type CalculatorMeta = {
  id: CalculatorId;
  title: string;
  description: string;
  icon: LucideIcon;
  audience: string;
};

export const CALCULATORS: CalculatorMeta[] = [
  {
    id: "move-in-cost",
    title: "Move-In Cost",
    description: "Estimate the total upfront amount needed before moving into a property.",
    icon: Truck,
    audience: "Tenants",
  },
  {
    id: "rental-affordability",
    title: "Rental Affordability",
    description: "Find a comfortable maximum rent based on your income and expenses.",
    icon: Wallet,
    audience: "Renters",
  },
  {
    id: "agent-commission",
    title: "Agent Commission",
    description: "Split commission between agent earnings and HomeLink platform share.",
    icon: HandCoins,
    audience: "Agents",
  },
  {
    id: "landlord-income",
    title: "Landlord Income",
    description: "Estimate net monthly rental income after fees and expenses.",
    icon: Building2,
    audience: "Landlords",
  },
];

export const CALCULATOR_NAV_ICON = Calculator;
export const CALCULATOR_HERO_ICONS = [Home, Percent, Users, Building2] as const;
