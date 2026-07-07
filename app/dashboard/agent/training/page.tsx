import { AgentTrainingDashboard } from "@/components/academy/agent-training-dashboard";
import { RequireRole } from "@/components/auth/require-role";

export default function AgentTrainingPage() {
  return (
    <RequireRole roles={["AGENT", "ADMIN"]}>
      <AgentTrainingDashboard />
    </RequireRole>
  );
}
