import { requireAdminAsync } from "@/lib/admin/require-admin";
import { buildAgentActivitySummary } from "@/lib/enquiries/agent-activity";
import { listAllEnquiriesFromPostgres, shouldUsePostgresEnquiries } from "@/lib/enquiries/postgres-enquiry-repository";
import { ok, problem } from "@/lib/api/response";
import { defaultPlatformSettings } from "@/lib/settings/defaults";
import { getStore } from "@/lib/store/app-store";

function enquirySettings() {
  return {
    ...defaultPlatformSettings.enquiries,
    ...getStore().getPlatformSettings().enquiries,
  };
}

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  if (shouldUsePostgresEnquiries()) {
    try {
      const enquiries = await listAllEnquiriesFromPostgres();
      return ok({ rows: buildAgentActivitySummary(enquiries, enquirySettings()) });
    } catch (error) {
      console.error("Failed to load agent activity", error);
      return problem(500, "AGENT_ACTIVITY_FAILED", "Agent activity could not be loaded.");
    }
  }

  const store = getStore();
  const enquiries = store.listEnquiries({});
  return ok({ rows: buildAgentActivitySummary(enquiries, enquirySettings()) });
}
