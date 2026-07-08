"use client";

import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { AnimatedCurrency } from "@/components/calculators/animated-currency";
import {
  CalculatorCard,
  CalculatorField,
  CalculatorInsights,
  CalculatorPanelHeader,
  CalculatorPresetButton,
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
        <div className="sm:col-span-2">
          <CalculatorField id="afford-percent" label="Income for Rent" hint="Try 25-30% for a safer budget, 35-40% only with strong savings." suffix="%" value={rentPercent} onChange={setRentPercent} />
          <div className="mt-3 flex flex-wrap gap-2">
            <CalculatorPresetButton active={rentPercent === "25"} onClick={() => setRentPercent("25")}>25% Safe</CalculatorPresetButton>
            <CalculatorPresetButton active={rentPercent === "30"} onClick={() => setRentPercent("30")}>30% Healthy</CalculatorPresetButton>
            <CalculatorPresetButton active={rentPercent === "35"} onClick={() => setRentPercent("35")}>35% Careful</CalculatorPresetButton>
            <CalculatorPresetButton active={rentPercent === "40"} onClick={() => setRentPercent("40")}>40% High</CalculatorPresetButton>
          </div>
        </div>
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
              <span className="block">{result.ratingLabel}</span>
              <span className="mt-1 block text-xs font-medium leading-relaxed">{result.ratingDescription}</span>
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
        <CalculatorResultRow label="Rent Share of Gross Income" value={formatCalculatorPercent(result.grossRentShare * 100, 0)} />
        <CalculatorResultRow label="Disposable Income Before Rent" value={<AnimatedCurrency value={result.disposableIncome} format={formatCalculatorCurrency} />} />
        <CalculatorResultRow label="Rent Share of Disposable Income" value={formatCalculatorPercent(result.rentShareOfDisposable * 100, 0)} />
        <CalculatorResultRow label="Safer 25% Rent Target" value={<AnimatedCurrency value={result.safestRentTarget} format={formatCalculatorCurrency} />} />
        <CalculatorResultRow label="Healthy 30% Rent Ceiling" value={<AnimatedCurrency value={result.conservativeRentTarget} format={formatCalculatorCurrency} />} />
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
