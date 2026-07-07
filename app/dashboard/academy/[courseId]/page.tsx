"use client";

import { use } from "react";
import { CourseLearnerView } from "@/components/academy/course-learner-view";
import { RequireRole } from "@/components/auth/require-role";

export default function LearnerCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  return (
    <RequireRole roles={["PUBLIC_LEARNER", "TRAINER", "AGENT", "ADMIN", "ACADEMY_ADMIN"]}>
      <CourseLearnerView courseId={courseId} />
    </RequireRole>
  );
}
