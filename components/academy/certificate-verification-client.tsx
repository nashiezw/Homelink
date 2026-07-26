"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Award, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type VerificationResult = {
  valid: boolean;
  certificateNumber: string;
  course: string | null;
  certificateTitle?: string;
  badgeName?: string | null;
  skillsAssessed?: string[];
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
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              <ShieldCheck className="size-4" /> Valid HouseLink Academy Credential
            </p>
            <h3 className="mt-3 text-2xl font-bold text-ink dark:text-white">{result.certificateTitle ?? result.course ?? "HouseLink Academy Certificate"}</h3>
            {result.badgeName && <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200">{result.badgeName}</p>}
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <VerificationFact label="Certificate No." value={result.certificateNumber} />
              <VerificationFact label="Status" value={result.status} />
              <VerificationFact label="Issued" value={new Date(result.issuedAt).toLocaleDateString("en-GB")} />
              <VerificationFact label="Expires" value={result.expiresAt ? new Date(result.expiresAt).toLocaleDateString("en-GB") : "No expiry"} />
            </dl>
            {!!result.skillsAssessed?.length && (
              <div className="mt-5">
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
          </div>
        )}
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

function VerificationFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 dark:bg-slate-950">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950 dark:text-white">{value}</dd>
    </div>
  );
}
