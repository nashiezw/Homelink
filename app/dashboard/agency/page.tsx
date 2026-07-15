import { AgencyDashboardClient } from "@/components/pages/agency-dashboard-client";
import { RequireRole } from "@/components/auth/require-role";
import { requireServerRole } from "@/lib/auth/server-session";

export default async function AgencyDashboardPage() {
  await requireServerRole(["AGENCY_ADMIN", "ADMIN"], { next: "/dashboard/agency" });
  return (
    <RequireRole roles={["AGENCY_ADMIN", "ADMIN"]}>
      <AgencyDashboardClient />
    </RequireRole>
  );
}
