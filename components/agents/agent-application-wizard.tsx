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
import { HOUSELINK_AGENT_CONTRACT } from "@/lib/agents/agent-contract";
import {
  emptyApplicationDocumentChecklist,
  emptyApplicationInterviewAssessment,
  emptyApplicationReadiness,
  emptyApplicationRecruitment,
} from "@/lib/agents/defaults";

const STEPS = [
  "Profile",
  "Experience",
  "Documents",
  "Agreement",
  "Submit",
];

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
        description="Create a free HouseLink account or sign in to save your progress and submit for review."
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="premium-card rounded-xl p-6">
            <h2 className="text-lg font-semibold text-ink dark:text-white">What you&apos;ll need</h2>
            <ul className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                "Personal details and contact information",
                "Recruitment source, preferred branch, and territory",
                "Professional experience and service areas",
                "Digital readiness, transport, and availability",
                "ID, licence, and proof-of-address documents",
                "Banking details for commission payouts",
                "Two professional references",
                "Signed HouseLink agent agreement",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="font-semibold text-emerald-700">•</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-slate-500">
              New to HouseLink? Choose <strong>Create account</strong> on the right — your application starts automatically after registration.
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

  const app = normalizeApplication(application);
  const statusLabel = application.status.replace(/_/g, " ");

  return (
    <PageShell
      eyebrow="Agent application"
      title="HouseLink agent application"
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
                  value={(app.personal as Record<string, string>)[key] ?? ""}
                  onChange={(e) =>
                    setApplication({
                      ...app,
                      personal: { ...app.personal, [key]: e.target.value },
                    })
                  }
                  className={fieldClass}
                />
              </label>
            ))}
            <label className="block text-sm font-medium sm:col-span-2">
              Residential address
              <input
                value={app.personal.residentialAddress}
                onChange={(e) =>
                  setApplication({ ...app, personal: { ...app.personal, residentialAddress: e.target.value } })
                }
                className={fieldClass}
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["heardAbout", "How did you hear about HouseLink?"],
              ["referredBy", "Referred by / recruiter name"],
              ["preferredCity", "Preferred city"],
              ["preferredBranch", "Preferred branch / office"],
              ["availability", "Availability"],
              ["transportAccess", "Transport access"],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm font-medium">
                {label}
                <input
                  value={(app.recruitment as unknown as Record<string, string>)[key] ?? ""}
                  onChange={(e) =>
                    setApplication({ ...app, recruitment: { ...app.recruitment, [key]: e.target.value } })
                  }
                  className={fieldClass}
                />
              </label>
            ))}
            <label className="block text-sm font-medium sm:col-span-2">
              Preferred suburbs or service areas (comma separated)
              <input
                value={app.recruitment.preferredSuburbs.join(", ")}
                onChange={(e) =>
                  setApplication({
                    ...app,
                    recruitment: {
                      ...app.recruitment,
                      preferredSuburbs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    },
                  })
                }
                className={fieldClass}
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Years of experience
              <input
                type="number"
                min={0}
                value={app.professional.yearsExperience}
                onChange={(e) =>
                  setApplication({
                    ...app,
                    professional: { ...app.professional, yearsExperience: Number(e.target.value) },
                  })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Province
              <input
                value={app.professional.province}
                onChange={(e) =>
                  setApplication({ ...app, professional: { ...app.professional, province: e.target.value } })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              City
              <input
                value={app.professional.city}
                onChange={(e) =>
                  setApplication({ ...app, professional: { ...app.professional, city: e.target.value } })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Areas covered (comma separated)
              <input
                value={app.professional.areasCovered.join(", ")}
                onChange={(e) =>
                  setApplication({
                    ...app,
                    professional: {
                      ...app.professional,
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
                value={app.professional.languages.join(", ")}
                onChange={(e) =>
                  setApplication({
                    ...app,
                    professional: {
                      ...app.professional,
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
                checked={app.professional.hasDriversLicence}
                onChange={(e) =>
                  setApplication({
                    ...app,
                    professional: { ...app.professional, hasDriversLicence: e.target.checked },
                  })
                }
              />
              Driver&apos;s licence
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={app.professional.hasOwnVehicle}
                onChange={(e) =>
                  setApplication({
                    ...app,
                    professional: { ...app.professional, hasOwnVehicle: e.target.checked },
                  })
                }
              />
              Own vehicle
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              Education / qualifications / certificates
              <textarea
                value={app.readiness.education}
                onChange={(e) => setApplication({ ...app, readiness: { ...app.readiness, education: e.target.value } })}
                rows={3}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Real estate, sales, or customer-service experience
              <textarea
                value={app.readiness.salesExperience}
                onChange={(e) => setApplication({ ...app, readiness: { ...app.readiness, salesExperience: e.target.value } })}
                rows={3}
                className={fieldClass}
              />
            </label>
            {[
              ["smartphoneAccess", "Smartphone access"],
              ["laptopAccess", "Laptop access"],
              ["internetAccess", "Reliable internet access"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean((app.readiness as unknown as Record<string, boolean>)[key])}
                  onChange={(e) => setApplication({ ...app, readiness: { ...app.readiness, [key]: e.target.checked } })}
                />
                {label}
              </label>
            ))}
            <label className="block text-sm font-medium sm:col-span-2">
              Social media / digital marketing capability
              <input
                value={app.readiness.digitalMarketingCapability}
                onChange={(e) =>
                  setApplication({ ...app, readiness: { ...app.readiness, digitalMarketingCapability: e.target.value } })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Key strengths for agent work
              <textarea
                value={app.readiness.keyStrengths}
                onChange={(e) => setApplication({ ...app, readiness: { ...app.readiness, keyStrengths: e.target.value } })}
                rows={3}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Training needs identified
              <textarea
                value={app.readiness.trainingNeeds}
                onChange={(e) => setApplication({ ...app, readiness: { ...app.readiness, trainingNeeds: e.target.value } })}
                rows={3}
                className={fieldClass}
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-6">
            <ImageUploader
              label="Profile picture"
              folder="agents"
              max={1}
              value={app.documents.profilePictureUrl ? [app.documents.profilePictureUrl] : []}
              onChange={(urls) =>
                setApplication({
                  ...app,
                  documents: { ...app.documents, profilePictureUrl: urls[0] },
                })
              }
            />
            <ImageUploader
              label="National ID"
              folder="agents"
              max={1}
              value={app.documents.nationalIdUrl ? [app.documents.nationalIdUrl] : []}
              onChange={(urls) =>
                setApplication({ ...app, documents: { ...app.documents, nationalIdUrl: urls[0] } })
              }
            />
            <ImageUploader
              label="CV"
              folder="agents"
              max={1}
              value={app.documents.cvUrl ? [app.documents.cvUrl] : []}
              onChange={(urls) =>
                setApplication({ ...app, documents: { ...app.documents, cvUrl: urls[0] } })
              }
            />
            <div>
              <h3 className="text-sm font-semibold text-ink dark:text-white">Document checklist</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  ["nationalIdCopy", "Copy of National ID / Passport"],
                  ["proofOfResidence", "Proof of residence"],
                  ["cv", "Updated CV / profile"],
                  ["passportPhoto", "Passport-size photo"],
                  ["policeClearance", "Police clearance / affidavit if required"],
                  ["certificates", "Academic or training certificates"],
                  ["driversLicence", "Driver's licence copy if applicable"],
                  ["bankDetails", "Bank details for approved agent file"],
                  ["codeOfConduct", "Signed code of conduct"],
                  ["confidentialityUndertaking", "Signed confidentiality undertaking"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean((app.documentChecklist as unknown as Record<string, boolean>)[key])}
                      onChange={(e) =>
                        setApplication({
                          ...app,
                          documentChecklist: { ...app.documentChecklist, [key]: e.target.checked },
                        })
                      }
                      className="mt-1"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
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
                  value={(app.banking as Record<string, string>)[key] ?? ""}
                  onChange={(e) =>
                    setApplication({ ...app, banking: { ...app.banking, [key]: e.target.value } })
                  }
                  className={fieldClass}
                />
              </label>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-4">
            <label className="block text-sm font-medium">
              Emergency contact name
              <input
                value={app.emergencyContact.name}
                onChange={(e) =>
                  setApplication({
                    ...app,
                    emergencyContact: { ...app.emergencyContact, name: e.target.value },
                  })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Emergency contact phone
              <input
                value={app.emergencyContact.phone}
                onChange={(e) =>
                  setApplication({
                    ...app,
                    emergencyContact: { ...app.emergencyContact, phone: e.target.value },
                  })
                }
                className={fieldClass}
              />
            </label>
          </div>
        )}

        {step === 7 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
              These fields match the office-use section of the manual paper form. Applicants can leave them blank unless
              a HouseLink recruiter completes the application with them.
            </p>
            {[
              ["applicationRef", "Application reference"],
              ["branchOffice", "Branch / office"],
              ["recruitingOfficer", "Recruiting officer"],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm font-medium">
                {label}
                <input
                  value={(app.recruitment as unknown as Record<string, string>)[key] ?? ""}
                  onChange={(e) => setApplication({ ...app, recruitment: { ...app.recruitment, [key]: e.target.value } })}
                  className={fieldClass}
                />
              </label>
            ))}
            {[
              ["presentationScore", "Professional presentation and communication"],
              ["clientServiceScore", "Sales mindset and client-service attitude"],
              ["marketKnowledgeScore", "Local market knowledge"],
              ["complianceScore", "Documentation and compliance awareness"],
              ["digitalReadinessScore", "Digital readiness"],
              ["territoryFitScore", "Availability, transport and territory fit"],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm font-medium">
                {label} score / 5
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={Number((app.interviewAssessment as unknown as Record<string, number>)[key] ?? 0)}
                  onChange={(e) =>
                    setApplication({
                      ...app,
                      interviewAssessment: { ...app.interviewAssessment, [key]: Number(e.target.value) },
                    })
                  }
                  className={fieldClass}
                />
              </label>
            ))}
            {[
              ["decision", "Decision: approved / pending / declined"],
              ["approvedRole", "Approved role or level"],
              ["assignedTeamLeader", "Assigned branch / team leader"],
              ["commissionNotes", "Commission or incentive notes"],
              ["trainingCourseAssigned", "Training course assigned"],
              ["inductionDate", "Start date / induction date", "date"],
            ].map(([key, label, type = "text"]) => (
              <label key={key} className="block text-sm font-medium">
                {label}
                <input
                  type={type}
                  value={(app.interviewAssessment as unknown as Record<string, string>)[key] ?? ""}
                  onChange={(e) =>
                    setApplication({ ...app, interviewAssessment: { ...app.interviewAssessment, [key]: e.target.value } })
                  }
                  className={fieldClass}
                />
              </label>
            ))}
            <label className="block text-sm font-medium sm:col-span-2">
              Interview notes / admin notes
              <textarea
                value={app.interviewAssessment.notes}
                onChange={(e) =>
                  setApplication({ ...app, interviewAssessment: { ...app.interviewAssessment, notes: e.target.value } })
                }
                rows={4}
                className={fieldClass}
              />
            </label>
          </div>
        )}

        {step === 8 && (
          <div className="grid gap-4">
            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed whitespace-pre-wrap dark:border-slate-700 dark:bg-slate-900">
              {HOUSELINK_AGENT_CONTRACT}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={app.agentContractAccepted}
                onChange={(e) => setApplication({ ...app, agentContractAccepted: e.target.checked })}
                className="mt-1"
              />
              I have read and accept the HouseLink Independent Agent Agreement. I understand that clients, viewings, and
              payments must remain on the platform.
            </label>
          </div>
        )}

        {step === 9 && (
          <div className="grid gap-3 text-sm">
            {[
              ["declarationAccepted", "I declare that all information provided is true and accurate."],
              ["termsAccepted", "I accept the HouseLink Agent Terms and Conditions."],
              ["privacyAccepted", "I accept the Privacy Policy."],
            ].map(([key, label]) => (
              <label key={key} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={Boolean((app as unknown as Record<string, boolean>)[key])}
                  onChange={(e) => setApplication({ ...app, [key]: e.target.checked })}
                  className="mt-1"
                />
                {label}
              </label>
            ))}
            <label className="mt-4 block text-sm font-medium">
              Electronic signature (type your full name)
              <input
                value={app.signatureDataUrl ?? ""}
                onChange={(e) => setApplication({ ...app, signatureDataUrl: e.target.value })}
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
            onClick={() => void save(app).then(() => (step < STEPS.length - 1 ? setStep((s) => s + 1) : submit()))}
            disabled={saving}
          >
            {step < STEPS.length - 1 ? (saving ? "Saving..." : "Save & continue") : saving ? "Submitting..." : "Submit application"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

function normalizeApplication(application: AgentApplication): AgentApplication {
  return {
    ...application,
    recruitment: { ...emptyApplicationRecruitment(), ...application.recruitment },
    readiness: { ...emptyApplicationReadiness(), ...application.readiness },
    documentChecklist: { ...emptyApplicationDocumentChecklist(), ...application.documentChecklist },
    interviewAssessment: { ...emptyApplicationInterviewAssessment(), ...application.interviewAssessment },
  };
}
