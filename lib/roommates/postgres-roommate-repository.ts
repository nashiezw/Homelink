import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { listResidenceHistoryFromPostgres } from "@/lib/residence/postgres-tenancy-repository";

export function shouldUsePostgresRoommates() {
  return isPostgresStoreEnabled();
}

export async function getRoommateProfileFromPostgres(userId: string) {
  const row = await getMainPrisma().roommateProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
  return row ? toProfile(row) : null;
}

export async function saveRoommateProfileInPostgres(userId: string, profile: Record<string, unknown>) {
  const data = {
    budgetMin: Number(profile.budgetMin) || 100,
    budgetMax: Number(profile.budgetMax) || 300,
    occupation: stringOrNull(profile.occupation),
    genderPreference: stringOrNull(profile.genderPreference),
    lifestyle: stringOrNull(profile.lifestyle),
    smoking: Boolean(profile.smoking),
    pets: Boolean(profile.pets),
    age: Number(profile.age) || null,
    preferredLocations: Array.isArray(profile.preferredLocations) ? profile.preferredLocations.map(String) : [],
    active: profile.active !== false,
    payload: toJson(profile),
  };
  const row = await getMainPrisma().roommateProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    include: { user: true },
  });
  await refreshMatches(userId);
  return toProfile(row);
}

export async function getRoommateMatchesFromPostgres(userId: string) {
  await refreshMatches(userId);
  const profile = await getMainPrisma().roommateProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return [];
  const rows = await getMainPrisma().roommateMatch.findMany({
    where: { sourceId: profile.id },
    include: { candidate: { include: { user: true } } },
    orderBy: { score: "desc" },
  });
  return rows.map((row) => ({
    userId: row.candidate.userId,
    name: row.candidate.user.name,
    score: row.score,
    reasons: row.reasons,
    profile: toProfile(row.candidate),
  }));
}

export async function getPublicRoommateProfileFromPostgres(userId: string) {
  const profile = await getMainPrisma().roommateProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!profile?.active || profile.user.accountStatus !== "ACTIVE") return null;
  const residenceHistory = await listResidenceHistoryFromPostgres(userId);
  return {
    userId,
    name: profile.user.name,
    city: undefined,
    profile: toProfile(profile),
    residenceHistory,
    listings: [],
  };
}

async function refreshMatches(userId: string) {
  const source = await getMainPrisma().roommateProfile.findUnique({ where: { userId } });
  if (!source) return;
  const candidates = await getMainPrisma().roommateProfile.findMany({
    where: { userId: { not: userId }, active: true },
  });
  await getMainPrisma().roommateMatch.deleteMany({ where: { sourceId: source.id } });
  if (!candidates.length) return;
  await getMainPrisma().roommateMatch.createMany({
    data: candidates.slice(0, 25).map((candidate) => {
      const shared = candidate.preferredLocations.filter((location) => source.preferredLocations.includes(location));
      const score = Math.min(95, 50 + shared.length * 10 + (candidate.smoking === source.smoking ? 10 : 0) + (candidate.pets === source.pets ? 10 : 0));
      return {
        sourceId: source.id,
        candidateId: candidate.id,
        score,
        reasons: [
          ...(shared.length ? [`Shared location interest: ${shared.slice(0, 2).join(", ")}`] : []),
          candidate.smoking === source.smoking ? "Compatible smoking preference" : "Review smoking preference",
          candidate.pets === source.pets ? "Compatible pet preference" : "Review pet preference",
        ],
      };
    }),
    skipDuplicates: true,
  });
}

function toProfile(row: {
  id: string;
  userId: string;
  budgetMin: Prisma.Decimal | number;
  budgetMax: Prisma.Decimal | number;
  occupation: string | null;
  genderPreference: string | null;
  lifestyle: string | null;
  smoking: boolean;
  pets: boolean;
  age: number | null;
  preferredLocations: string[];
  active: boolean;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    userId: row.userId,
    ...payload,
    budgetMin: Number(row.budgetMin),
    budgetMax: Number(row.budgetMax),
    occupation: row.occupation ?? payload.occupation ?? "",
    genderPreference: row.genderPreference ?? payload.genderPreference ?? "any",
    lifestyle: row.lifestyle ?? payload.lifestyle ?? "",
    smoking: row.smoking,
    pets: row.pets,
    age: row.age ?? payload.age,
    preferredLocations: row.preferredLocations,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
