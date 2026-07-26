import { Suspense } from "react";
import { BadgeCheck, Mail, Phone, ShieldCheck } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageGuard } from "@/components/auth/auth-page-guard";
import { PageShell } from "@/components/layout/page-shell";

const authOptions = [
  {
    title: "Continue with email",
    detail: "Sign in to save searches, manage enquiries, and access your dashboard.",
    icon: Mail,
  },
  {
    title: "Verify with phone",
    detail: "Confirm your number for enquiries, WhatsApp updates, and account recovery.",
    icon: Phone,
  },
  {
    title: "Identity verification",
    detail: "Build trust with verified badges and safer property interactions.",
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
          title="Access your HouseLink account safely"
          description="Sign in to save properties, manage enquiries, verify your identity, and continue securely across HouseLink."
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
                Your account keeps your HouseLink activity connected, secure, and easy to manage.
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
