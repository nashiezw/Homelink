"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Users, Wallet } from "lucide-react";
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
import { affordabilityBudgetParam, writeRentalAffordabilityMemory } from "@/lib/calculators/affordability-memory";
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
  const maxRentParam = affordabilityBudgetParam({
    recommendedMaxRent: result.recommendedMaxRent,
    remainingAfterRent: result.remainingAfterRent,
    grossRentShare: result.grossRentShare,
    rentPercent: parseCalculatorNumber(rentPercent),
    sharingCount: sharing,
    rating: result.rating,
    ratingLabel: result.ratingLabel,
    savedAt: new Date().toISOString(),
  });

  useEffect(() => {
    writeRentalAffordabilityMemory({
      recommendedMaxRent: result.recommendedMaxRent,
      remainingAfterRent: result.remainingAfterRent,
      grossRentShare: result.grossRentShare,
      rentPercent: parseCalculatorNumber(rentPercent),
      sharingCount: sharing,
      rating: result.rating,
      ratingLabel: result.ratingLabel,
      savedAt: new Date().toISOString(),
    });
  }, [result, rentPercent, sharing]);

  const body = (
    <div className="space-y-5">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.86fr)] lg:gap-8">
      <div className="grid gap-5 sm:grid-cols-2">
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

      {maxRentParam && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/search?intent=rent&type=room&maxPrice=${maxRentParam}&calculatorBudget=1`}
            rel="nofollow"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-500"
          >
            <Search className="size-4" aria-hidden="true" />
            Search rooms
          </Link>
          <Link
            href={`/roommates?budgetMax=${maxRentParam}&source=calculator`}
            rel="nofollow"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <Users className="size-4" aria-hidden="true" />
            Find roommates
          </Link>
        </div>
      )}
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
