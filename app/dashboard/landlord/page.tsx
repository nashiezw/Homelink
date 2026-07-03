import { LandlordDashboardClient } from "@/components/pages/landlord-dashboard-client";
import { RequireRole } from "@/components/auth/require-role";

export default function LandlordDashboardPage() {
  return (
    <RequireRole roles={["LANDLORD", "AGENT", "ADMIN"]}>
      <LandlordDashboardClient />
    </RequireRole>
  );
}
