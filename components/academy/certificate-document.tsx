"use client";

import Image from "next/image";
import { Award, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";

export type CertificateDocumentProps = {
  learnerName: string;
  courseTitle: string;
  certificateTitle: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt?: string | null;
  verifyUrl: string;
  accent?: string;
  backgroundUrl?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatureName?: string;
  signatureTitle?: string;
  customHtml?: string;
  customCss?: string;
  skillsAssessed?: string[];
  badgeName?: string;
};

export function CertificateDocument({
  learnerName,
  courseTitle,
  certificateTitle,
  certificateNumber,
  issuedAt,
  expiresAt,
  verifyUrl,
  accent = "#008b68",
  backgroundUrl,
  logoUrl,
  signatureUrl,
  signatureName = "HouseLink Zimbabwe Academy",
  signatureTitle = "Director of Training & Certification",
  customHtml = "",
  customCss = "",
  skillsAssessed = [],
  badgeName,
}: CertificateDocumentProps) {
  const issuedLabel = new Date(issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const renderedCustomHtml = customHtml.trim()
    ? renderCertificateHtml(customHtml, {
        learnerName,
        courseTitle,
        certificateTitle,
        certificateNumber,
        issuedAt: issuedLabel,
        expiresAt: expiresAt ? new Date(expiresAt).toLocaleDateString("en-GB") : "",
        verifyUrl,
        signatureName,
        signatureTitle,
        accent,
        backgroundUrl: backgroundUrl ?? "",
        logoUrl: logoUrl ?? "",
        signatureUrl: signatureUrl ?? "",
        skillsAssessed: skillsAssessed.join(", "),
        badgeName: badgeName ?? "",
      })
    : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-semibold text-emerald-700">HouseLink digital certificate</p>
          <h1 className="text-2xl font-bold">{certificateTitle}</h1>
        </div>
        <Button onClick={() => window.print()} style={{ backgroundColor: accent }}>
          <Download className="size-4 mr-2" /> Download / Print PDF
        </Button>
      </div>

      {renderedCustomHtml ? (
        <article className="relative overflow-hidden rounded-xl bg-white shadow-hero print:rounded-none print:shadow-none">
          {customCss.trim() ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
          <div dangerouslySetInnerHTML={{ __html: renderedCustomHtml }} />
        </article>
      ) : (
        <article
          className="relative overflow-hidden rounded-xl bg-white shadow-hero ring-1 ring-slate-200 print:rounded-none print:shadow-none"
          style={{
            backgroundImage: backgroundUrl ? `linear-gradient(rgba(255,255,255,.88), rgba(255,255,255,.94)), url(${backgroundUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(198,161,91,0.16),transparent_34%),linear-gradient(225deg,rgba(0,139,104,0.12),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.04),transparent_45%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="absolute inset-5 rounded-lg border border-slate-900/10 print:inset-3" />
          <div className="absolute inset-8 rounded-md border-2 border-amber-300/60 print:inset-5" />
          <div className="absolute left-0 top-0 h-28 w-28 border-l-[18px] border-t-[18px] border-amber-400/70" />
          <div className="absolute bottom-0 right-0 h-28 w-28 border-b-[18px] border-r-[18px] border-amber-400/70" />

          <div className="relative px-6 py-8 sm:px-12 sm:py-14 lg:px-16">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="rounded-lg bg-white p-3 shadow-lg ring-1 ring-slate-200">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Certificate logo" className="h-12 w-auto max-w-44 object-contain" />
                ) : (
                  <HouseLinkBrand variant="auth" iconOnly={false} />
                )}
              </div>
              <div className="min-w-0 text-left sm:text-right">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">HouseLink Academy Credential</p>
                <p className="mt-2 break-words text-sm font-semibold [overflow-wrap:anywhere]" style={{ color: accent }}>{certificateNumber}</p>
                <p className="mt-1 text-xs text-slate-500">Verified digital record</p>
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-4xl text-center">
              <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg" style={{ backgroundColor: accent }}>
                <Award className="size-4" /> Official HouseLink Certification
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">This certifies that</p>
              <h2 className="mt-4 break-words font-serif text-4xl font-bold text-slate-950 [overflow-wrap:anywhere] sm:text-6xl">{learnerName}</h2>
              <div className="mx-auto mt-5 h-px max-w-xl bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                has successfully completed <strong>{courseTitle}</strong> and is awarded the designation
              </p>
              <p className="mt-4 break-words text-3xl font-bold [overflow-wrap:anywhere] sm:text-4xl" style={{ color: accent }}>{certificateTitle}</p>
              {badgeName && <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{badgeName}</p>}
            </div>

            {skillsAssessed.length > 0 && (
              <div className="mx-auto mt-10 max-w-3xl rounded-lg border border-slate-200 bg-white/88 p-5 text-left shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Skills assessed</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {skillsAssessed.slice(0, 8).map((skill) => (
                    <p key={skill} className="flex gap-2 text-sm leading-snug text-slate-700">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
                      {skill}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 grid gap-8 border-t border-slate-200 pt-10 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Date of issue</p>
                <p className="mt-2 text-lg font-semibold">{issuedLabel}</p>
                {expiresAt && (
                  <p className="mt-2 text-sm text-slate-500">Valid until {new Date(expiresAt).toLocaleDateString("en-GB")}</p>
                )}
              </div>

              <div className="hidden justify-center sm:flex">
                <div className="rounded-full border border-amber-300 bg-white p-5 text-center shadow-md">
                  <ShieldCheck className="mx-auto size-10" style={{ color: accent }} />
                  <p className="mt-2 max-w-28 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Verified credential</p>
                </div>
              </div>

              <div className="sm:text-right">
                <div className="inline-block border-b-2 border-slate-800 pb-2">
                  {signatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signatureUrl} alt="" className="ml-auto h-12 max-w-48 object-contain" />
                  ) : (
                    <p className="font-serif text-2xl italic text-slate-800">{signatureName}</p>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-500">{signatureTitle}</p>
                <div className="mt-4 flex items-center gap-3 sm:justify-end">
                  <Image src="/brand/houselink-full-lockup.png" alt="HouseLink" width={152} height={80} className="h-8 w-auto opacity-80" />
                </div>
              </div>
            </div>

            <p className="mt-10 text-center text-xs text-slate-500 print:mt-8">
              Verify this certificate at {typeof window !== "undefined" ? window.location.origin : "https://www.houselink.co.zw"}{verifyUrl.replace(/^https?:\/\/[^/]+/, "")}
            </p>
          </div>
        </article>
      )}
    </div>
  );
}

function renderCertificateHtml(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => escapeHtml(values[key] ?? ""));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
