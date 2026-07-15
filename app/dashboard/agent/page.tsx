import { AgentDashboardClient } from "@/components/pages/agent-dashboard-client";
import { RequireRole } from "@/components/auth/require-role";
import { requireServerRole } from "@/lib/auth/server-session";

export default async function AgentDashboardPage() {
  await requireServerRole(["AGENT", "ADMIN"], { next: "/dashboard/agent" });
  return (
    <RequireRole roles={["AGENT", "ADMIN"]}>
      <AgentDashboardClient />
    </RequireRole>
  );
}
