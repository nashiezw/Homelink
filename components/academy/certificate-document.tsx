"use client";

import Image from "next/image";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
import { CERTIFICATE_SHORT_DISCLAIMER } from "@/lib/legal/disclaimers";

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
  secondSignatureUrl?: string | null;
  secondSignatureName?: string;
  secondSignatureTitle?: string;
  sealUrl?: string | null;
  designation?: string | null;
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
  signatureName = "T. Ndudzo",
  signatureTitle = "Director of Training & Certification",
  secondSignatureUrl,
  secondSignatureName = "W. Tigere",
  secondSignatureTitle = "Academy Director",
  sealUrl,
  designation,
  customHtml = "",
  customCss = "",
  skillsAssessed = [],
  badgeName,
}: CertificateDocumentProps) {
  const issuedLong = new Date(issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const issuedShort = new Date(issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const expiresShort = expiresAt ? new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "No expiry";
  const verifyOrigin = typeof window !== "undefined" ? window.location.origin : "https://www.houselink.co.zw";
  const verifyPath = verifyUrl.replace(/^https?:\/\/[^/]+/, "");
  const verifyAbsoluteUrl = `${verifyOrigin}${verifyPath}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(verifyAbsoluteUrl)}`;
  const displayDesignation = designation?.trim() || badgeName || "Certified HouseLink Agent";
  const displaySignatureName = signatureName === "HouseLink Zimbabwe Academy" ? "T. Ndudzo" : signatureName;
  const renderedCustomHtml = customHtml.trim()
    ? renderCertificateHtml(customHtml, {
        learnerName,
        courseTitle,
        certificateTitle,
        certificateNumber,
        issuedAt: issuedLong,
        expiresAt: expiresShort,
        verifyUrl,
        signatureName: displaySignatureName,
        signatureTitle,
        secondSignatureName,
        secondSignatureTitle,
        designation: displayDesignation,
        accent,
        backgroundUrl: backgroundUrl ?? "",
        logoUrl: logoUrl ?? "",
        signatureUrl: signatureUrl ?? "",
        secondSignatureUrl: secondSignatureUrl ?? "",
        sealUrl: sealUrl ?? "",
        skillsAssessed: skillsAssessed.join(", "),
        badgeName: badgeName ?? "",
      })
    : "";

  return (
    <div id="houselink-certificate-print" className="certificate-print-host mx-auto w-full max-w-7xl px-3 py-6 print:max-w-none print:px-0 print:py-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4 landscape; margin: 0; }
              html, body { width: 297mm !important; height: 210mm !important; margin: 0 !important; overflow: hidden !important; background: #fff !important; }
              body > * { display: none !important; }
              body > *:has(#houselink-certificate-print) { display: block !important; height: 0 !important; overflow: visible !important; }
              #houselink-certificate-print { display: block !important; position: fixed !important; inset: 0 !important; width: 297mm !important; height: 210mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #fff !important; }
              #houselink-certificate-print .certificate-actions { display: none !important; }
              #houselink-certificate-print .certificate-sheet { width: 297mm !important; height: 210mm !important; max-width: none !important; border-radius: 0 !important; box-shadow: none !important; page-break-before: avoid !important; page-break-after: avoid !important; break-inside: avoid !important; }
              #houselink-certificate-print .certificate-inner { border-radius: 0 !important; }
            }
          `,
        }}
      />
      <div className="certificate-actions mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">HouseLink digital certificate</p>
          <h1 className="break-words text-2xl font-bold text-slate-950 [overflow-wrap:anywhere]">{certificateTitle}</h1>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => window.print()} style={{ backgroundColor: accent }}>
          <Download className="mr-2 size-4" /> Download / Print PDF
        </Button>
      </div>

      {renderedCustomHtml ? (
        <article className="certificate-sheet relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-lg bg-white shadow-hero print:rounded-none print:shadow-none">
          {customCss.trim() ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
          <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: renderedCustomHtml }} />
          <p className="absolute inset-x-[4%] bottom-[1.4%] text-center text-[clamp(5px,0.72vw,8px)] leading-tight text-slate-500">
            {CERTIFICATE_SHORT_DISCLAIMER}
          </p>
        </article>
      ) : (
        <article
          className="certificate-sheet relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-lg bg-[#061936] p-[1.05%] text-[#071936] shadow-hero"
          style={{
            backgroundImage: backgroundUrl ? `linear-gradient(rgba(6,25,54,.9), rgba(6,25,54,.93)), url(${backgroundUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="certificate-inner relative h-full overflow-hidden bg-[#fffaf0] px-[4.1%] py-[2.65%]">
            <div className="absolute inset-0 opacity-[0.28] [background-image:radial-gradient(circle_at_50%_50%,rgba(198,161,91,.12),transparent_34%),repeating-radial-gradient(circle_at_50%_50%,rgba(7,25,54,.045)_0,rgba(7,25,54,.045)_1px,transparent_1px,transparent_10px)]" />
            <div className="absolute inset-[1.05%] border border-[#d4ad5b]" />
            <div className="absolute inset-[2.05%] border-2 border-[#d4ad5b]" />
            <Corner position="left-top" />
            <Corner position="right-top" />
            <Corner position="left-bottom" />
            <Corner position="right-bottom" />

            <div className="relative grid h-full grid-rows-[auto_1fr_auto_auto]">
              <header className="grid grid-cols-[1fr_minmax(0,1.55fr)_1fr] items-start gap-[2%]">
                <div />
                <div className="min-w-0 text-center">
                  <div className="mx-auto flex items-center justify-center">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="HouseLink Zimbabwe Academy" className="h-[clamp(22px,6vw,74px)] w-auto max-w-full object-contain" />
                    ) : (
                      <Image src="/brand/houselink-full-lockup.png" alt="HouseLink Zimbabwe Academy" width={520} height={170} className="h-[clamp(22px,6vw,74px)] w-auto max-w-full object-contain" priority />
                    )}
                  </div>
                  <p className="mt-[0.3%] text-[clamp(5px,1.05vw,13px)] font-bold uppercase tracking-[0.58em] text-[#071936]">Zimbabwe Academy</p>
                </div>
                <div className="min-w-0 pt-[1%] text-right">
                  <p className="text-[clamp(5px,0.9vw,11px)] font-bold uppercase tracking-[0.28em] text-[#071936]">Certificate No.</p>
                  <p className="mt-[1%] break-words font-serif text-[clamp(7px,1.22vw,16px)] font-semibold text-[#a87922] [overflow-wrap:anywhere]">{certificateNumber}</p>
                </div>
              </header>

              <main className="relative flex min-h-0 flex-col items-center justify-center text-center">
                <Laurel side="left" />
                <Laurel side="right" />
                <div className="absolute left-[2.7%] top-[43%] hidden size-[14.5%] items-center justify-center rounded-full border border-slate-200 bg-white/45 text-center text-[clamp(5px,0.85vw,10px)] font-bold uppercase tracking-[0.12em] text-slate-300 shadow-inner md:flex">
                  HouseLink<br />Zimbabwe<br />Academy<br />Excellence
                </div>

                <h2 className="font-serif text-[clamp(2rem,7.2vw,5.75rem)] font-semibold uppercase leading-none tracking-[0.34em] text-[#071936]">Certificate</h2>
                <div className="mt-[1%] flex w-[54%] items-center justify-center gap-[3%] text-[#a87922]">
                  <span className="h-px flex-1 bg-[#d4ad5b]" />
                  <p className="whitespace-nowrap font-serif text-[clamp(0.8rem,2.2vw,2rem)] uppercase tracking-[0.22em]">of Achievement</p>
                  <span className="h-px flex-1 bg-[#d4ad5b]" />
                </div>
                <p className="mt-[1.45%] text-[clamp(6px,1.15vw,13px)] font-bold uppercase tracking-[0.42em] text-[#071936]">This certifies that</p>
                <p className="mt-[0.4%] max-w-[74%] break-words font-serif text-[clamp(2rem,6vw,5.2rem)] italic leading-[0.95] text-[#071936] [overflow-wrap:anywhere]">{learnerName}</p>
                <div className="mt-[0.4%] h-px w-[44%] bg-[#d4ad5b]" />
                <p className="mt-[1.1%] max-w-[55%] text-[clamp(7px,1.18vw,15px)] leading-[1.45] text-[#2d2a25]">
                  has successfully completed the requirements of the
                  <br />
                  <strong className="font-bold text-[#071936]">{courseTitle}</strong>
                  <br />
                  and is hereby awarded the designation of
                </p>
                <p className="mt-[0.8%] max-w-[76%] break-words text-[clamp(1.1rem,3.05vw,2.85rem)] font-bold uppercase leading-tight tracking-[0.18em] text-[#0b7a46] [overflow-wrap:anywhere]">{displayDesignation}</p>
                <p className="mt-[0.45%] text-[clamp(6px,1.05vw,13px)] font-bold uppercase tracking-[0.36em] text-[#071936]">{badgeName || certificateTitle}</p>
                <p className="mt-[0.8%] max-w-[55%] font-serif text-[clamp(7px,1.2vw,15px)] italic leading-[1.35] text-[#2d2a25]">
                  In recognition of demonstrated knowledge, skills and commitment to ethical practice and professional excellence in real estate.
                </p>
              </main>

              <footer className="grid grid-cols-[1fr_auto_1fr] items-end gap-[2.2%]">
                <div className="min-w-0">
                  <div className="mb-[4%] flex min-w-0 items-end gap-[4%]">
                    <div className="shrink-0 border border-[#d4ad5b] bg-white p-[1.5%]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrUrl} alt="Certificate verification QR code" className="size-[clamp(34px,6.5vw,82px)]" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[clamp(5px,0.92vw,11px)] font-bold uppercase tracking-[0.16em] text-[#071936]">Verify this certificate</p>
                      <p className="mt-[2%] text-[clamp(5px,0.86vw,10px)] leading-tight text-[#2d2a25]">Scan the QR code or visit:</p>
                      <p className="break-all text-[clamp(5px,0.9vw,11px)] font-bold leading-tight text-[#0b7a46]">{verifyOrigin.replace(/^https?:\/\//, "")}/academy/verify</p>
                    </div>
                  </div>
                  <SignatureBlock
                    signature={secondSignatureName}
                    name={normaliseSignatureName(secondSignatureName)}
                    title={secondSignatureTitle}
                    signatureUrl={secondSignatureUrl}
                  />
                </div>

                <div className="flex min-w-0 flex-col items-center">
                  {sealUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sealUrl} alt="HouseLink Academy seal" className="size-[clamp(54px,10vw,124px)] object-contain" />
                  ) : (
                    <AcademySeal />
                  )}
                  <div className="mt-[7%] grid grid-cols-3 divide-x divide-[#d4ad5b] text-center text-[clamp(5px,0.9vw,11px)]">
                    <CertificateFact label="Date of Issue" value={issuedShort} />
                    <CertificateFact label="Certificate ID" value={certificateNumber} />
                    <CertificateFact label="Valid Until" value={expiresShort} />
                  </div>
                </div>

                <div className="min-w-0">
                  <SignatureBlock
                    signature={displaySignatureName}
                    name={normaliseSignatureName(displaySignatureName)}
                    title={signatureTitle}
                    signatureUrl={signatureUrl}
                    align="right"
                  />
                </div>
              </footer>

              <p className="pt-[0.8%] text-center text-[clamp(5px,0.72vw,8px)] leading-tight text-slate-500">
                {CERTIFICATE_SHORT_DISCLAIMER}
              </p>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

function Corner({ position }: { position: "left-top" | "right-top" | "left-bottom" | "right-bottom" }) {
  const classes = {
    "left-top": "left-[2.05%] top-[2.05%] rounded-br-full border-b-4 border-r-4",
    "right-top": "right-[2.05%] top-[2.05%] rounded-bl-full border-b-4 border-l-4",
    "left-bottom": "bottom-[2.05%] left-[2.05%] rounded-tr-full border-r-4 border-t-4",
    "right-bottom": "bottom-[2.05%] right-[2.05%] rounded-tl-full border-l-4 border-t-4",
  }[position];
  return <div className={`absolute size-[6.2%] border-[#d4ad5b] bg-[#fffaf0] ${classes}`} />;
}

function Laurel({ side }: { side: "left" | "right" }) {
  const leaves = Array.from({ length: 8 });
  return (
    <div className={`absolute top-[20%] hidden h-[23%] w-[8%] md:block ${side === "left" ? "left-[12%]" : "right-[12%]"}`}>
      <div className={`relative h-full ${side === "right" ? "scale-x-[-1]" : ""}`}>
        {leaves.map((_, index) => (
          <span
            key={index}
            className="absolute left-[42%] h-[18%] w-[32%] rounded-[100%_0] bg-[#c49a43]"
            style={{
              top: `${index * 10.5}%`,
              transform: `rotate(${-48 + index * 7}deg)`,
              transformOrigin: "bottom left",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AcademySeal() {
  return (
    <div className="relative flex size-[clamp(54px,10vw,124px)] items-center justify-center rounded-full bg-[#071936] text-[#f6d37d] shadow-lg ring-[clamp(3px,0.55vw,7px)] ring-[#d4ad5b]">
      <div className="absolute inset-[9%] rounded-full border border-[#f6d37d]" />
      <div className="absolute inset-[18%] rounded-full border border-[#f6d37d]/40" />
      <HouseLinkBrand variant="icon" iconOnly className="scale-[.62]" />
      <p className="absolute top-[13%] text-[clamp(4px,0.7vw,8px)] font-bold uppercase tracking-[0.14em]">HouseLink Academy</p>
      <p className="absolute bottom-[16%] text-[clamp(4px,0.7vw,8px)] font-bold tracking-[0.18em]">EST. 2026</p>
    </div>
  );
}

function SignatureBlock({
  signature,
  name,
  title,
  signatureUrl,
  align = "left",
}: {
  signature: string;
  name: string;
  title: string;
  signatureUrl?: string | null;
  align?: "left" | "right";
}) {
  return (
    <div className={`max-w-[92%] text-center ${align === "right" ? "ml-auto" : ""}`}>
      <div className="border-b border-[#a87922] pb-[1%]">
        {signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signatureUrl} alt="" className="mx-auto h-[clamp(18px,3.7vw,46px)] max-w-[72%] object-contain" />
        ) : (
          <p className="font-serif text-[clamp(0.9rem,2.35vw,2rem)] italic leading-none text-[#071936]">{signature}</p>
        )}
      </div>
      <p className="mt-[1.5%] text-[clamp(5px,0.95vw,11px)] font-bold uppercase tracking-[0.24em] text-[#071936]">{name}</p>
      <p className="text-[clamp(5px,0.84vw,10px)] font-bold uppercase tracking-[0.12em] text-[#0b7a46]">{title}</p>
    </div>
  );
}

function CertificateFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-[clamp(4px,1vw,14px)]">
      <p className="font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-[2%] break-words font-bold leading-tight text-[#071936] [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

function normaliseSignatureName(value: string) {
  if (/^w\.\s*tigere$/i.test(value.trim())) return "Wadzanii Tigere";
  if (/^t\.\s*ndudzo$/i.test(value.trim())) return "Tinashe Ndudzo";
  return value;
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
