"use client";

import { useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { AnimatedCurrency } from "@/components/calculators/animated-currency";
import {
  CalculatorCard,
  CalculatorField,
  CalculatorResetButton,
  CalculatorResultRow,
  CalculatorSummary,
} from "@/components/calculators/calculator-ui";
import { formatCalculatorCurrency } from "@/lib/calculators/format";
import { calculateMoveInCost, parseCalculatorNumber } from "@/lib/calculators/formulas";

const DEFAULTS = {
  monthlyRent: "350",
  deposit: "350",
  agentFee: "175",
  movingCosts: "150",
};

export function MoveInCostCalculator({ compact }: { compact?: boolean }) {
  const [monthlyRent, setMonthlyRent] = useState(DEFAULTS.monthlyRent);
  const [deposit, setDeposit] = useState(DEFAULTS.deposit);
  const [agentFee, setAgentFee] = useState(DEFAULTS.agentFee);
  const [movingCosts, setMovingCosts] = useState(DEFAULTS.movingCosts);
  const [depositEdited, setDepositEdited] = useState(false);

  function handleRentChange(value: string) {
    setMonthlyRent(value);
    if (!depositEdited) {
      setDeposit(value);
    }
  }

  function handleDepositChange(value: string) {
    setDepositEdited(true);
    setDeposit(value);
  }

  function reset() {
    setMonthlyRent(DEFAULTS.monthlyRent);
    setDeposit(DEFAULTS.deposit);
    setAgentFee(DEFAULTS.agentFee);
    setMovingCosts(DEFAULTS.movingCosts);
    setDepositEdited(false);
  }

  const result = useMemo(
    () =>
      calculateMoveInCost({
        monthlyRent: parseCalculatorNumber(monthlyRent),
        deposit: parseCalculatorNumber(deposit),
        agentFee: parseCalculatorNumber(agentFee),
        movingCosts: parseCalculatorNumber(movingCosts),
      }),
    [monthlyRent, deposit, agentFee, movingCosts],
  );

  return (
    <CalculatorCard
      id="move-in-cost"
      icon={Truck}
      title="Move-In Cost Calculator"
      description="Estimate the total upfront amount a tenant needs before moving into a property."
      audience="Tenants"
      actions={!compact ? <CalculatorResetButton onClick={reset} /> : undefined}
    >
      <div className={compact ? "grid gap-5" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)] lg:gap-8"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <CalculatorField
            id="move-in-rent"
            label="Monthly Rent"
            suffix="USD"
            value={monthlyRent}
            onChange={handleRentChange}
            required
          />
          <CalculatorField
            id="move-in-deposit"
            label="Deposit"
            hint="Defaults to one month's rent"
            suffix="USD"
            value={deposit}
            onChange={handleDepositChange}
            required
          />
          <CalculatorField
            id="move-in-agent-fee"
            label="Agent Fee"
            suffix="USD"
            value={agentFee}
            onChange={setAgentFee}
          />
          <CalculatorField
            id="move-in-moving"
            label="Estimated Moving Costs"
            hint="Optional"
            suffix="USD"
            value={movingCosts}
            onChange={setMovingCosts}
          />
        </div>

        <CalculatorSummary
          title="Summary"
          highlight={
            <CalculatorResultRow
              label="Total Amount Required to Move In"
              value={
                <AnimatedCurrency value={result.totalRequired} format={formatCalculatorCurrency} />
              }
              emphasis
            />
          }
        >
          <CalculatorResultRow
            label="Monthly Rent"
            value={<AnimatedCurrency value={result.monthlyRent} format={formatCalculatorCurrency} />}
          />
          <CalculatorResultRow
            label="Deposit"
            value={<AnimatedCurrency value={result.deposit} format={formatCalculatorCurrency} />}
          />
          <CalculatorResultRow
            label="Agent Fee"
            value={<AnimatedCurrency value={result.agentFee} format={formatCalculatorCurrency} />}
          />
          <CalculatorResultRow
            label="Moving Costs"
            value={<AnimatedCurrency value={result.movingCosts} format={formatCalculatorCurrency} />}
          />
        </CalculatorSummary>
      </div>
      {compact && (
        <div className="mt-4 flex justify-end">
          <CalculatorResetButton onClick={reset} />
        </div>
      )}
    </CalculatorCard>
  );
}
