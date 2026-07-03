"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { ListingCard } from "@/components/listings/listing-card";
import { PageShell } from "@/components/layout/page-shell";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { Listing } from "@/lib/types";

type SavedSearch = {
  id: string;
  name: string;
  channels: string[];
  filters: Record<string, unknown>;
  enabled: boolean;
};

export function SavedPageClient() {
  const { user, showToast } = useApp();
  const [favourites, setFavourites] = useState<Listing[]>([]);
  const [alerts, setAlerts] = useState<SavedSearch[]>([]);
  const [alertForm, setAlertForm] = useState({
    name: "",
    city: "",
    type: "",
    maxPrice: "",
    channelEmail: true,
    channelWhatsapp: false,
  });

  useEffect(() => {
    void (async () => {
      const favResult = await apiFetch<Listing[]>("/api/v1/users/me/favourites");
      setFavourites(favResult.data ?? []);
      if (user) {
        const alertResult = await apiFetch<SavedSearch[]>("/api/v1/saved-searches");
        setAlerts(alertResult.data ?? []);
      }
    })();
  }, [user]);

  async function createAlert() {
    if (!user) {
      showToast("Sign in to create alerts.", "info");
      return;
    }
    if (!alertForm.name.trim()) {
      showToast("Name your alert before saving it.", "error");
      return;
    }
    if (!alertForm.channelEmail && !alertForm.channelWhatsapp) {
      showToast("Choose at least one alert channel.", "error");
      return;
    }
    const result = await apiFetch<SavedSearch>("/api/v1/saved-searches", {
      method: "POST",
      body: JSON.stringify({
        name: alertForm.name.trim(),
        channels: [
          ...(alertForm.channelEmail ? ["email"] : []),
          ...(alertForm.channelWhatsapp ? ["whatsapp"] : []),
        ],
        filters: {
          city: alertForm.city.trim() || undefined,
          type: alertForm.type || undefined,
          maxPrice: alertForm.maxPrice ? Number(alertForm.maxPrice) : undefined,
        },
      }),
    });
    if (result.data) {
      setAlerts((current) => [result.data as SavedSearch, ...current]);
      setAlertForm({ name: "", city: "", type: "", maxPrice: "", channelEmail: true, channelWhatsapp: false });
      showToast("Alert created.");
    }
  }

  return (
    <PageShell
      eyebrow="Saved"
      title="Favourites and property alerts"
      description="Shortlist homes, compare options, and receive alerts when matching verified listings are published."
      actions={
        <Button onClick={() => void createAlert()}>
          <Bell className="size-4" aria-hidden="true" />
          Create alert
        </Button>
      }
    >
      {!user && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
          Sign in to sync favourites and alerts across devices.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-6 md:grid-cols-2">
          {favourites.length ? (
            favourites.map((listing) => <ListingCard key={listing.id} listing={listing} />)
          ) : (
          <div className="premium-card rounded-lg border-dashed p-8 text-center md:col-span-2">
              <p className="text-lg font-semibold text-ink dark:text-white">No saved listings yet</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Browse search and tap the heart icon to build a shortlist.
              </p>
            </div>
          )}
        </div>
        <aside className="surface-panel h-fit overflow-hidden rounded-lg">
          <div className="bg-gradient-to-br from-ink via-ocean to-emerald-900 p-5 text-white">
            <p className="text-sm font-semibold uppercase tracking-normal text-cyan-100">Alert studio</p>
            <p className="mt-2 text-2xl font-semibold">Catch matching homes before they go cold.</p>
          </div>
          <div className="grid gap-4 p-5">
            <div className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-950/60">
              <p className="font-semibold">Create a property alert</p>
              <div className="mt-3 grid gap-2">
                <input value={alertForm.name} onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })} placeholder="Alert name" className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                <input value={alertForm.city} onChange={(e) => setAlertForm({ ...alertForm, city: e.target.value })} placeholder="City or suburb" className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select value={alertForm.type} onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                    <option value="">Any type</option>
                    <option value="room">Room</option>
                    <option value="flat">Flat</option>
                    <option value="house">House</option>
                    <option value="cottage">Cottage</option>
                    <option value="holiday_home">Holiday home</option>
                  </select>
                  <input value={alertForm.maxPrice} onChange={(e) => setAlertForm({ ...alertForm, maxPrice: e.target.value })} placeholder="Max price" inputMode="numeric" className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={alertForm.channelEmail} onChange={(e) => setAlertForm({ ...alertForm, channelEmail: e.target.checked })} />
                    Email
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={alertForm.channelWhatsapp} onChange={(e) => setAlertForm({ ...alertForm, channelWhatsapp: e.target.checked })} />
                    WhatsApp
                  </label>
                </div>
              </div>
            </div>
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                  <p className="font-semibold">{alert.name}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Channels: {alert.channels.join(" and ")}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Status: {alert.enabled ? "enabled" : "disabled"}</p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                No alerts yet. Create one from your favourite search.
              </div>
            )}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
