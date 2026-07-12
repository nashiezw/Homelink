/** ISO weekday: 1 = Monday … 7 = Sunday */
export const VIEWING_TIMEZONE = "Africa/Harare";

export type ViewingAvailabilityConfig = {
  timezone: string;
  workingDays: number[];
  slotHours: number[];
  horizonDays: number;
  blockedDates: string[];
  configured: boolean;
};

export const PLATFORM_VIEWING_DEFAULTS: ViewingAvailabilityConfig = {
  timezone: VIEWING_TIMEZONE,
  workingDays: [1, 2, 3, 4, 5, 6],
  slotHours: [9, 11, 14, 16],
  horizonDays: 14,
  blockedDates: [],
  configured: false,
};

export type AgentViewingAvailabilityInput = {
  workingDays: number[];
  slotHours: number[];
  horizonDays?: number;
  blockedDates?: string[];
};

export function normalizeAvailabilityInput(input: AgentViewingAvailabilityInput): ViewingAvailabilityConfig {
  const workingDays = [...new Set(input.workingDays.filter((day) => day >= 1 && day <= 7))].sort((a, b) => a - b);
  const slotHours = [...new Set(input.slotHours.filter((hour) => hour >= 7 && hour <= 19))].sort((a, b) => a - b);
  const blockedDates = [...new Set((input.blockedDates ?? []).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)))].sort();
  return {
    timezone: VIEWING_TIMEZONE,
    workingDays: workingDays.length ? workingDays : PLATFORM_VIEWING_DEFAULTS.workingDays,
    slotHours: slotHours.length ? slotHours : PLATFORM_VIEWING_DEFAULTS.slotHours,
    horizonDays: Math.min(30, Math.max(7, input.horizonDays ?? PLATFORM_VIEWING_DEFAULTS.horizonDays)),
    blockedDates,
    configured: true,
  };
}
