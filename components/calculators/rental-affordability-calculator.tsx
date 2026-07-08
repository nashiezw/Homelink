"use client";

import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { AnimatedCurrency } from "@/components/calculators/animated-currency";
import {
  CalculatorCard,
  CalculatorField,
  CalculatorInsights,
  CalculatorPanelHeader,
  CalculatorResetButton,
  CalculatorResultRow,
  CalculatorSummary,
} from "@/components/calculators/calculator-ui";
import { formatCalculatorCurrency, formatCalculatorPercent } from "@/lib/calculators/format";
import { calculateRentalAffordability, parseCalculatorInteger, parseCalculatorNumber } from "@/lib/calculators/formulas";
import { affordabilityRatingStyles, rentalAffordabilityInsights } from "@/lib/calculators/insights";
import { cn } from "@/lib/utils";

const DEFAULTS = {
  monthlyIncome: "1200",
  otherExpenses: "300",
  sharingCount: "1",
  rentPercent: "30",
};

export function RentalAffordabilityCalculator({ embedded }: { embedded?: boolean }) {
  const [monthlyIncome, setMonthlyIncome] = useState(DEFAULTS.monthlyIncome);
  const [otherExpenses, setOtherExpenses] = useState(DEFAULTS.otherExpenses);
  const [sharingCount, setSharingCount] = useState(DEFAULTS.sharingCount);
  const [rentPercent, setRentPercent] = useState(DEFAULTS.rentPercent);

  function reset() {
    setMonthlyIncome(DEFAULTS.monthlyIncome);
    setOtherExpenses(DEFAULTS.otherExpenses);
    setSharingCount(DEFAULTS.sharingCount);
    setRentPercent(DEFAULTS.rentPercent);
  }

  const result = useMemo(
    () =>
      calculateRentalAffordability({
        monthlyIncome: parseCalculatorNumber(monthlyIncome),
        otherExpenses: parseCalculatorNumber(otherExpenses),
        sharingCount: parseCalculatorInteger(sharingCount, 1),
        rentPercent: parseCalculatorNumber(rentPercent),
      }),
    [monthlyIncome, otherExpenses, sharingCount, rentPercent],
  );

  const sharing = parseCalculatorInteger(sharingCount, 1);
  const insights = useMemo(() => rentalAffordabilityInsights(result, sharing), [result, sharing]);

  const body = (
    <div className="space-y-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)] lg:gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <CalculatorField id="afford-income" label="Monthly Income" suffix="USD" value={monthlyIncome} onChange={setMonthlyIncome} required />
        <CalculatorField id="afford-expenses" label="Other Monthly Expenses" suffix="USD" value={otherExpenses} onChange={setOtherExpenses} />
        <CalculatorField id="afford-sharing" label="People Sharing Rent" hint="Optional - leave as 1 if renting alone" value={sharingCount} onChange={setSharingCount} inputMode="numeric" />
        <CalculatorField id="afford-percent" label="Income for Rent" hint="Default 30%" suffix="%" value={rentPercent} onChange={setRentPercent} />
      </div>

      <CalculatorSummary
        title="Recommendation"
        highlight={
          <div className="space-y-4">
            <CalculatorResultRow
              label="Recommended Maximum Rent"
              value={<AnimatedCurrency value={result.recommendedMaxRent} format={formatCalculatorCurrency} />}
              emphasis
            />
            <div className={cn("rounded-xl px-4 py-3 text-center text-sm font-semibold", affordabilityRatingStyles(result.rating))} role="status" aria-live="polite">
              {result.ratingLabel}
            </div>
          </div>
        }
      >
        {result.rentPerPerson !== null && (
          <>
            <CalculatorResultRow label="Rent Per Person" value={<AnimatedCurrency value={result.rentPerPerson} format={formatCalculatorCurrency} />} />
            {result.monthlySavingsFromSharing > 0 && (
              <CalculatorResultRow
                label="Estimated Savings vs Paying Alone"
                value={<AnimatedCurrency value={result.monthlySavingsFromSharing} format={formatCalculatorCurrency} />}
              />
            )}
          </>
        )}
        <CalculatorResultRow label="Remaining Monthly Income After Rent" value={<AnimatedCurrency value={result.remainingAfterRent} format={formatCalculatorCurrency} />} />
        <CalculatorResultRow label="Rent Share of Income" value={formatCalculatorPercent(result.grossRentShare * 100, 0)} />
      </CalculatorSummary>
      </div>

      <CalculatorInsights insights={insights} />
    </div>
  );

  if (embedded) {
    return (
      <>
        <CalculatorPanelHeader
          icon={Wallet}
          title="Rental Affordability Calculator"
          description="Estimate the maximum rent you can comfortably afford based on income, expenses, and your target rent share."
          audience="Renters"
          actions={<CalculatorResetButton onClick={reset} />}
        />
        <div className="p-5 sm:p-6">{body}</div>
      </>
    );
  }

  return (
    <CalculatorCard id="rental-affordability" icon={Wallet} title="Rental Affordability Calculator" description="Estimate the maximum rent you can comfortably afford based on income, expenses, and your target rent share." audience="Renters" actions={<CalculatorResetButton onClick={reset} />}>
      {body}
    </CalculatorCard>
  );
}
