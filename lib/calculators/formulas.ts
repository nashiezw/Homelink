export type AffordabilityRating =
  | "excellent"
  | "healthy"
  | "acceptable"
  | "high"
  | "stretching"
  | "not_recommended";

export type MoveInCostResult = {
  monthlyRent: number;
  deposit: number;
  agentFee: number;
  movingCosts: number;
  totalRequired: number;
};

export type RentalAffordabilityResult = {
  recommendedMaxRent: number;
  rentPerPerson: number | null;
  remainingAfterRent: number;
  disposableIncome: number;
  grossRentShare: number;
  rentShareOfDisposable: number;
  monthlySavingsFromSharing: number;
  rating: AffordabilityRating;
  ratingLabel: string;
  ratingDescription: string;
  safestRentTarget: number;
  conservativeRentTarget: number;
};

export type AgentCommissionResult = {
  totalCommission: number;
  agentPercent: number;
  houseLinkPercent: number;
  agentEarnings: number;
  houseLinkEarnings: number;
};

export type LandlordIncomeResult = {
  grossRentalIncome: number;
  managementFee: number;
  otherExpenses: number;
  netMonthlyIncome: number;
};

export function calculateMoveInCost(input: {
  monthlyRent: number;
  deposit: number;
  agentFee: number;
  movingCosts: number;
}): MoveInCostResult {
  const monthlyRent = clampNonNegative(input.monthlyRent);
  const deposit = clampNonNegative(input.deposit);
  const agentFee = clampNonNegative(input.agentFee);
  const movingCosts = clampNonNegative(input.movingCosts);

  return {
    monthlyRent,
    deposit,
    agentFee,
    movingCosts,
    totalRequired: monthlyRent + deposit + agentFee + movingCosts,
  };
}

export function calculateRentalAffordability(input: {
  monthlyIncome: number;
  otherExpenses: number;
  sharingCount: number;
  rentPercent: number;
}): RentalAffordabilityResult {
  const monthlyIncome = clampNonNegative(input.monthlyIncome);
  const otherExpenses = clampNonNegative(input.otherExpenses);
  const sharingCount = Math.max(1, Math.floor(input.sharingCount) || 1);
  const rentPercent = clampPercent(input.rentPercent);

  const recommendedMaxRent = (monthlyIncome * rentPercent) / 100;
  const disposableIncome = Math.max(0, monthlyIncome - otherExpenses);
  const remainingAfterRent = disposableIncome - recommendedMaxRent;
  const rentPerPerson = sharingCount > 1 ? recommendedMaxRent / sharingCount : null;
  const monthlySavingsFromSharing =
    sharingCount > 1 && rentPerPerson !== null ? Math.max(0, recommendedMaxRent - rentPerPerson) : 0;
  const grossRentShare = monthlyIncome > 0 ? recommendedMaxRent / monthlyIncome : recommendedMaxRent > 0 ? 1 : 0;
  const rentShareOfDisposable =
    disposableIncome > 0 ? recommendedMaxRent / disposableIncome : recommendedMaxRent > 0 ? 1 : 0;
  const rating = affordabilityRating(grossRentShare, remainingAfterRent);
  const ratingText = affordabilityText(rating);

  return {
    recommendedMaxRent,
    rentPerPerson,
    remainingAfterRent,
    disposableIncome,
    grossRentShare,
    rentShareOfDisposable,
    monthlySavingsFromSharing,
    rating,
    ratingLabel: ratingText.label,
    ratingDescription: ratingText.description,
    safestRentTarget: monthlyIncome * 0.25,
    conservativeRentTarget: monthlyIncome * 0.3,
  };
}

export function calculateAgentCommission(input: {
  totalCommission: number;
  agentPercent: number;
}): AgentCommissionResult {
  const totalCommission = clampNonNegative(input.totalCommission);
  const agentPercent = clampPercent(input.agentPercent);
  const houseLinkPercent = 100 - agentPercent;

  return {
    totalCommission,
    agentPercent,
    houseLinkPercent,
    agentEarnings: (totalCommission * agentPercent) / 100,
    houseLinkEarnings: (totalCommission * houseLinkPercent) / 100,
  };
}

export function calculateLandlordIncome(input: {
  monthlyRent: number;
  managementFeePercent: number;
  otherExpenses: number;
}): LandlordIncomeResult {
  const grossRentalIncome = clampNonNegative(input.monthlyRent);
  const managementFeePercent = clampPercent(input.managementFeePercent);
  const otherExpenses = clampNonNegative(input.otherExpenses);
  const managementFee = (grossRentalIncome * managementFeePercent) / 100;

  return {
    grossRentalIncome,
    managementFee,
    otherExpenses,
    netMonthlyIncome: grossRentalIncome - managementFee - otherExpenses,
  };
}

function affordabilityRating(grossRentShare: number, remainingAfterRent: number): AffordabilityRating {
  if (remainingAfterRent < 0) return "not_recommended";
  if (grossRentShare <= 0.25) return "excellent";
  if (grossRentShare <= 0.3) return "healthy";
  if (grossRentShare <= 0.35) return "acceptable";
  if (grossRentShare <= 0.4) return "high";
  return "not_recommended";
}

function affordabilityText(rating: AffordabilityRating): { label: string; description: string } {
  switch (rating) {
    case "excellent":
      return {
        label: "Excellent",
        description: "20-25% of gross income. Plenty of room for savings, investing, transport, and other expenses.",
      };
    case "healthy":
      return {
        label: "Healthy",
        description: "25-30% of gross income. Sustainable for most renters when other expenses are controlled.",
      };
    case "acceptable":
      return {
        label: "Acceptable",
        description: "30-35% of gross income. Workable, but you will need a careful monthly budget.",
      };
    case "high":
      return {
        label: "High",
        description: "35-40% of gross income. You may feel stretched, especially with debt, car costs, or dependants.",
      };
    case "stretching":
      return {
        label: "Stretching Your Budget",
        description: "Your rent target is putting pressure on the rest of your budget.",
      };
    case "not_recommended":
      return {
        label: "Not Recommended",
        description: "Over 40% of gross income, or your expenses leave no monthly buffer after rent.",
      };
  }
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function parseCalculatorNumber(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function parseCalculatorInteger(raw: string, min = 1): number {
  const parsed = Math.floor(parseCalculatorNumber(raw));
  return Math.max(min, parsed || min);
}
