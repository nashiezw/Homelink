import { AgentDashboardClient } from "@/components/pages/agent-dashboard-client";
import { RequireRole } from "@/components/auth/require-role";

export default function AgentDashboardPage() {
  return (
    <RequireRole roles={["AGENT", "ADMIN"]}>
      <AgentDashboardClient />
    </RequireRole>
  );
}
