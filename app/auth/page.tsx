import { Suspense } from "react";
import { BadgeCheck, Mail, Phone, ShieldCheck } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageGuard } from "@/components/auth/auth-page-guard";
import { PageShell } from "@/components/layout/page-shell";

const authOptions = [
  {
    title: "Continue with email",
    detail: "Best for saved searches, documents, and dashboard access.",
    icon: Mail,
  },
  {
    title: "Verify with phone",
    detail: "Recommended for landlords, agents, and WhatsApp enquiries.",
    icon: Phone,
  },
  {
    title: "Identity verification",
    detail: "Unlock trusted badges and reduce fake listing risk.",
    icon: ShieldCheck,
  },
];

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Loading...</div>
      }
    >
      <AuthPageGuard>
        <PageShell
          eyebrow="Account"
          title="Register, sign in, and verify safely"
          description="Sessions are stored securely and power favourites, alerts, dashboards, and messaging."
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="grid gap-4">
              {authOptions.map(({ title, detail, icon: Icon }) => (
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
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-sm">
                <BadgeCheck className="mb-2 size-5" />
                Your account powers saved listings, enquiries, dashboard access, verification, and secure messaging.
              </div>
            </div>
            <Suspense fallback={<div className="surface-panel h-64 rounded-lg p-5">Loading...</div>}>
              <AuthForm />
            </Suspense>
          </div>
        </PageShell>
      </AuthPageGuard>
    </Suspense>
  );
}
