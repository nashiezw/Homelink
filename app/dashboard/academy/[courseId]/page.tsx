import { LearnerCoursePageClient } from "@/components/academy/learner-course-page-client";
import { requireServerRole } from "@/lib/auth/server-session";

export default async function LearnerCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  await requireServerRole(["PUBLIC_LEARNER", "TRAINER", "AGENT", "ADMIN", "ACADEMY_ADMIN"], {
    next: `/dashboard/academy/${courseId}`,
  });
  return <LearnerCoursePageClient courseId={courseId} />;
}
