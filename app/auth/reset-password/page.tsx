import { Suspense } from "react";
import { CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/password-recovery-forms";
import { PageShell } from "@/components/layout/page-shell";

const resetSteps = [
  {
    title: "Open your secure link",
    detail: "Use the most recent link from your HouseLink reset email.",
    icon: KeyRound,
  },
  {
    title: "Choose a strong password",
    detail: "Use at least 8 characters and avoid reusing passwords from other sites.",
    icon: LockKeyhole,
  },
  {
    title: "Sign in again",
    detail: "After reset, return to sign in with your new password.",
    icon: CheckCircle2,
  },
];

export default function ResetPasswordPage() {
  return (
    <PageShell
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Complete your password reset and return to your HouseLink account."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-4">
          {resetSteps.map(({ title, detail, icon: Icon }) => (
            <div key={title} className="premium-card rounded-lg p-5">
              <div className="flex gap-3">
                <span className="flex size-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Suspense fallback={<div className="surface-panel h-64 rounded-lg p-5">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
