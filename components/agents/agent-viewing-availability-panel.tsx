"use client";

import { CalendarClock, Clock3, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { ViewingAvailabilityConfig } from "@/lib/appointments/availability-types";
import { cn } from "@/lib/utils";

const DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

const HOUR_OPTIONS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;

type AgentViewingAvailabilityPanelProps = {
  showToast: (message: string, tone?: "error" | "success" | "info") => void;
};

export function AgentViewingAvailabilityPanel({ showToast }: AgentViewingAvailabilityPanelProps) {
  const [availability, setAvailability] = useState<ViewingAvailabilityConfig | null>(null);
  const [workingDays, setWorkingDays] = useState<number[]>([]);
  const [slotHours, setSlotHours] = useState<number[]>([]);
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void apiFetch<{ availability: ViewingAvailabilityConfig }>("/api/v1/agents/viewing-availability").then((result) => {
      if (!result.data) return;
      const value = result.data.availability;
      setAvailability(value);
      setWorkingDays(value.workingDays);
      setSlotHours(value.slotHours);
      setBlockedDates(value.blockedDates);
    });
  }, []);

  function toggleDay(day: number) {
    setWorkingDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b),
    );
  }

  function toggleHour(hour: number) {
    setSlotHours((current) =>
      current.includes(hour) ? current.filter((item) => item !== hour) : [...current, hour].sort((a, b) => a - b),
    );
  }

  async function save() {
    setSaving(true);
    const result = await apiFetch<{ availability: ViewingAvailabilityConfig }>("/api/v1/agents/viewing-availability", {
      method: "PATCH",
      body: JSON.stringify({ workingDays, slotHours, blockedDates }),
    });
    setSaving(false);
    if (result.data) {
      setAvailability(result.data.availability);
      showToast("Viewing availability saved. New requests will use these preferred times.");
    } else {
      showToast(result.error?.message ?? "Could not save availability.", "error");
    }
  }

  if (!availability) {
    return <p className="text-sm text-slate-500">Loading viewing availability...</p>;
  }

  return (
    <section className="premium-card space-y-5 rounded-2xl p-5">
      <div>
        <p className="flex items-center gap-2 font-semibold text-ink dark:text-white">
          <CalendarClock className="size-5 text-emerald-700" />
          Viewing availability
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Set when seekers can request viewings. Requests stay pending until you confirm.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Working days</p>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                workingDays.includes(day.value)
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Offered times (Harare)</p>
        <div className="flex flex-wrap gap-2">
          {HOUR_OPTIONS.map((hour) => (
            <button
              key={hour}
              type="button"
              onClick={() => toggleHour(hour)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                slotHours.includes(hour)
                  ? "border-emerald-600 bg-emerald-700 text-white"
                  : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
              )}
            >
              {hour === 12 ? "12 pm" : hour < 12 ? `${hour} am` : `${hour - 12} pm`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Blocked dates</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={blockedDate}
            onChange={(e) => setBlockedDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!blockedDate || blockedDates.includes(blockedDate)) return;
              setBlockedDates((current) => [...current, blockedDate].sort());
              setBlockedDate("");
            }}
          >
            Add blocked day
          </Button>
        </div>
        {!!blockedDates.length && (
          <div className="mt-2 flex flex-wrap gap-2">
            {blockedDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => setBlockedDates((current) => current.filter((item) => item !== date))}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {date} ×
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
        <Clock3 className="size-3.5" />
        Seekers see up to {availability.horizonDays} days ahead in {availability.timezone}.
      </div>

      <Button onClick={() => void save()} disabled={saving || !workingDays.length || !slotHours.length}>
        <Save className="size-4" />
        {saving ? "Saving..." : availability.configured ? "Update availability" : "Publish availability"}
      </Button>
    </section>
  );
}
