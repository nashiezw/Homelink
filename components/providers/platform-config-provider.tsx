"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api/client";
import type { PublicPlatformConfig } from "@/lib/settings/types";

type PlatformConfigContextValue = {
  config: PublicPlatformConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isFeatureEnabled: (feature: string) => boolean;
};

const PlatformConfigContext = createContext<PlatformConfigContextValue | null>(null);

export function PlatformConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicPlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const result = await apiFetch<PublicPlatformConfig>("/api/v1/platform/config");
    if (result.data) setConfig(result.data);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<PlatformConfigContextValue>(
    () => ({
      config,
      loading,
      refresh,
      isFeatureEnabled: (feature) => config?.featureFlags[feature] !== false,
    }),
    [config, loading],
  );

  return <PlatformConfigContext.Provider value={value}>{children}</PlatformConfigContext.Provider>;
}

export function usePlatformConfig() {
  const ctx = useContext(PlatformConfigContext);
  if (!ctx) throw new Error("usePlatformConfig must be used within PlatformConfigProvider");
  return ctx;
}
