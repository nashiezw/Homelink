"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DateRangePreset = "7d" | "30d" | "90d" | "ytd" | "12m" | "custom";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface AnalyticsDateRangeFilterProps {
  onRangeChange: (range: DateRange, preset: DateRangePreset) => void;
  defaultPreset?: DateRangePreset;
  className?: string;
}

const PRESETS: Array<{ value: DateRangePreset; label: string; description: string }> = [
  { value: "7d", label: "Last 7 days", description: "Past week" },
  { value: "30d", label: "Last 30 days", description: "Past month" },
  { value: "90d", label: "Last 90 days", description: "Past quarter" },
  { value: "ytd", label: "Year to date", description: "This year" },
  { value: "12m", label: "Last 12 months", description: "Past year" },
  { value: "custom", label: "Custom range", description: "Select dates" },
];

export function AnalyticsDateRangeFilter({ onRangeChange, defaultPreset = "30d", className }: AnalyticsDateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(defaultPreset);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const getDateRange = (preset: DateRangePreset): DateRange => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date(now);
    
    switch (preset) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "ytd":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "12m":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "custom":
        if (customStartDate) {
          startDate = new Date(customStartDate);
        }
        if (customEndDate) {
          endDate.setTime(new Date(customEndDate).getTime());
        }
        break;
    }
    
    startDate.setHours(0, 0, 0, 0);
    
    return { startDate, endDate };
  };

  const handlePresetSelect = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      const range = getDateRange(preset);
      onRangeChange(range, preset);
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (customStartDate && customEndDate) {
      const range = getDateRange("custom");
      onRangeChange(range, "custom");
      setIsOpen(false);
    }
  };

  const selectedPresetLabel = PRESETS.find(p => p.value === selectedPreset)?.label || "Custom range";

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Calendar className="size-4" />
        {selectedPresetLabel}
        <ChevronDown className="size-4" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/10 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Date Range</h3>
              <p className="text-xs text-slate-400">Select a preset or custom range</p>
            </div>

            <div className="space-y-1 mb-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition",
                    selectedPreset === preset.value
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "hover:bg-white/5 text-slate-300"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{preset.label}</p>
                    <p className="text-xs text-slate-400">{preset.description}</p>
                  </div>
                  {selectedPreset === preset.value && (
                    <div className="size-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              ))}
            </div>

            {selectedPreset === "custom" && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <Button
                  onClick={handleCustomApply}
                  disabled={!customStartDate || !customEndDate}
                  className="w-full"
                >
                  Apply Custom Range
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
