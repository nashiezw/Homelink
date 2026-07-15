import { LearnerDashboardClient } from "@/components/academy/learner-dashboard-client";
import { requireServerRole } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function LearnerAcademyDashboardPage() {
  await requireServerRole(["PUBLIC_LEARNER", "TRAINER", "AGENT", "ADMIN", "ACADEMY_ADMIN"], { next: "/dashboard/academy" });
  return <LearnerDashboardClient />;
}
