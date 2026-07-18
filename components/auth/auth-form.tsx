"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDefaultDashboard } from "@/lib/auth/roles";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";

type AuthFormProps = {
  initialMode?: "login" | "register";
  showBrand?: boolean;
  /** When null, stay on the current page after auth (e.g. inline apply flow). */
  redirectTo?: string | null;
};

export function AuthForm({
  initialMode,
  showBrand = true,
  redirectTo,
}: AuthFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = redirectTo === undefined ? searchParams.get("next") : redirectTo === null ? null : redirectTo;
  const modeParam = searchParams.get("mode");
  const resolvedInitial =
    initialMode ?? (modeParam === "register" ? "register" : "login");
  const { signIn, register } = useApp();
  const [mode, setMode] = useState<"login" | "register">(resolvedInitial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const authedUser =
      mode === "login"
        ? await signIn({ email, password })
        : await register({ name, email, password });
    setSubmitting(false);
    if (authedUser && next !== null) {
      const destination =
        next && next.startsWith("/") && !next.startsWith("/auth") ? next : getDefaultDashboard(authedUser);
      router.push(destination);
    }
  }

  return (
    <form className="surface-panel h-fit rounded-lg p-5" onSubmit={onSubmit}>
      {showBrand && (
        <div className="flex justify-start pb-5">
          <HouseLinkBrand variant="auth" />
        </div>
      )}
      <div className="flex items-center gap-2 text-emerald-700">
        <BadgeCheck className="size-5" aria-hidden="true" />
        <p className="font-semibold">{mode === "login" ? "Sign in" : "Create account"}</p>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Use your HouseLink account email and password. New users can create an account in under a minute.
      </p>
      {mode === "register" && (
        <label className="mt-5 grid gap-2 text-sm font-medium">
          Full name
          <input
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
      )}
      <label className="mt-4 grid gap-2 text-sm font-medium">
        Email
        <input
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-medium">
        Password
        <input
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950"
          placeholder="At least 8 characters"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </label>
      <Button className="mt-5 w-full" type="submit" disabled={submitting}>
        {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        className="mt-3 w-full text-sm font-medium text-ocean hover:underline"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
