"use client";

import Image from "next/image";
import { Download } from "lucide-react";
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
  signatureName = "T. Ndudzo",
  signatureTitle = "Director of Training & Certification",
  customHtml = "",
  customCss = "",
  skillsAssessed = [],
  badgeName,
}: CertificateDocumentProps) {
  const issuedLong = new Date(issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const issuedShort = new Date(issuedAt).toLocaleDateString("en-GB");
  const expiresShort = expiresAt ? new Date(expiresAt).toLocaleDateString("en-GB") : "No expiry";
  const verifyOrigin = typeof window !== "undefined" ? window.location.origin : "https://www.houselink.co.zw";
  const verifyAbsoluteUrl = `${verifyOrigin}${verifyUrl.replace(/^https?:\/\/[^/]+/, "")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=8&data=${encodeURIComponent(verifyAbsoluteUrl)}`;
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
        accent,
        backgroundUrl: backgroundUrl ?? "",
        logoUrl: logoUrl ?? "",
        signatureUrl: signatureUrl ?? "",
        skillsAssessed: skillsAssessed.join(", "),
        badgeName: badgeName ?? "",
      })
    : "";

  return (
    <div id="houselink-certificate-print" className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4 landscape; margin: 0; }
              html, body { width: 100%; height: 100%; background: white !important; }
              body * { visibility: hidden !important; }
              #houselink-certificate-print, #houselink-certificate-print * { visibility: visible !important; }
              #houselink-certificate-print { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; background: white !important; }
              #houselink-certificate-print .certificate-sheet { width: 100vw !important; height: 100vh !important; max-width: none !important; border-radius: 0 !important; box-shadow: none !important; }
            }
          `,
        }}
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-semibold text-emerald-700">HouseLink digital certificate</p>
          <h1 className="text-2xl font-bold">{certificateTitle}</h1>
        </div>
        <Button onClick={() => window.print()} style={{ backgroundColor: accent }}>
          <Download className="mr-2 size-4" /> Download / Print PDF
        </Button>
      </div>

      {renderedCustomHtml ? (
        <article className="relative overflow-hidden rounded-xl bg-white shadow-hero print:rounded-none print:shadow-none">
          {customCss.trim() ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
          <div dangerouslySetInnerHTML={{ __html: renderedCustomHtml }} />
        </article>
      ) : (
        <article
          className="certificate-sheet relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-lg bg-[#061a35] p-[1.6%] text-[#071936] shadow-hero print:p-[1.2%]"
          style={{
            backgroundImage: backgroundUrl ? `linear-gradient(rgba(6,26,53,.88), rgba(6,26,53,.92)), url(${backgroundUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="relative h-full overflow-hidden bg-[#fffaf0] px-[4.2%] py-[3.1%]">
            <div className="absolute inset-[1.1%] border border-[#d6ad55]" />
            <div className="absolute inset-[2.1%] border-2 border-[#d6ad55]" />
            <div className="absolute left-[2.1%] top-[2.1%] size-[5.8%] rounded-br-full border-b-4 border-r-4 border-[#d6ad55] bg-[#fffaf0]" />
            <div className="absolute right-[2.1%] top-[2.1%] size-[5.8%] rounded-bl-full border-b-4 border-l-4 border-[#d6ad55] bg-[#fffaf0]" />
            <div className="absolute bottom-[2.1%] left-[2.1%] size-[5.8%] rounded-tr-full border-r-4 border-t-4 border-[#d6ad55] bg-[#fffaf0]" />
            <div className="absolute bottom-[2.1%] right-[2.1%] size-[5.8%] rounded-tl-full border-l-4 border-t-4 border-[#d6ad55] bg-[#fffaf0]" />
            <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_center,#0a1d3f_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="relative grid h-full grid-rows-[auto_1fr_auto]">
              <header className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
                <div />
                <div className="text-center">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="HouseLink Zimbabwe Academy" className="mx-auto h-14 w-auto object-contain sm:h-20" />
                  ) : (
                    <Image src="/brand/houselink-full-lockup.png" alt="HouseLink Zimbabwe Academy" width={360} height={150} className="mx-auto h-14 w-auto object-contain sm:h-20" priority />
                  )}
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.52em] text-[#071936] sm:text-xs">Zimbabwe Academy</p>
                </div>
                <div className="pt-2 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#071936] sm:text-[11px]">Certificate No.</p>
                  <p className="mt-1 break-words text-xs font-semibold text-[#a87922] [overflow-wrap:anywhere] sm:text-sm">{certificateNumber}</p>
                </div>
              </header>

              <main className="relative flex flex-col items-center justify-center text-center">
                <div className="absolute left-[8%] top-[25%] hidden h-28 w-12 rounded-l-full border-y-4 border-l-4 border-[#c49a43] opacity-80 md:block" />
                <div className="absolute right-[8%] top-[25%] hidden h-28 w-12 rounded-r-full border-y-4 border-r-4 border-[#c49a43] opacity-80 md:block" />
                <div className="absolute left-[2%] top-[47%] hidden size-28 rounded-full border border-slate-200 bg-white/60 text-center text-[9px] font-bold uppercase tracking-widest text-slate-300 shadow-inner md:flex md:items-center md:justify-center">
                  HouseLink<br />Zimbabwe<br />Academy
                </div>

                <h1 className="font-serif text-4xl font-semibold uppercase tracking-[0.38em] text-[#071936] sm:text-6xl lg:text-7xl">Certificate</h1>
                <div className="mt-2 flex items-center gap-5 text-[#a87922]">
                  <span className="h-px w-20 bg-[#d6ad55]" />
                  <p className="font-serif text-lg uppercase tracking-[0.24em] sm:text-2xl">of Achievement</p>
                  <span className="h-px w-20 bg-[#d6ad55]" />
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.42em] text-[#071936] sm:text-xs">This certifies that</p>
                <p className="mt-2 break-words font-serif text-4xl italic leading-none text-[#071936] [overflow-wrap:anywhere] sm:text-7xl">{learnerName}</p>
                <div className="mt-1 h-px w-[52%] bg-[#d6ad55]" />
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#2d2a25] sm:text-base">
                  has successfully completed the requirements of the
                  <br />
                  <strong className="font-bold text-[#071936]">{courseTitle}</strong>
                  <br />
                  and is hereby awarded the designation of
                </p>
                <p className="mt-3 break-words text-2xl font-bold uppercase tracking-[0.16em] text-[#0b7a46] [overflow-wrap:anywhere] sm:text-4xl">{certificateTitle}</p>
                {badgeName && <p className="mt-2 text-xs font-bold uppercase tracking-[0.38em] text-[#071936] sm:text-sm">{badgeName}</p>}
                <p className="mt-3 max-w-2xl font-serif text-sm italic leading-5 text-[#2d2a25] sm:text-base">
                  In recognition of demonstrated knowledge, skills and commitment to ethical practice and professional excellence in real estate.
                </p>
              </main>

              <footer className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
                <div>
                  <div className="flex items-end gap-4">
                    <div className="border border-[#d6ad55] bg-white p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrUrl} alt="Certificate verification QR code" className="size-16 sm:size-20" />
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#071936] sm:text-[11px]">Verify this certificate</p>
                      <p className="mt-1 text-[9px] leading-4 text-[#2d2a25] sm:text-xs">Scan the QR code or visit:</p>
                      <p className="break-all text-[9px] font-bold text-[#0b7a46] sm:text-xs">{verifyOrigin.replace(/^https?:\/\//, "")}/academy/verify</p>
                    </div>
                  </div>
                  <SignatureBlock signature="W. Tigere" name="Wadzanii Tigere" title="Academy Director" />
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative flex size-24 items-center justify-center rounded-full bg-[#071936] text-[#f6d37d] shadow-lg ring-4 ring-[#d6ad55] sm:size-32">
                    <div className="absolute inset-2 rounded-full border border-[#f6d37d]" />
                    <HouseLinkBrand variant="icon" iconOnly className="scale-75" />
                    <p className="absolute bottom-3 text-[8px] font-bold tracking-[0.22em] sm:text-[9px]">EST. 2026</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4 text-center text-[9px] sm:text-xs">
                    <CertificateFact label="Date of Issue" value={issuedShort} />
                    <CertificateFact label="Certificate ID" value={certificateNumber} />
                    <CertificateFact label="Valid Until" value={expiresShort} />
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <SignatureBlock
                    signature={displaySignatureName}
                    name={displaySignatureName}
                    title={signatureTitle}
                    signatureUrl={signatureUrl}
                    align="right"
                  />
                </div>
              </footer>
            </div>
          </div>
        </article>
      )}
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
    <div className={`mt-6 max-w-56 text-center ${align === "right" ? "ml-auto" : ""}`}>
      <div className="border-b border-[#a87922] pb-1">
        {signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signatureUrl} alt="" className="mx-auto h-10 max-w-44 object-contain" />
        ) : (
          <p className="font-serif text-xl italic text-[#071936] sm:text-2xl">{signature}</p>
        )}
      </div>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[#071936] sm:text-[11px]">{name}</p>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#0b7a46] sm:text-[10px]">{title}</p>
    </div>
  );
}

function CertificateFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[#d6ad55] px-3 first:border-l-0">
      <p className="font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 break-words font-bold text-[#071936] [overflow-wrap:anywhere]">{value}</p>
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
