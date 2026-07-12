import type { ViewingAvailabilityConfig } from "@/lib/appointments/availability-types";
import { VIEWING_TIMEZONE } from "@/lib/appointments/availability-types";

export { VIEWING_TIMEZONE };

export type AppointmentSlot = {
  startAt: string;
  available: boolean;
  label: string;
  dayKey: string;
  dayLabel: string;
  timeLabel: string;
};

type HarareDateParts = { year: number; month: number; day: number };

function harareDateParts(date: Date): HarareDateParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIEWING_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read("year"), month: read("month"), day: read("day") };
}

/** Harare local wall-clock → UTC ISO (CAT is UTC+2, no DST). */
function harareLocalToIso(parts: HarareDateParts, hour: number, minute = 0) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour - 2, minute, 0)).toISOString();
}

function slotKey(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIEWING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

function formatDayLabel(iso: string) {
  return new Intl.DateTimeFormat("en-ZW", {
    timeZone: VIEWING_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function formatTimeLabel(iso: string) {
  return new Intl.DateTimeFormat("en-ZW", {
    timeZone: VIEWING_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function addHarareDays(parts: HarareDateParts, days: number): HarareDateParts {
  const cursor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return harareDateParts(cursor);
}

function harareWeekday(parts: HarareDateParts): number {
  const cursor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  const day = cursor.getUTCDay();
  return day === 0 ? 7 : day;
}

export function buildViewingSlots(config: ViewingAvailabilityConfig, bookedStartAts: string[]): AppointmentSlot[] {
  const booked = new Set(bookedStartAts.map(slotKey));
  const today = harareDateParts(new Date());
  const blocked = new Set(config.blockedDates);
  const slots: AppointmentSlot[] = [];

  for (let dayOffset = 1; dayOffset <= config.horizonDays; dayOffset += 1) {
    const dayParts = addHarareDays(today, dayOffset);
    const dayKey = `${dayParts.year}-${String(dayParts.month).padStart(2, "0")}-${String(dayParts.day).padStart(2, "0")}`;
    if (blocked.has(dayKey)) continue;
    if (!config.workingDays.includes(harareWeekday(dayParts))) continue;

    for (const hour of config.slotHours) {
      const startAt = harareLocalToIso(dayParts, hour);
      const dayLabel = formatDayLabel(startAt);
      const timeLabel = formatTimeLabel(startAt);
      slots.push({
        startAt,
        available: !booked.has(slotKey(startAt)),
        label: `${dayLabel} · ${timeLabel}`,
        dayKey,
        dayLabel,
        timeLabel,
      });
    }
  }

  return slots;
}

export function groupSlotsByDay(slots: AppointmentSlot[]) {
  const groups = new Map<string, { dayLabel: string; slots: AppointmentSlot[] }>();
  for (const slot of slots) {
    const existing = groups.get(slot.dayKey);
    if (existing) {
      existing.slots.push(slot);
    } else {
      groups.set(slot.dayKey, { dayLabel: slot.dayLabel, slots: [slot] });
    }
  }
  return Array.from(groups.entries()).map(([dayKey, value]) => ({ dayKey, ...value }));
}
