"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, type PublicUser } from "@/lib/api/client";
import type { Listing } from "@/lib/types";

type Toast = {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
};

type AppContextValue = {
  user: PublicUser | null;
  loading: boolean;
  favourites: string[];
  compareIds: string[];
  toast: Toast | null;
  refreshUser: () => Promise<PublicUser | null>;
  refreshFavourites: () => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<PublicUser | null>;
  register: (input: { name: string; email: string; password: string }) => Promise<PublicUser | null>;
  signOut: () => Promise<void>;
  toggleFavourite: (listingId: string) => Promise<void>;
  isFavourite: (listingId: string) => boolean;
  toggleCompare: (listingId: string) => void;
  isCompared: (listingId: string) => boolean;
  showToast: (message: string, tone?: Toast["tone"]) => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const COMPARE_KEY = "homelink_compare";

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = crypto.randomUUID();
    setToast({ id, message, tone });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const result = await apiFetch<PublicUser>("/api/v1/auth/me");
      if (result.data) {
        setUser(result.data);
        return result.data;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const refreshFavourites = useCallback(async () => {
    try {
      const result = await apiFetch<Listing[]>("/api/v1/users/me/favourites");
      if (result.data) {
        setFavourites(result.data.map((listing) => listing.id));
      } else {
        setFavourites([]);
      }
    } catch {
      setFavourites([]);
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(COMPARE_KEY);
    if (stored) {
      try {
        setCompareIds(JSON.parse(stored) as string[]);
      } catch {
        setCompareIds([]);
      }
    }
    void (async () => {
      try {
        const currentUser = await refreshUser();
        if (currentUser) {
          await refreshFavourites();
        } else {
          setFavourites([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshFavourites, refreshUser]);

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      const result = await apiFetch<PublicUser>("/api/v1/auth/session", {
        method: "POST",
        body: JSON.stringify({ ...input, action: "login" }),
      });
      if (result.data) {
        setUser(result.data);
        await refreshFavourites();
        showToast(`Welcome back, ${result.data.name}.`);
        return result.data;
      }
      showToast(result.error?.message ?? "Sign in failed.", "error");
      return null;
    },
    [refreshFavourites, showToast],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const result = await apiFetch<PublicUser>("/api/v1/auth/session", {
        method: "POST",
        body: JSON.stringify({ ...input, action: "register" }),
      });
      if (result.data) {
        setUser(result.data);
        await refreshFavourites();
        showToast(`Account created. Welcome, ${result.data.name}.`);
        return result.data;
      }
      showToast(result.error?.message ?? "Registration failed.", "error");
      return null;
    },
    [refreshFavourites, showToast],
  );

  const signOut = useCallback(async () => {
    await apiFetch("/api/v1/auth/session", { method: "DELETE" });
    setUser(null);
    setFavourites([]);
    showToast("Signed out.");
  }, [showToast]);

  const toggleFavourite = useCallback(
    async (listingId: string) => {
      if (!user) {
        showToast("Sign in to save listings.", "info");
        return;
      }
      const isSaved = favourites.includes(listingId);
      if (isSaved) {
        await apiFetch(`/api/v1/users/me/favourites/${listingId}`, { method: "DELETE" });
        setFavourites((current) => current.filter((id) => id !== listingId));
        showToast("Removed from favourites.");
      } else {
        await apiFetch("/api/v1/users/me/favourites", {
          method: "POST",
          body: JSON.stringify({ listingId }),
        });
        setFavourites((current) => [...current, listingId]);
        showToast("Saved to favourites.");
      }
    },
    [favourites, showToast, user],
  );

  const toggleCompare = useCallback(
    (listingId: string) => {
      setCompareIds((current) => {
        let next = current.includes(listingId)
          ? current.filter((id) => id !== listingId)
          : [...current, listingId].slice(-3);
        window.localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      loading,
      favourites,
      compareIds,
      toast,
      refreshUser,
      refreshFavourites,
      signIn,
      register,
      signOut,
      toggleFavourite,
      isFavourite: (listingId) => favourites.includes(listingId),
      toggleCompare,
      isCompared: (listingId) => compareIds.includes(listingId),
      showToast,
    }),
    [
      user,
      loading,
      favourites,
      compareIds,
      toast,
      refreshUser,
      refreshFavourites,
      signIn,
      register,
      signOut,
      toggleFavourite,
      toggleCompare,
      showToast,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
