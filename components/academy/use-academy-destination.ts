"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { resolveAcademyDestination } from "@/lib/academy/academy-user-status";

type AcademyStatus = {
  hasActiveAccess: boolean;
  hasLearnerActivity: boolean;
};

export function useAcademyDestination() {
  const { user } = useApp();
  const [href, setHref] = useState("/academy");
  const [hasActiveAccess, setHasActiveAccess] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setHref("/academy");
      setHasActiveAccess(false);
      setLoaded(true);
      return;
    }

    const result = await apiFetch<AcademyStatus>("/api/v1/academy/status");
    const active = result.data?.hasLearnerActivity ?? false;
    setHasActiveAccess(result.data?.hasActiveAccess ?? false);
    setHref(resolveAcademyDestination(active, true));
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { href, hasActiveAccess, loaded, refresh };
}
