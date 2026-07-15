"use client";

import { CourseLearnerView } from "@/components/academy/course-learner-view";
import { RequireRole } from "@/components/auth/require-role";

export function LearnerCoursePageClient({ courseId }: { courseId: string }) {
  return (
    <RequireRole roles={["PUBLIC_LEARNER", "TRAINER", "AGENT", "ADMIN", "ACADEMY_ADMIN"]}>
      <CourseLearnerView courseId={courseId} />
    </RequireRole>
  );
}
