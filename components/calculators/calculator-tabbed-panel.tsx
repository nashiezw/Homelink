"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentCommissionCalculator } from "@/components/calculators/agent-commission-calculator";
import { LandlordIncomeCalculator } from "@/components/calculators/landlord-income-calculator";
import { MoveInCostCalculator } from "@/components/calculators/move-in-cost-calculator";
import { RentalAffordabilityCalculator } from "@/components/calculators/rental-affordability-calculator";
import { CALCULATORS, type CalculatorId } from "@/lib/calculators/constants";
import { cn } from "@/lib/utils";

const CALCULATOR_VIEWS: Record<CalculatorId, () => React.ReactNode> = {
  "move-in-cost": () => <MoveInCostCalculator embedded />,
  "rental-affordability": () => <RentalAffordabilityCalculator embedded />,
  "agent-commission": () => <AgentCommissionCalculator embedded />,
  "landlord-income": () => <LandlordIncomeCalculator embedded />,
};

type CalculatorTabbedPanelProps = {
  initialId?: CalculatorId;
  syncHash?: boolean;
};

export function CalculatorTabbedPanel({ initialId, syncHash = true }: CalculatorTabbedPanelProps) {
  const [activeId, setActiveId] = useState<CalculatorId>(initialId ?? CALCULATORS[0]!.id);

  const selectTab = useCallback(
    (id: CalculatorId) => {
      setActiveId(id);
      if (syncHash && typeof window !== "undefined") {
        window.history.replaceState(null, "", `#${id}`);
      }
    },
    [syncHash],
  );

  useEffect(() => {
    if (!syncHash) return;
    const hash = window.location.hash.replace("#", "") as CalculatorId;
    if (hash && CALCULATORS.some((item) => item.id === hash)) {
      setActiveId(hash);
    }
  }, [syncHash]);

  useEffect(() => {
    if (!syncHash) return;
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "") as CalculatorId;
      if (hash && CALCULATORS.some((item) => item.id === hash)) {
        setActiveId(hash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [syncHash]);

  const ActiveView = CALCULATOR_VIEWS[activeId];

  return (
    <div className="premium-card overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
      <div
        role="tablist"
        aria-label="Calculator types"
        className="overflow-x-auto border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80"
      >
        <div className="flex min-w-max gap-1 p-2 sm:gap-2 sm:p-3">
          {CALCULATORS.map((item) => {
            const Icon = item.icon;
            const selected = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`panel-${item.id}`}
                onClick={() => selectTab(item.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:px-4",
                  selected
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-200",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeId}`}
        aria-labelledby={`tab-${activeId}`}
        className="transition-opacity duration-200"
      >
        <ActiveView />
      </div>
    </div>
  );
}
