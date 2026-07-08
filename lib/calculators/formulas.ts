export type AffordabilityRating =
  | "excellent"
  | "comfortable"
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
  rentShareOfDisposable: number;
  monthlySavingsFromSharing: number;
  rating: AffordabilityRating;
  ratingLabel: string;
};

export type AgentCommissionResult = {
  totalCommission: number;
  agentPercent: number;
  homeLinkPercent: number;
  agentEarnings: number;
  homeLinkEarnings: number;
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
  const rentShareOfDisposable =
    disposableIncome > 0 ? recommendedMaxRent / disposableIncome : recommendedMaxRent > 0 ? 1 : 0;
  const rating = affordabilityRating(rentShareOfDisposable, remainingAfterRent);

  return {
    recommendedMaxRent,
    rentPerPerson,
    remainingAfterRent,
    disposableIncome,
    rentShareOfDisposable,
    monthlySavingsFromSharing,
    rating,
    ratingLabel: affordabilityLabel(rating),
  };
}

export function calculateAgentCommission(input: {
  totalCommission: number;
  agentPercent: number;
}): AgentCommissionResult {
  const totalCommission = clampNonNegative(input.totalCommission);
  const agentPercent = clampPercent(input.agentPercent);
  const homeLinkPercent = 100 - agentPercent;

  return {
    totalCommission,
    agentPercent,
    homeLinkPercent,
    agentEarnings: (totalCommission * agentPercent) / 100,
    homeLinkEarnings: (totalCommission * homeLinkPercent) / 100,
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

function affordabilityRating(rentShareOfDisposable: number, remainingAfterRent: number): AffordabilityRating {
  if (remainingAfterRent < 0) return "not_recommended";
  if (rentShareOfDisposable <= 0.25) return "excellent";
  if (rentShareOfDisposable <= 0.3) return "comfortable";
  if (rentShareOfDisposable <= 0.4) return "stretching";
  return "not_recommended";
}

function affordabilityLabel(rating: AffordabilityRating): string {
  switch (rating) {
    case "excellent":
      return "Excellent Budget";
    case "comfortable":
      return "Comfortable";
    case "stretching":
      return "Stretching Your Budget";
    case "not_recommended":
      return "Not Recommended";
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
