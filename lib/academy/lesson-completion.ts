import type { Prisma } from "@prisma/client";

export const completedLessonProgressWhere: Pick<Prisma.LessonProgressWhereInput, "OR"> = {
  OR: [
    { status: "COMPLETED" },
    { completedAt: { not: null } },
  ],
};

export function isLessonProgressComplete(progress: { status: string; completedAt?: Date | string | null }) {
  return progress.status === "COMPLETED" || progress.completedAt != null;
}
