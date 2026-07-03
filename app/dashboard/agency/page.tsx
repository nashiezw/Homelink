import { AgencyDashboardClient } from "@/components/pages/agency-dashboard-client";
import { RequireRole } from "@/components/auth/require-role";

export default function AgencyDashboardPage() {
  return (
    <RequireRole roles={["AGENCY_ADMIN", "ADMIN"]}>
      <AgencyDashboardClient />
    </RequireRole>
  );
}
