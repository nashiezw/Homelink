"use client";

import Image from "next/image";
import { Award, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeLinkBrand } from "@/components/brand/homelink-logo";

export type CertificateDocumentProps = {
  learnerName: string;
  courseTitle: string;
  certificateTitle: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt?: string | null;
  verifyUrl: string;
  accent?: string;
  signatureName?: string;
  signatureTitle?: string;
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
  signatureName = "HomeLink Zimbabwe Academy",
  signatureTitle = "Director of Training & Certification",
}: CertificateDocumentProps) {
  const issuedLabel = new Date(issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-semibold text-emerald-700">HomeLink digital certificate</p>
          <h1 className="text-2xl font-bold">{certificateTitle}</h1>
        </div>
        <Button onClick={() => window.print()} style={{ backgroundColor: accent }}>
          <Download className="size-4 mr-2" /> Download / Print PDF
        </Button>
      </div>

      <article
        className="relative overflow-hidden rounded-[2rem] border-8 border-double bg-white shadow-hero print:rounded-none print:border-[6px] print:shadow-none"
        style={{ borderColor: `${accent}55` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(198,161,91,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(0,139,104,0.16),transparent_40%)]" />
        <div className="absolute inset-4 rounded-[1.5rem] border border-amber-200/70 print:inset-3" />

        <div className="relative px-8 py-10 sm:px-12 sm:py-14">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="rounded-2xl bg-white p-3 shadow-lg ring-1 ring-slate-200">
              <HomeLinkBrand variant="auth" iconOnly={false} />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500">Certificate of Achievement</p>
              <p className="mt-2 text-sm font-semibold" style={{ color: accent }}>{certificateNumber}</p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: accent }}>
              <Award className="size-4" /> Official HomeLink Certification
            </div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">This certifies that</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{learnerName}</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              has successfully completed <strong>{courseTitle}</strong> and is awarded the designation
            </p>
            <p className="mt-4 text-3xl font-bold sm:text-4xl" style={{ color: accent }}>{certificateTitle}</p>
          </div>

          <div className="mt-12 grid gap-8 border-t border-slate-200 pt-10 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Date of issue</p>
              <p className="mt-2 text-lg font-semibold">{issuedLabel}</p>
              {expiresAt && (
                <p className="mt-2 text-sm text-slate-500">Valid until {new Date(expiresAt).toLocaleDateString("en-GB")}</p>
              )}
            </div>

            <div className="hidden justify-center sm:flex">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <ShieldCheck className="mx-auto size-8" style={{ color: accent }} />
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Verified credential</p>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="inline-block border-b-2 border-slate-800 pb-2">
                <p className="font-serif text-2xl italic text-slate-800">{signatureName}</p>
              </div>
              <p className="mt-2 text-sm text-slate-500">{signatureTitle}</p>
              <div className="mt-4 flex items-center gap-3 sm:justify-end">
                <Image src="/brand/homelink-full-lockup.png" alt="HomeLink" width={120} height={40} className="h-8 w-auto opacity-80" />
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-slate-500 print:mt-8">
            Verify this certificate at {typeof window !== "undefined" ? window.location.origin : "https://homelink.co.zw"}{verifyUrl.replace(/^https?:\/\/[^/]+/, "")}
          </p>
        </div>
      </article>
    </div>
  );
}
