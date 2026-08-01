"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch, type PublicUser } from "@/lib/api/client";

/** Prompt for continue-with-email buyers to lock in a password after checkout. */
export function SetPasswordCard({
  className,
  title = "Secure your Library access",
  description = "You checked out with email only. Set a password so you can sign back in later and keep your downloads.",
}: {
  className?: string;
  title?: string;
  description?: string;
}) {
  const { user, showToast, refreshUser } = useApp();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Only prompt when API explicitly reports a passwordless checkout account.
  if (!user || user.hasPassword !== false || done) return null;

  async function submit() {
    if (password.length < 8) {
      showToast("Use at least 8 characters for your password.", "error");
      return;
    }
    if (password !== confirm) {
      showToast("Passwords do not match.", "error");
      return;
    }
    setBusy(true);
    const result = await apiFetch<PublicUser>("/api/v1/auth/session", {
      method: "POST",
      body: JSON.stringify({ action: "set_password", password }),
    });
    setBusy(false);
    if (result.error || !result.data) {
      showToast(result.error?.message || "Could not set password.", "error");
      return;
    }
    await refreshUser();
    setDone(true);
    showToast("Password saved. You can sign in with email next time.", "success");
  }

  return (
    <section className={className ?? "surface-panel min-w-0 max-w-full rounded-lg p-4 sm:p-5"}>
      <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
        <KeyRound className="size-4" />
        {title}
      </p>
      <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder="At least 8 characters"
          />
        </label>
        <label className="block text-sm font-medium">
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Repeat password"
          />
        </label>
      </div>
      <Button className="mt-4 w-full sm:w-auto" disabled={busy} onClick={() => void submit()}>
        {busy ? "Saving…" : "Set password"}
      </Button>
    </section>
  );
}
