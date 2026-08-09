"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Award, CalendarDays, CheckCircle2, ClipboardCheck, FileCheck2, GraduationCap, IdCard, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { TrainingDisclaimer } from "@/components/legal/training-disclaimer";

type VerificationResult = {
  valid: boolean;
  certificateNumber: string;
  learnerName?: string;
  course: string | null;
  certificateTitle?: string;
  badgeName?: string | null;
  skillsAssessed?: string[];
  assessmentProof?: {
    trainingSessions: string | null;
    quizzes: number;
    assignments: number;
    passedQuizAttempts?: number;
    reviewedAssignments?: number;
    finalExamBestScore?: number | null;
    confidenceSignals?: { confident: number; mixed: number; guessed: number } | null;
    requiresFinalExam: boolean;
    requiresPortfolio: boolean;
    roleplayAssessments: number;
    certificateRequirements: string[];
  } | null;
  gradingStandard?: string[];
  portfolioEvidence?: string[];
  roleplayEvidence?: string[];
  graduateProofSignals?: string[];
  issuedAt: string;
  expiresAt?: string | null;
  status: string;
};

export function CertificateVerificationClient() {
  const searchParams = useSearchParams();
  const [certificateNumber, setCertificateNumber] = useState(searchParams?.get("certificate") ?? "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSearch = useMemo(() => certificateNumber.trim().length >= 6, [certificateNumber]);

  async function verify() {
    if (!canSearch) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const response = await apiFetch<VerificationResult>(`/api/v1/academy/certificates/verify/${encodeURIComponent(certificateNumber.trim())}`);
    setBusy(false);
    if (response.error) {
      setError(response.error.message);
      return;
    }
    setResult(response.data ?? null);
  }

  useEffect(() => {
    if (canSearch && !result && !error && !busy) void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="premium-card rounded-lg p-6">
        <h2 className="text-xl font-semibold text-ink dark:text-white">Check a certificate number</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Enter the certificate number exactly as shown on a HouseLink Academy certificate.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={certificateNumber}
            onChange={(event) => setCertificateNumber(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void verify();
            }}
            className="min-h-11 flex-1 rounded-lg border border-slate-200 px-4 text-sm outline-none ring-emerald-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Example: HLP-LZ..."
          />
          <Button onClick={() => void verify()} disabled={busy || !canSearch}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Verify
          </Button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <p className="flex items-center gap-2 font-semibold"><XCircle className="size-4" /> Certificate not verified</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-soft dark:border-emerald-900/70 dark:bg-slate-950">
            <div className="relative overflow-hidden bg-[#061936] px-5 py-6 text-white sm:px-6">
              <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_20%,rgba(16,185,129,0.35),transparent_35%),radial-gradient(circle_at_85%_90%,rgba(212,175,55,0.22),transparent_35%)]" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-300/30">
                    <ShieldCheck className="size-4" /> Verified credential
                  </p>
                  <h3 className="mt-4 break-words text-2xl font-bold tracking-tight sm:text-3xl">{result.learnerName ?? "HouseLink Learner"}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                    This certificate is active in HouseLink Academy records and matches the course, issue date, and assessment evidence below.
                  </p>
                </div>
                <div className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-left backdrop-blur sm:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">Certificate No.</p>
                  <p className="mt-1 max-w-52 break-words font-mono text-sm font-bold text-white">{result.certificateNumber}</p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <GraduationCap className="size-4" /> HouseLink Zimbabwe Academy
                  </p>
                  <h3 className="mt-2 break-words text-2xl font-bold text-ink dark:text-white">{result.certificateTitle ?? result.course ?? "HouseLink Academy Certificate"}</h3>
                  {result.badgeName && (
                    <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900">
                      <Award className="size-4 shrink-0" />
                      <span className="min-w-0 truncate">{result.badgeName}</span>
                    </p>
                  )}
                </div>
                <dl className="grid gap-2">
                  <VerificationFact icon={CheckCircle2} label="Status" value={sentenceCase(result.status)} tone="success" />
                  <VerificationFact icon={CalendarDays} label="Issued" value={new Date(result.issuedAt).toLocaleDateString("en-GB")} />
                  <VerificationFact icon={CalendarDays} label="Expires" value={result.expiresAt ? new Date(result.expiresAt).toLocaleDateString("en-GB") : "No expiry"} />
                </dl>
              </div>

            {result.assessmentProof && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Verified completion evidence</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Assessment requirements recorded for this credential.</p>
                  </div>
                  <FileCheck2 className="hidden size-8 text-emerald-600 sm:block" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <VerificationFact icon={ClipboardCheck} label="Quizzes required" value={String(result.assessmentProof.quizzes)} />
                  <VerificationFact icon={FileCheck2} label="Assignments required" value={String(result.assessmentProof.assignments)} />
                  <VerificationFact icon={IdCard} label="Capstone" value={result.assessmentProof.requiresFinalExam ? "Final exam" : "Module gates"} />
                  <VerificationFact icon={CheckCircle2} label="Passed attempts" value={String(result.assessmentProof.passedQuizAttempts ?? result.assessmentProof.quizzes)} tone="success" />
                  <VerificationFact icon={CheckCircle2} label="Reviewed work" value={String(result.assessmentProof.reviewedAssignments ?? result.assessmentProof.assignments)} tone="success" />
                  <VerificationFact
                    icon={Award}
                    label="Best final score"
                    value={
                      result.assessmentProof.requiresFinalExam
                        ? result.assessmentProof.finalExamBestScore === null || result.assessmentProof.finalExamBestScore === undefined
                          ? "Pending"
                          : `${result.assessmentProof.finalExamBestScore}%`
                      : "Not required"
                    }
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.assessmentProof.trainingSessions && <VerificationChip value={result.assessmentProof.trainingSessions} />}
                  {result.assessmentProof.requiresPortfolio && <VerificationChip value="Field portfolio required" />}
                  {!!result.assessmentProof.roleplayAssessments && <VerificationChip value={`${result.assessmentProof.roleplayAssessments} roleplay/simulation assessments`} />}
                </div>
                {result.assessmentProof.confidenceSignals && (
                  <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Confidence record: {result.assessmentProof.confidenceSignals.confident} confident, {result.assessmentProof.confidenceSignals.mixed} mixed, {result.assessmentProof.confidenceSignals.guessed} guessed checkpoint submissions.
                  </p>
                )}
              </div>
            )}
            {!!result.skillsAssessed?.length && (
              <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Skills assessed</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {result.skillsAssessed.slice(0, 8).map((skill) => (
                    <p key={skill} className="flex gap-2 text-sm leading-snug text-slate-700 dark:text-slate-200">
                      <Award className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {skill}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {!!result.gradingStandard?.length && (
                <VerificationList title="How work was judged" items={result.gradingStandard} icon="check" />
              )}
              {!!result.assessmentProof?.certificateRequirements?.length && (
                <VerificationList title="Certificate requirements" items={result.assessmentProof.certificateRequirements.slice(0, 6)} icon="award" />
              )}
              {!!result.portfolioEvidence?.length && (
                <VerificationList title="Portfolio evidence expected" items={result.portfolioEvidence} icon="check" />
              )}
              {!!result.roleplayEvidence?.length && (
                <VerificationList title="Roleplay evidence expected" items={result.roleplayEvidence} icon="award" />
              )}
            </div>
            {!!result.graduateProofSignals?.length && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ongoing graduate proof signals</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {result.graduateProofSignals.map((signal) => (
                    <p key={signal} className="flex gap-2 text-sm leading-snug text-slate-700 dark:text-slate-200">
                      <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {signal}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        )}
        <TrainingDisclaimer compact className="mt-6" />
      </section>

      <aside className="surface-panel h-fit rounded-lg p-6">
        <ShieldCheck className="size-9 text-emerald-700" />
        <h2 className="mt-4 text-lg font-semibold text-ink dark:text-white">What verification confirms</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <li>Certificate number exists in HouseLink Academy records.</li>
          <li>The credential is active and has not been revoked.</li>
          <li>The course, badge, issue date, and assessed skills match the certificate.</li>
        </ul>
      </aside>
    </div>
  );
}

function VerificationFact({ icon: Icon, label, value, tone = "neutral" }: { icon?: LucideIcon; label: string; value: string; tone?: "neutral" | "success" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {Icon && <Icon className={tone === "success" ? "size-4 text-emerald-600" : "size-4 text-slate-400"} />}
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-slate-950 dark:text-white">{value}</dd>
    </div>
  );
}

function sentenceCase(value: string) {
  return value.toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function VerificationChip({ value }: { value: string }) {
  return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">{value}</span>;
}

function VerificationList({ title, items, icon }: { title: string; items: string[]; icon: "award" | "check" }) {
  const Icon = icon === "award" ? Award : CheckCircle2;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-snug text-slate-700 dark:text-slate-200">
            <Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
