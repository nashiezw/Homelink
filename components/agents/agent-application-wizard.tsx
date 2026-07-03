"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { PageShell } from "@/components/layout/page-shell";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { apiFetch } from "@/lib/api/client";
import type { AgentApplication } from "@/lib/agents/types";

const STEPS = ["Personal", "Professional", "Documents", "Banking", "References", "Declaration"];

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-600 dark:bg-slate-900";

export function AgentApplicationWizard() {
  const router = useRouter();
  const { user, showToast } = useApp();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<AgentApplication | null>(null);

  useEffect(() => {
    if (!user) return;
    void apiFetch<AgentApplication | null>("/api/v1/agents/applications").then((res) => {
      if (res.data) setApplication(res.data);
      else {
        void apiFetch<AgentApplication>("/api/v1/agents/applications", { method: "POST" }).then((created) => {
          if (created.data) setApplication(created.data);
        });
      }
    });
  }, [user]);

  async function save(patch: Partial<AgentApplication>) {
    if (!application) return;
    setSaving(true);
    const result = await apiFetch<AgentApplication>("/api/v1/agents/applications", {
      method: "PATCH",
      body: JSON.stringify({ ...application, ...patch, id: application.id }),
    });
    setSaving(false);
    if (result.data) setApplication(result.data);
  }

  async function submit() {
    if (!application) return;
    await save(application);
    const result = await apiFetch(`/api/v1/agents/applications/${application.id}/submit`, { method: "POST" });
    if (result.data) {
      showToast("Application submitted successfully!");
      router.push("/dashboard/agent");
    } else {
      showToast(result.error?.message ?? "Could not submit.", "error");
    }
  }

  if (!user) {
    return (
      <PageShell
        eyebrow="Agent application"
        title="Start your agent application"
        description="Create a free HomeLink account or sign in to save your progress and submit for review."
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="premium-card rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink dark:text-white">What you&apos;ll need</h2>
            <ul className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                "Personal details and contact information",
                "Professional experience and service areas",
                "ID, licence, and proof-of-address documents",
                "Banking details for commission payouts",
                "Two professional references",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="font-semibold text-emerald-700">•</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-slate-500">
              New to HomeLink? Choose <strong>Create account</strong> on the right — your application starts automatically after registration.
            </p>
          </div>
          <Suspense fallback={<div className="surface-panel h-64 rounded-lg p-5">Loading...</div>}>
            <AuthForm initialMode="register" showBrand={false} redirectTo={null} />
          </Suspense>
        </div>
      </PageShell>
    );
  }

  if (!application) {
    return <p className="p-8 text-center text-slate-500">Loading application...</p>;
  }

  const statusLabel = application.status.replace(/_/g, " ");

  return (
    <PageShell
      eyebrow="Agent application"
      title="HomeLink agent application"
      description={`Complete all steps and submit for review. Current status: ${statusLabel}`}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              step === index ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      <div className="premium-card rounded-xl p-6">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["fullName", "Full name"],
              ["dateOfBirth", "Date of birth", "date"],
              ["gender", "Gender"],
              ["nationalId", "National ID"],
              ["passport", "Passport"],
              ["phone", "Phone"],
              ["whatsapp", "WhatsApp"],
              ["email", "Email", "email"],
            ].map(([key, label, type = "text"]) => (
              <label key={key} className="block text-sm font-medium sm:col-span-2">
                {label}
                <input
                  type={type}
                  value={(application.personal as Record<string, string>)[key] ?? ""}
                  onChange={(e) =>
                    setApplication({
                      ...application,
                      personal: { ...application.personal, [key]: e.target.value },
                    })
                  }
                  className={fieldClass}
                />
              </label>
            ))}
            <label className="block text-sm font-medium sm:col-span-2">
              Residential address
              <input
                value={application.personal.residentialAddress}
                onChange={(e) =>
                  setApplication({ ...application, personal: { ...application.personal, residentialAddress: e.target.value } })
                }
                className={fieldClass}
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Years of experience
              <input
                type="number"
                min={0}
                value={application.professional.yearsExperience}
                onChange={(e) =>
                  setApplication({
                    ...application,
                    professional: { ...application.professional, yearsExperience: Number(e.target.value) },
                  })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Province
              <input
                value={application.professional.province}
                onChange={(e) =>
                  setApplication({ ...application, professional: { ...application.professional, province: e.target.value } })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              City
              <input
                value={application.professional.city}
                onChange={(e) =>
                  setApplication({ ...application, professional: { ...application.professional, city: e.target.value } })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Areas covered (comma separated)
              <input
                value={application.professional.areasCovered.join(", ")}
                onChange={(e) =>
                  setApplication({
                    ...application,
                    professional: {
                      ...application.professional,
                      areasCovered: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    },
                  })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Languages (comma separated)
              <input
                value={application.professional.languages.join(", ")}
                onChange={(e) =>
                  setApplication({
                    ...application,
                    professional: {
                      ...application.professional,
                      languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    },
                  })
                }
                className={fieldClass}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={application.professional.hasDriversLicence}
                onChange={(e) =>
                  setApplication({
                    ...application,
                    professional: { ...application.professional, hasDriversLicence: e.target.checked },
                  })
                }
              />
              Driver&apos;s licence
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={application.professional.hasOwnVehicle}
                onChange={(e) =>
                  setApplication({
                    ...application,
                    professional: { ...application.professional, hasOwnVehicle: e.target.checked },
                  })
                }
              />
              Own vehicle
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6">
            <ImageUploader
              label="Profile picture"
              folder="agents"
              max={1}
              value={application.documents.profilePictureUrl ? [application.documents.profilePictureUrl] : []}
              onChange={(urls) =>
                setApplication({
                  ...application,
                  documents: { ...application.documents, profilePictureUrl: urls[0] },
                })
              }
            />
            <ImageUploader
              label="National ID"
              folder="agents"
              max={1}
              value={application.documents.nationalIdUrl ? [application.documents.nationalIdUrl] : []}
              onChange={(urls) =>
                setApplication({ ...application, documents: { ...application.documents, nationalIdUrl: urls[0] } })
              }
            />
            <ImageUploader
              label="CV"
              folder="agents"
              max={1}
              value={application.documents.cvUrl ? [application.documents.cvUrl] : []}
              onChange={(urls) =>
                setApplication({ ...application, documents: { ...application.documents, cvUrl: urls[0] } })
              }
            />
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["bank", "Bank"],
              ["branch", "Branch"],
              ["accountName", "Account name"],
              ["accountNumber", "Account number"],
              ["ecocash", "EcoCash"],
              ["onemoney", "OneMoney"],
              ["innbucks", "InnBucks"],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm font-medium">
                {label}
                <input
                  value={(application.banking as Record<string, string>)[key] ?? ""}
                  onChange={(e) =>
                    setApplication({ ...application, banking: { ...application.banking, [key]: e.target.value } })
                  }
                  className={fieldClass}
                />
              </label>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4">
            <label className="block text-sm font-medium">
              Emergency contact name
              <input
                value={application.emergencyContact.name}
                onChange={(e) =>
                  setApplication({
                    ...application,
                    emergencyContact: { ...application.emergencyContact, name: e.target.value },
                  })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Emergency contact phone
              <input
                value={application.emergencyContact.phone}
                onChange={(e) =>
                  setApplication({
                    ...application,
                    emergencyContact: { ...application.emergencyContact, phone: e.target.value },
                  })
                }
                className={fieldClass}
              />
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-3 text-sm">
            {[
              ["declarationAccepted", "I declare that all information provided is true and accurate."],
              ["termsAccepted", "I accept the HomeLink Agent Terms and Conditions."],
              ["privacyAccepted", "I accept the Privacy Policy."],
            ].map(([key, label]) => (
              <label key={key} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={Boolean((application as unknown as Record<string, boolean>)[key])}
                  onChange={(e) => setApplication({ ...application, [key]: e.target.checked })}
                  className="mt-1"
                />
                {label}
              </label>
            ))}
            <label className="mt-4 block text-sm font-medium">
              Electronic signature (type your full name)
              <input
                value={application.signatureDataUrl ?? ""}
                onChange={(e) => setApplication({ ...application, signatureDataUrl: e.target.value })}
                className={fieldClass}
              />
            </label>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button
            type="button"
            onClick={() => void save(application).then(() => (step < STEPS.length - 1 ? setStep((s) => s + 1) : submit()))}
            disabled={saving}
          >
            {step < STEPS.length - 1 ? (saving ? "Saving..." : "Save & continue") : saving ? "Submitting..." : "Submit application"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
