"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, type SetStateAction } from "react";
import { AlertCircle, BadgeCheck, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDefaultDashboard } from "@/lib/auth/roles";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";

const MIN_PASSWORD_LENGTH = 8;

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
  const next = redirectTo === undefined ? searchParams?.get("next") : redirectTo === null ? null : redirectTo;
  const redirectParam = searchParams?.get("redirect");
  const modeParam = searchParams?.get("mode");
  const resolvedInitial =
    initialMode ?? (modeParam === "register" ? "register" : "login");
  const { signIn, register } = useApp();
  const [mode, setMode] = useState<"login" | "register">(resolvedInitial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "email" | "password", string>>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const validation = validateAuthInput(mode, { name, email, password });
    setFieldErrors(validation.fieldErrors);
    if (validation.error) {
      setError(validation.error);
      return;
    }
    setSubmitting(true);
    const result =
      mode === "login"
        ? await signIn({ email, password })
        : await register({ name, email, password, redirectUrl: redirectParam || undefined });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      setFieldErrors(fieldErrorsForApiError(result.error.code));
      // Handle email verification required error
      if (result.error.code === "EMAIL_VERIFICATION_REQUIRED") {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`);
        return;
      }
      // Handle email exists but not verified - redirect to verification page
      if (result.error.code === "EMAIL_EXISTS" && result.error.message && result.error.message.includes("not verified")) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`);
        return;
      }
      return;
    }
    // Check if email verification is required (before checking user/next)
    if (result.requiresEmailVerification) {
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`);
      return;
    }
    if (result.user && next !== null) {
      const destination =
        next && next.startsWith("/") && !next.startsWith("/auth") ? next : getDefaultDashboard(result.user);
      router.push(destination);
    }
  }

  const resetHref = `/auth/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`;
  const nameError = fieldErrors.name;
  const emailError = fieldErrors.email;
  const passwordError = fieldErrors.password;
  const nameHasError = Boolean(nameError);
  const emailHasError = Boolean(emailError);
  const passwordHasError = Boolean(passwordError);

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
      {error ? (
        <div className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p>{error.message}</p>
            {error.code === "PASSWORD_NOT_SET" ? (
              <Link href={resetHref} className="mt-2 inline-flex font-semibold text-red-900 underline underline-offset-2 dark:text-red-100">
                Send me a password setup link
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
      {mode === "register" && (
        <label className="mt-5 grid gap-2 text-sm font-medium">
          Full name
          <input
            className={inputClass(nameHasError)}
            placeholder="Your name"
            value={name}
            onChange={(event) => { setName(event.target.value); clearField("name", setFieldErrors); if (error) setError(null); }}
            aria-invalid={nameHasError}
            aria-describedby={nameError ? "auth-name-error" : undefined}
            required
          />
          {nameError ? <FieldError id="auth-name-error" message={nameError} /> : null}
        </label>
      )}
      <label className="mt-4 grid gap-2 text-sm font-medium">
        Email
        <input
          className={inputClass(emailHasError)}
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={(event) => { setEmail(event.target.value); clearField("email", setFieldErrors); if (error) setError(null); }}
          aria-invalid={emailHasError}
          aria-describedby={emailError ? "auth-email-error" : undefined}
          required
          pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        />
        {emailError ? <FieldError id="auth-email-error" message={emailError} /> : null}
      </label>
      <label className="mt-4 grid gap-2 text-sm font-medium">
        Password
        <span className="relative">
          <input
            className={`${inputClass(passwordHasError)} pr-11`}
            placeholder="At least 8 characters"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => { setPassword(event.target.value); clearField("password", setFieldErrors); if (error) setError(null); }}
            aria-invalid={passwordHasError}
            aria-describedby={passwordError ? "auth-password-error" : undefined}
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
        {passwordError ? <FieldError id="auth-password-error" message={passwordError} /> : null}
      </label>
      {mode === "login" ? (
        <Link href={resetHref} className="mt-3 inline-flex text-sm font-semibold text-ocean hover:underline">
          Forgot password?
        </Link>
      ) : null}
      <Button className="mt-5 w-full" type="submit" disabled={submitting}>
        {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        className="mt-3 w-full text-sm font-medium text-ocean hover:underline"
        onClick={() => { setError(null); setFieldErrors({}); setMode(mode === "login" ? "register" : "login"); }}
      >
        {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

function validateAuthInput(mode: "login" | "register", input: { name: string; email: string; password: string }) {
  const fieldErrors: Partial<Record<"name" | "email" | "password", string>> = {};
  if (mode === "register" && !input.name.trim()) {
    fieldErrors.name = "Enter your full name.";
  }
  if (!input.email.trim()) {
    fieldErrors.email = "Enter your email address.";
  } else if (!isEmail(input.email)) {
    fieldErrors.email = "Enter a valid email address, for example you@example.com.";
  }
  if (!input.password) {
    fieldErrors.password = "Enter your password.";
  } else if (input.password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  const firstMessage = fieldErrors.name ?? fieldErrors.email ?? fieldErrors.password;
  return {
    fieldErrors,
    error: firstMessage ? { code: "FORM_VALIDATION", message: firstMessage } : null,
  };
}

function fieldErrorsForApiError(code: string): Partial<Record<"name" | "email" | "password", string>> {
  if (code === "NAME_REQUIRED") return { name: "Enter your full name." };
  if (code === "INVALID_EMAIL") return { email: "Enter a valid email address." };
  if (code === "EMAIL_EXISTS") return { email: "An account already exists for this email. Sign in or reset your password." };
  if (code === "WEAK_PASSWORD") return { password: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (code === "PASSWORD_NOT_SET") return { password: "This account needs a password setup link before normal sign-in." };
  if (code === "INVALID_CREDENTIALS") return { email: "Check the email address.", password: "Check the password or reset it." };
  return {};
}

function clearField(field: "name" | "email" | "password", setFieldErrors: (value: SetStateAction<Partial<Record<"name" | "email" | "password", string>>>) => void) {
  setFieldErrors((current) => {
    if (!current[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function FieldError({ id, message }: { id: string; message: string }) {
  return <p id={id} className="text-xs font-medium text-red-700 dark:text-red-300">{message}</p>;
}

function inputClass(hasError: boolean) {
  return [
    "h-11 w-full rounded-lg border bg-white px-3 outline-none transition dark:bg-slate-950",
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15 dark:border-red-800"
      : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700",
  ].join(" ");
}
