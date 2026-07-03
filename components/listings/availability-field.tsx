"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatAvailableFrom,
  minAvailabilityDateIso,
  parseAvailableFrom,
  type AvailabilityPreset,
} from "@/lib/listings/availability";

type AvailabilityFieldProps = {
  value: string;
  onChange: (value: string) => void;
  intent?: "rent" | "buy";
  className?: string;
};

const fieldClass =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-600 dark:bg-slate-900";

const chipClass = (active: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
    active
      ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "border-slate-200 text-slate-600 hover:border-emerald-200 dark:border-slate-600 dark:text-slate-300",
  );

export function AvailabilityField({ value, onChange, intent = "rent", className }: AvailabilityFieldProps) {
  const parsed = parseAvailableFrom(value);
  const [preset, setPreset] = useState<AvailabilityPreset>(parsed.preset);
  const [dateIso, setDateIso] = useState(parsed.dateIso);

  useEffect(() => {
    const next = parseAvailableFrom(value);
    setPreset(next.preset);
    setDateIso(next.dateIso);
  }, [value]);

  function apply(nextPreset: AvailabilityPreset, nextDate = dateIso) {
    setPreset(nextPreset);
    if (nextPreset === "date" && !nextDate) {
      nextDate = minAvailabilityDateIso();
      setDateIso(nextDate);
    }
    onChange(formatAvailableFrom(nextPreset, nextDate));
  }

  return (
    <div className={className}>
      <p className="text-sm font-medium">Available from</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Pick a quick option — no need to type dates manually.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={chipClass(preset === "now")} onClick={() => apply("now")}>
          Available now
        </button>
        <button type="button" className={chipClass(preset === "date")} onClick={() => apply("date")}>
          From a date
        </button>
        {intent === "buy" && (
          <button
            type="button"
            className={chipClass(preset === "transfer")}
            onClick={() => apply("transfer")}
          >
            Ready for transfer
          </button>
        )}
      </div>
      {preset === "date" && (
        <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Move-in or handover date
          <input
            type="date"
            min={minAvailabilityDateIso()}
            value={dateIso || minAvailabilityDateIso()}
            onChange={(e) => {
              const next = e.target.value;
              setDateIso(next);
              onChange(formatAvailableFrom("date", next));
            }}
            className={fieldClass}
          />
        </label>
      )}
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Shown to seekers as: <span className="font-medium text-slate-700 dark:text-slate-200">{value || "Available now"}</span>
      </p>
    </div>
  );
}
