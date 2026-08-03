"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type ResetRequestResponse = {
  accepted: true;
  delivered: boolean;
  resetUrl?: string;
  message: string;
};

type ResetApplyResponse = {
  ok: true;
  message: string;
};

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams?.get("email") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetUrl(null);
    if (!isEmail(email)) {
      setError("Enter a valid email address, for example you@example.com.");
      return;
    }
    setSubmitting(true);
    const result = await apiFetch<ResetRequestResponse>("/api/v1/auth/password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (!result.data) {
      setError("Password reset could not be started. Try again in a moment.");
      return;
    }
    setMessage(result.data.message);
    setDevResetUrl(result.data.resetUrl ?? null);
  }

  return (
    <form className="surface-panel h-fit rounded-lg p-5" onSubmit={onSubmit}>
      <div className="flex items-center gap-2 text-emerald-700">
        <Mail className="size-5" aria-hidden="true" />
        <p className="font-semibold">Reset your password</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Enter your HouseLink account email and we will send a secure reset link.
      </p>
      {message ? <Feedback tone="success" message={message} /> : null}
      {error ? <Feedback tone="error" message={error} /> : null}
      <label className="mt-5 grid gap-2 text-sm font-medium">
        Email
        <input
          className={inputClass(Boolean(error))}
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={(event) => { setEmail(event.target.value); setError(null); }}
          required
        />
      </label>
      <Button className="mt-5 w-full" type="submit" disabled={submitting}>
        {submitting ? "Sending..." : "Send reset link"}
      </Button>
      {devResetUrl ? (
        <Link href={devResetUrl} className="mt-4 block break-all rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900 hover:underline dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          Local reset link: {devResetUrl}
        </Link>
      ) : null}
      <Link href="/auth" className="mt-4 inline-flex text-sm font-semibold text-ocean hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(token ? null : "This password reset link is missing a token.");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!token) {
      setError("This password reset link is missing a token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    const result = await apiFetch<ResetApplyResponse>("/api/v1/auth/password-reset", {
      method: "PATCH",
      body: JSON.stringify({ token, password }),
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (!result.data) {
      setError("Password could not be reset. Request a new reset link and try again.");
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setMessage(result.data.message);
  }

  return (
    <form className="surface-panel h-fit rounded-lg p-5" onSubmit={onSubmit}>
      <div className="flex items-center gap-2 text-emerald-700">
        <CheckCircle2 className="size-5" aria-hidden="true" />
        <p className="font-semibold">Choose a new password</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Create a new password for your HouseLink account.
      </p>
      {message ? <Feedback tone="success" message={message} /> : null}
      {error ? <Feedback tone="error" message={error} /> : null}
      <PasswordField
        label="New password"
        value={password}
        show={showPassword}
        hasError={Boolean(error)}
        onChange={(value) => { setPassword(value); setError(null); }}
        onToggle={() => setShowPassword((current) => !current)}
      />
      <PasswordField
        label="Confirm password"
        value={confirmPassword}
        show={showPassword}
        hasError={Boolean(error)}
        onChange={(value) => { setConfirmPassword(value); setError(null); }}
        onToggle={() => setShowPassword((current) => !current)}
      />
      <Button className="mt-5 w-full" type="submit" disabled={submitting || !token}>
        {submitting ? "Saving..." : "Reset password"}
      </Button>
      {message ? (
        <Link href="/auth" className="mt-4 inline-flex text-sm font-semibold text-ocean hover:underline">
          Sign in with your new password
        </Link>
      ) : (
        <Link href="/auth/forgot-password" className="mt-4 inline-flex text-sm font-semibold text-ocean hover:underline">
          Request a new reset link
        </Link>
      )}
    </form>
  );
}

function PasswordField({ label, value, show, hasError, onChange, onToggle }: { label: string; value: string; show: boolean; hasError: boolean; onChange: (value: string) => void; onToggle: () => void }) {
  return (
    <label className="mt-5 grid gap-2 text-sm font-medium">
      {label}
      <span className="relative">
        <input
          className={`${inputClass(hasError)} pr-11`}
          placeholder="At least 8 characters"
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={8}
          aria-invalid={hasError}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}

function Feedback({ tone, message }: { tone: "success" | "error"; message: string }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={tone === "success" ? "mt-4 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100" : "mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    "h-11 w-full rounded-lg border bg-white px-3 outline-none transition dark:bg-slate-950",
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15 dark:border-red-800"
      : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700",
  ].join(" ");
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
