"use client";

import { usePlatformConfig } from "@/components/providers/platform-config-provider";

export function MaintenanceBanner() {
  const { config } = usePlatformConfig();
  if (!config?.maintenanceMode) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100">
      {config.maintenanceMessage || "Platform maintenance is in progress."}
    </div>
  );
}
