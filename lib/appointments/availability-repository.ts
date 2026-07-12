import type { Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import {
  normalizeAvailabilityInput,
  PLATFORM_VIEWING_DEFAULTS,
  type AgentViewingAvailabilityInput,
  type ViewingAvailabilityConfig,
} from "@/lib/appointments/availability-types";

type StoredSchedule = {
  timezone: string;
  workingDays: number[];
  slotHours: number[];
  horizonDays: number;
  blockedDates: string[];
};

export async function getAgentViewingAvailability(agentId: string): Promise<ViewingAvailabilityConfig> {
  const row = await getMainPrisma().agentViewingAvailability.findUnique({ where: { agentId } });
  if (!row) return { ...PLATFORM_VIEWING_DEFAULTS };
  const schedule = row.schedule as StoredSchedule;
  return {
    timezone: schedule.timezone ?? PLATFORM_VIEWING_DEFAULTS.timezone,
    workingDays: schedule.workingDays?.length ? schedule.workingDays : PLATFORM_VIEWING_DEFAULTS.workingDays,
    slotHours: schedule.slotHours?.length ? schedule.slotHours : PLATFORM_VIEWING_DEFAULTS.slotHours,
    horizonDays: schedule.horizonDays ?? PLATFORM_VIEWING_DEFAULTS.horizonDays,
    blockedDates: schedule.blockedDates ?? [],
    configured: true,
  };
}

export async function saveAgentViewingAvailability(agentId: string, input: AgentViewingAvailabilityInput) {
  const schedule = normalizeAvailabilityInput(input);
  const payload: StoredSchedule = {
    timezone: schedule.timezone,
    workingDays: schedule.workingDays,
    slotHours: schedule.slotHours,
    horizonDays: schedule.horizonDays,
    blockedDates: schedule.blockedDates,
  };
  await getMainPrisma().agentViewingAvailability.upsert({
    where: { agentId },
    update: { schedule: payload as Prisma.InputJsonObject },
    create: { agentId, schedule: payload as Prisma.InputJsonObject },
  });
  return schedule;
}

export async function getAvailabilityForListing(agentId?: string | null): Promise<ViewingAvailabilityConfig> {
  if (!agentId) return { ...PLATFORM_VIEWING_DEFAULTS };
  return getAgentViewingAvailability(agentId);
}
