import { LandlordDashboardClient } from "@/components/pages/landlord-dashboard-client";
import { RequireRole } from "@/components/auth/require-role";
import { requireServerRole } from "@/lib/auth/server-session";

export default async function LandlordDashboardPage() {
  await requireServerRole(["LANDLORD", "AGENT", "ADMIN"], { next: "/dashboard/landlord" });
  return (
    <RequireRole roles={["LANDLORD", "AGENT", "ADMIN"]}>
      <LandlordDashboardClient />
    </RequireRole>
  );
}
