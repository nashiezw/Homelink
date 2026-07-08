"use client";

import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { AnimatedCurrency } from "@/components/calculators/animated-currency";
import {
  CalculatorCard,
  CalculatorField,
  CalculatorResetButton,
  CalculatorResultRow,
  CalculatorSummary,
} from "@/components/calculators/calculator-ui";
import { formatCalculatorCurrency } from "@/lib/calculators/format";
import { calculateLandlordIncome, parseCalculatorNumber } from "@/lib/calculators/formulas";

const DEFAULTS = {
  monthlyRent: "800",
  managementFeePercent: "10",
  otherExpenses: "75",
};

export function LandlordIncomeCalculator() {
  const [monthlyRent, setMonthlyRent] = useState(DEFAULTS.monthlyRent);
  const [managementFeePercent, setManagementFeePercent] = useState(DEFAULTS.managementFeePercent);
  const [otherExpenses, setOtherExpenses] = useState(DEFAULTS.otherExpenses);

  function reset() {
    setMonthlyRent(DEFAULTS.monthlyRent);
    setManagementFeePercent(DEFAULTS.managementFeePercent);
    setOtherExpenses(DEFAULTS.otherExpenses);
  }

  const result = useMemo(
    () =>
      calculateLandlordIncome({
        monthlyRent: parseCalculatorNumber(monthlyRent),
        managementFeePercent: parseCalculatorNumber(managementFeePercent),
        otherExpenses: parseCalculatorNumber(otherExpenses),
      }),
    [monthlyRent, managementFeePercent, otherExpenses],
  );

  return (
    <CalculatorCard
      id="landlord-income"
      icon={Building2}
      title="Landlord Rental Income Calculator"
      description="Estimate gross rent, management fees, and net monthly income from your property."
      audience="Landlords"
      actions={<CalculatorResetButton onClick={reset} />}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)] lg:gap-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <CalculatorField
            id="landlord-rent"
            label="Monthly Rent"
            suffix="USD"
            value={monthlyRent}
            onChange={setMonthlyRent}
            required
          />
          <CalculatorField
            id="landlord-fee"
            label="Property Management Fee"
            suffix="%"
            value={managementFeePercent}
            onChange={setManagementFeePercent}
          />
          <CalculatorField
            id="landlord-expenses"
            label="Other Monthly Expenses"
            hint="Optional — repairs, levies, insurance"
            suffix="USD"
            value={otherExpenses}
            onChange={setOtherExpenses}
          />
        </div>

        <CalculatorSummary
          title="Income Summary"
          highlight={
            <CalculatorResultRow
              label="Estimated Net Monthly Income"
              value={
                <AnimatedCurrency value={result.netMonthlyIncome} format={formatCalculatorCurrency} />
              }
              emphasis
            />
          }
        >
          <CalculatorResultRow
            label="Gross Rental Income"
            value={<AnimatedCurrency value={result.grossRentalIncome} format={formatCalculatorCurrency} />}
          />
          <CalculatorResultRow
            label="Management Fee"
            value={<AnimatedCurrency value={result.managementFee} format={formatCalculatorCurrency} />}
          />
          <CalculatorResultRow
            label="Other Expenses"
            value={<AnimatedCurrency value={result.otherExpenses} format={formatCalculatorCurrency} />}
          />
        </CalculatorSummary>
      </div>
    </CalculatorCard>
  );
}
