import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

const HOLIDAY_REVIEW_TARGET = "HOLIDAY_HOME";

type HolidayReviewMetadata = {
  cleanliness?: number;
  location?: number;
  communication?: number;
  valueForMoney?: number;
  overallExperience?: number;
};

type HolidayReviewRow = Prisma.ReviewGetPayload<{
  include: { author: { select: { name: true } } };
}>;

export function shouldUsePostgresHolidayReviews() {
  return isPostgresStoreEnabled();
}

export async function getHolidayHomeReviewSummaryFromPostgres(listingId: string) {
  const reviews = await getMainPrisma().review.findMany({
    where: { listingId, target: HOLIDAY_REVIEW_TARGET },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!reviews.length) return null;
  const mapped = reviews.map(toHolidayHomeReview);
  const avg = (key: keyof HolidayReviewMetadata) =>
    mapped.reduce((sum, review) => sum + Number(review[key] ?? review.overallExperience), 0) / mapped.length;

  return {
    count: mapped.length,
    cleanliness: avg("cleanliness"),
    location: avg("location"),
    communication: avg("communication"),
    valueForMoney: avg("valueForMoney"),
    overallExperience: avg("overallExperience"),
    reviews: mapped.slice(0, 10),
  };
}

export async function createHolidayHomeReviewInPostgres(input: {
  listingId: string;
  reviewerUserId: string;
  cleanliness: number;
  location: number;
  communication: number;
  valueForMoney: number;
  comment?: string;
}) {
  const cleanliness = normalizeRating(input.cleanliness);
  const location = normalizeRating(input.location);
  const communication = normalizeRating(input.communication);
  const valueForMoney = normalizeRating(input.valueForMoney);
  if (!cleanliness || !location || !communication || !valueForMoney) return null;

  const prisma = getMainPrisma();
  const listing = await prisma.listing.findUnique({ where: { id: input.listingId }, select: { id: true } });
  if (!listing) return null;

  const overallExperience = Math.round(((cleanliness + location + communication + valueForMoney) / 4) * 10) / 10;
  const review = await prisma.review.create({
    data: {
      listingId: input.listingId,
      authorId: input.reviewerUserId,
      rating: Math.round(overallExperience),
      body: input.comment?.trim() ?? "",
      target: HOLIDAY_REVIEW_TARGET,
      metadata: {
        cleanliness,
        location,
        communication,
        valueForMoney,
        overallExperience,
      },
    },
    include: { author: { select: { name: true } } },
  });

  return toHolidayHomeReview(review);
}

function toHolidayHomeReview(row: HolidayReviewRow) {
  const metadata = readMetadata(row.metadata);
  const overallExperience = metadata.overallExperience ?? row.rating;
  return {
    id: row.id,
    listingId: row.listingId ?? "",
    reviewerUserId: row.authorId,
    reviewerName: row.author.name,
    cleanliness: metadata.cleanliness ?? overallExperience,
    location: metadata.location ?? overallExperience,
    communication: metadata.communication ?? overallExperience,
    valueForMoney: metadata.valueForMoney ?? overallExperience,
    overallExperience,
    comment: row.body || undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function readMetadata(value: Prisma.JsonValue | null): HolidayReviewMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return {
    cleanliness: numberOrUndefined(value.cleanliness),
    location: numberOrUndefined(value.location),
    communication: numberOrUndefined(value.communication),
    valueForMoney: numberOrUndefined(value.valueForMoney),
    overallExperience: numberOrUndefined(value.overallExperience),
  };
}

function numberOrUndefined(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeRating(value: unknown) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  return Math.round(rating * 10) / 10;
}
