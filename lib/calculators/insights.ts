import type {
  AffordabilityRating,
  AgentCommissionResult,
  LandlordIncomeResult,
  MoveInCostResult,
  RentalAffordabilityResult,
} from "@/lib/calculators/formulas";
import { formatCalculatorCurrency } from "@/lib/calculators/format";

export type CalculatorInsight = {
  tone: "tip" | "positive" | "warning";
  message: string;
};

export function moveInCostInsights(result: MoveInCostResult): CalculatorInsight[] {
  const tips: CalculatorInsight[] = [];
  if (result.monthlyRent <= 0) return tips;

  const monthsUpfront = result.totalRequired / result.monthlyRent;
  if (monthsUpfront >= 3) {
    tips.push({
      tone: "warning",
      message: `You need about ${monthsUpfront.toFixed(1)} months of rent upfront. Budget early and confirm deposit and agent-fee terms before committing.`,
    });
  }

  if (result.deposit > result.monthlyRent * 1.05) {
    tips.push({
      tone: "tip",
      message: "Your deposit is above one month's rent. Ask whether a single-month deposit is negotiable on HomeLink listings.",
    });
  }

  if (result.agentFee > result.monthlyRent * 0.5 && result.agentFee > 0) {
    tips.push({
      tone: "tip",
      message: "Agent fees can vary by property. Confirm what is included before paying so there are no surprise move-in costs.",
    });
  }

  if (result.movingCosts > 0 && result.movingCosts < result.monthlyRent * 0.25) {
    tips.push({
      tone: "positive",
      message: "Your moving estimate looks modest. Shared transport or phased move-ins can reduce this further.",
    });
  }

  return tips;
}

export function rentalAffordabilityInsights(
  result: RentalAffordabilityResult,
  sharingCount: number,
): CalculatorInsight[] {
  const tips: CalculatorInsight[] = [];

  if (result.remainingAfterRent < 0) {
    tips.push({
      tone: "warning",
      message:
        "Your rent target and other expenses exceed your income. Lower your rent percentage, cut expenses, or consider sharing on HomeLink Roommates.",
    });
    return tips;
  }

  if (sharingCount > 1 && result.rentPerPerson !== null && result.monthlySavingsFromSharing > 0) {
    tips.push({
      tone: "positive",
      message: `Sharing with ${sharingCount} people could reduce your personal rent to ${formatCalculatorCurrency(result.rentPerPerson)}/month — about ${formatCalculatorCurrency(result.monthlySavingsFromSharing)} less than paying the full budget alone.`,
    });
    tips.push({
      tone: "tip",
      message: "Splitting rent often frees cash for transport, groceries, and savings. Browse verified roommate profiles on HomeLink to find a compatible match.",
    });
  } else if (sharingCount === 1) {
    tips.push({
      tone: "tip",
      message: "Adding a roommate can lower your personal rent share and improve monthly savings. Try the Roommates section if you are open to sharing.",
    });
  }

  if (result.rentShareOfDisposable <= 0.25 && result.remainingAfterRent > 0) {
    tips.push({
      tone: "positive",
      message: `You would keep about ${formatCalculatorCurrency(result.remainingAfterRent)}/month after rent and expenses — a healthy buffer for emergencies.`,
    });
  }

  if (result.rentShareOfDisposable > 0.35 && result.rentShareOfDisposable <= 0.45) {
    tips.push({
      tone: "warning",
      message: "Rent would take a large share of your leftover income. A cheaper area or shared rental could improve flexibility.",
    });
  }

  return tips;
}

export function agentCommissionInsights(result: AgentCommissionResult): CalculatorInsight[] {
  const tips: CalculatorInsight[] = [];

  if (result.agentPercent >= 60) {
    tips.push({
      tone: "positive",
      message: "This split favours the agent — typical for agents who source and close the deal themselves on HomeLink.",
    });
  } else if (result.agentPercent <= 40) {
    tips.push({
      tone: "tip",
      message: "A lower agent share often applies when HomeLink generates the lead or provides heavy platform support. Confirm the split before closing.",
    });
  }

  if (result.agentEarnings > 0 && result.homeLinkEarnings > 0) {
    const agentShare = Math.round((result.agentEarnings / result.totalCommission) * 100);
    tips.push({
      tone: "tip",
      message: `On this deal you keep ${agentShare}% (${formatCalculatorCurrency(result.agentEarnings, 2)}) and HomeLink retains ${100 - agentShare}% for platform, verification, and marketing.`,
    });
  }

  return tips;
}

export function landlordIncomeInsights(result: LandlordIncomeResult): CalculatorInsight[] {
  const tips: CalculatorInsight[] = [];

  if (result.grossRentalIncome <= 0) return tips;

  const netMargin = (result.netMonthlyIncome / result.grossRentalIncome) * 100;

  if (result.netMonthlyIncome < 0) {
    tips.push({
      tone: "warning",
      message: "Costs exceed rent on this estimate. Review management fees, levies, and maintenance before listing or renewing a mandate.",
    });
    return tips;
  }

  if (netMargin >= 75) {
    tips.push({
      tone: "positive",
      message: `You retain about ${netMargin.toFixed(0)}% of gross rent after fees — a strong margin for reinvestment or reserves.`,
    });
  }

  if (result.managementFee > result.grossRentalIncome * 0.15) {
    tips.push({
      tone: "tip",
      message: "Management fees above 15% add up quickly. Compare self-management vs HomeLink Property Management for your portfolio size.",
    });
  }

  if (result.otherExpenses > result.grossRentalIncome * 0.2) {
    tips.push({
      tone: "warning",
      message: "Other expenses are high relative to rent. Set aside a maintenance float so vacancies or repairs do not erode income.",
    });
  }

  return tips;
}

export function insightToneClass(tone: CalculatorInsight["tone"]): string {
  switch (tone) {
    case "positive":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100";
    case "tip":
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200";
  }
}

export function affordabilityRatingStyles(rating: AffordabilityRating): string {
  switch (rating) {
    case "excellent":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "comfortable":
      return "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100";
    case "stretching":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
    case "not_recommended":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
  }
}
