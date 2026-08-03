import { Suspense } from "react";
import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/password-recovery-forms";
import { PageShell } from "@/components/layout/page-shell";

const resetNotes = [
  {
    title: "Secure reset link",
    detail: "Password reset links are single-use and expire quickly.",
    icon: KeyRound,
  },
  {
    title: "Check your inbox",
    detail: "If the email is registered, HouseLink sends instructions to that address.",
    icon: MailCheck,
  },
  {
    title: "Account protection",
    detail: "We do not reveal whether an email address exists on the public form.",
    icon: ShieldCheck,
  },
];

export default function ForgotPasswordPage() {
  return (
    <PageShell
      eyebrow="Account recovery"
      title="Reset your HouseLink password"
      description="Get a secure link and choose a new password for your account."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-4">
          {resetNotes.map(({ title, detail, icon: Icon }) => (
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
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
