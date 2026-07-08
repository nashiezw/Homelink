"use client";

import { useMemo, useState } from "react";
import { HandCoins } from "lucide-react";
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
import { formatCalculatorCurrency } from "@/lib/calculators/format";
import { calculateAgentCommission, parseCalculatorNumber } from "@/lib/calculators/formulas";
import { agentCommissionInsights } from "@/lib/calculators/insights";

const DEFAULTS = {
  totalCommission: "1000",
  agentPercent: "60",
};

type SplitPreset = "60-40" | "40-60" | "custom";

export function AgentCommissionCalculator({ embedded }: { embedded?: boolean }) {
  const [totalCommission, setTotalCommission] = useState(DEFAULTS.totalCommission);
  const [agentPercent, setAgentPercent] = useState(DEFAULTS.agentPercent);
  const [preset, setPreset] = useState<SplitPreset>("60-40");

  function applyPreset(next: SplitPreset, percent?: string) {
    setPreset(next);
    if (percent) setAgentPercent(percent);
  }

  function reset() {
    setTotalCommission(DEFAULTS.totalCommission);
    applyPreset("60-40", DEFAULTS.agentPercent);
  }

  function handleAgentPercentChange(value: string) {
    setPreset("custom");
    setAgentPercent(value);
  }

  const result = useMemo(
    () =>
      calculateAgentCommission({
        totalCommission: parseCalculatorNumber(totalCommission),
        agentPercent: parseCalculatorNumber(agentPercent),
      }),
    [totalCommission, agentPercent],
  );

  const insights = useMemo(() => agentCommissionInsights(result), [result]);

  const body = (
    <div className="space-y-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)] lg:gap-8">
      <div className="space-y-4">
        <CalculatorField id="commission-total" label="Total Commission Earned" suffix="USD" value={totalCommission} onChange={setTotalCommission} required />
        <div>
          <p className="text-sm font-semibold text-ink dark:text-slate-100">Commission Split</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose a preset or enter a custom agent share.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CalculatorPresetButton active={preset === "60-40"} onClick={() => applyPreset("60-40", "60")}>60% Agent / 40% HomeLink</CalculatorPresetButton>
            <CalculatorPresetButton active={preset === "40-60"} onClick={() => applyPreset("40-60", "40")}>40% Agent / 60% HomeLink</CalculatorPresetButton>
            <CalculatorPresetButton active={preset === "custom"} onClick={() => setPreset("custom")}>Custom Split</CalculatorPresetButton>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CalculatorField id="commission-agent" label="Agent Share" suffix="%" value={agentPercent} onChange={handleAgentPercentChange} />
          <label htmlFor="commission-homelink" className="block">
            <span className="text-sm font-semibold text-ink dark:text-slate-100">HomeLink Share</span>
            <div className="relative mt-2">
              <input id="commission-homelink" type="text" readOnly value={String(result.homeLinkPercent)} className="w-full cursor-default rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-400">%</span>
            </div>
          </label>
        </div>
      </div>

      <CalculatorSummary
        title="Commission Breakdown"
        highlight={
          <CalculatorResultRow label="Total Commission" value={<AnimatedCurrency value={result.totalCommission} format={(value) => formatCalculatorCurrency(value, 2)} />} emphasis />
        }
      >
        <CalculatorResultRow label="Agent Earnings" value={<AnimatedCurrency value={result.agentEarnings} format={(value) => formatCalculatorCurrency(value, 2)} />} />
        <CalculatorResultRow label="HomeLink Earnings" value={<AnimatedCurrency value={result.homeLinkEarnings} format={(value) => formatCalculatorCurrency(value, 2)} />} />
      </CalculatorSummary>
      </div>

      <CalculatorInsights insights={insights} />
    </div>
  );

  if (embedded) {
    return (
      <>
        <CalculatorPanelHeader icon={HandCoins} title="Agent Commission Calculator" description="Calculate commission splits between HomeLink agents and the platform." audience="Agents" actions={<CalculatorResetButton onClick={reset} />} />
        <div className="p-5 sm:p-6">{body}</div>
      </>
    );
  }

  return (
    <CalculatorCard id="agent-commission" icon={HandCoins} title="Agent Commission Calculator" description="Calculate commission splits between HomeLink agents and the platform." audience="Agents" actions={<CalculatorResetButton onClick={reset} />}>
      {body}
    </CalculatorCard>
  );
}
