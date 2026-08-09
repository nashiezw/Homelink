"use client";

import { useRef } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const SVG_WIDTH = 1400;
const SVG_HEIGHT = 990;

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
  badgeName,
}: CertificateDocumentProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const issuedLong = formatDate(issuedAt);
  const expiresShort = expiresAt ? formatDate(expiresAt) : "No expiry";
  const verifyOrigin = typeof window !== "undefined" ? window.location.origin : "https://www.houselink.co.zw";
  const verifyPath = verifyUrl.replace(/^https?:\/\/[^/]+/, "");
  const verifyAbsoluteUrl = `${verifyOrigin}${verifyPath}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(verifyAbsoluteUrl)}`;
  const displayDesignation = designation?.trim() || "Certified HouseLink Agent";
  const displaySignatureName = signatureName === "HouseLink Zimbabwe Academy" ? "T. Ndudzo" : signatureName;
  const badgeText = (badgeName || "HouseLink Foundations Graduate").toUpperCase();
  const logoHref = absoluteAssetUrl(logoUrl || "/brand/houselink-full-lockup.png", verifyOrigin);
  const backgroundHref = backgroundUrl ? absoluteAssetUrl(backgroundUrl, verifyOrigin) : "";
  const firstSignatureHref = signatureUrl ? absoluteAssetUrl(signatureUrl, verifyOrigin) : "";
  const secondSignatureHref = secondSignatureUrl ? absoluteAssetUrl(secondSignatureUrl, verifyOrigin) : "";
  const sealHref = sealUrl ? absoluteAssetUrl(sealUrl, verifyOrigin) : "";
  const learnerFontSize = learnerName.length > 28 ? 70 : learnerName.length > 20 ? 82 : 96;
  const designationFontSize = displayDesignation.length > 30 ? 35 : displayDesignation.length > 24 ? 39 : 44;
  const courseLines = splitCertificateLine(courseTitle, 42);

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
        badgeName: badgeName ?? "",
      })
    : "";

  function downloadLandscapeCertificate() {
    if (!svgRef.current) {
      window.print();
      return;
    }

    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(SVG_WIDTH));
    clone.setAttribute("height", String(SVG_HEIGHT));
    const source = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${certificateNumber || "houselink-certificate"}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

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
              #houselink-certificate-print .certificate-sheet { width: 297mm !important; height: 210mm !important; max-width: none !important; border-radius: 0 !important; box-shadow: none !important; break-inside: avoid !important; page-break-after: avoid !important; overflow: hidden !important; }
              #houselink-certificate-print .certificate-svg { display: block !important; width: 297mm !important; height: 210mm !important; }
            }
          `,
        }}
      />
      <div className="certificate-actions mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">HouseLink digital certificate</p>
          <h1 className="break-words text-2xl font-bold text-slate-950 [overflow-wrap:anywhere]">{certificateTitle}</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="w-full sm:w-auto" onClick={downloadLandscapeCertificate} style={{ backgroundColor: accent }}>
            <Download className="mr-2 size-4" /> Download Certificate
          </Button>
          <Button className="w-full sm:w-auto" type="button" variant="secondary" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Print
          </Button>
        </div>
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
        <article className="certificate-sheet mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-lg bg-[#061936] shadow-hero print:rounded-none print:shadow-none">
          <svg
            ref={svgRef}
            className="certificate-svg block h-full w-full"
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            role="img"
            aria-label={`${certificateTitle} for ${learnerName}`}
          >
            <defs>
              <pattern id="houselink-paper-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="1.2" fill="#d4ad5b" opacity="0.18" />
              </pattern>
              <radialGradient id="paper-glow" cx="50%" cy="45%" r="72%">
                <stop offset="0%" stopColor="#fffdf7" />
                <stop offset="62%" stopColor="#fff8ea" />
                <stop offset="100%" stopColor="#f6eddc" />
              </radialGradient>
              <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#061936" floodOpacity="0.18" />
              </filter>
            </defs>

            <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#061936" />
            <rect x="30" y="24" width="1340" height="942" rx="0" fill="url(#paper-glow)" />
            {backgroundHref ? <image href={backgroundHref} x="30" y="24" width="1340" height="942" preserveAspectRatio="xMidYMid slice" opacity="0.1" /> : null}
            <rect x="30" y="24" width="1340" height="942" fill="url(#houselink-paper-dots)" />

            <rect x="45" y="39" width="1310" height="912" fill="none" stroke="#d4ad5b" strokeWidth="2" />
            <rect x="60" y="54" width="1280" height="882" fill="none" stroke="#d4ad5b" strokeWidth="4" />
            <CertificateCorner x={45} y={39} corner="tl" />
            <CertificateCorner x={1355} y={39} corner="tr" />
            <CertificateCorner x={45} y={951} corner="bl" />
            <CertificateCorner x={1355} y={951} corner="br" />

            <image href={logoHref} x="445" y="26" width="510" height="130" preserveAspectRatio="xMidYMid meet" />
            <text x="700" y="137" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="13" fill="#071936">
              ZIMBABWE ACADEMY
            </text>

            <text x="1195" y="91" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="800" letterSpacing="4" fill="#071936">
              CERTIFICATE NO.
            </text>
            <text x="1195" y="117" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="19" fontWeight="700" fill="#a87922">
              {certificateNumber}
            </text>

            <LaurelSvg side="left" />
            <LaurelSvg side="right" />
            <EmbossedSeal />

            <text x="700" y="247" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="83" fontWeight="600" letterSpacing="18" fill="#071936">
              CERTIFICATE
            </text>
            <line x1="370" y1="293" x2="520" y2="293" stroke="#d4ad5b" strokeWidth="2" />
            <text x="700" y="307" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="38" letterSpacing="11" fill="#a87922">
              OF ACHIEVEMENT
            </text>
            <line x1="880" y1="293" x2="1030" y2="293" stroke="#d4ad5b" strokeWidth="2" />
            <text x="700" y="362" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" letterSpacing="8" fill="#071936">
              THIS CERTIFIES THAT
            </text>
            <text x="700" y="467" textAnchor="middle" fontFamily="'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive" fontSize={learnerFontSize} fontStyle="italic" fill="#071936">
              {learnerName}
            </text>
            <path d="M470 484 C585 499, 815 499, 930 484" fill="none" stroke="#d4ad5b" strokeWidth="2" />
            <text x="700" y="536" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fill="#2d2a25">
              has successfully completed the requirements of the
            </text>
            {courseLines.map((line, index) => (
              <text key={line} x="700" y={566 + index * 24} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontWeight="700" fill="#071936">
                {line}
              </text>
            ))}
            <text x="700" y={590 + courseLines.length * 24} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fill="#2d2a25">
              and is hereby awarded the designation of
            </text>
            <text x="700" y={654 + courseLines.length * 16} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize={designationFontSize} fontWeight="700" letterSpacing="8" fill="#0b7a46">
              {displayDesignation.toUpperCase()}
            </text>
            <line x1="470" y1={680 + courseLines.length * 16} x2="930" y2={680 + courseLines.length * 16} stroke="#d4ad5b" strokeWidth="2" />
            <text x="700" y={713 + courseLines.length * 16} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="800" letterSpacing="8" fill="#071936">
              {badgeText}
            </text>
            <text x="700" y={754 + courseLines.length * 10} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fontStyle="italic" fill="#2d2a25">
              In recognition of demonstrated knowledge, skills and commitment
            </text>
            <text x="700" y={779 + courseLines.length * 10} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fontStyle="italic" fill="#2d2a25">
              to ethical practice and professional excellence in real estate.
            </text>

            <image href={qrUrl} x="78" y="790" width="92" height="92" />
            <text x="205" y="805" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" letterSpacing="2" fill="#071936">
              VERIFY THIS CERTIFICATE
            </text>
            <text x="205" y="827" fontFamily="Arial, sans-serif" fontSize="12" fill="#2d2a25">
              Scan the QR code or visit:
            </text>
            <text x="205" y="849" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#0b7a46">
              {verifyOrigin.replace(/^https?:\/\//, "")}/academy/verify
            </text>

            <SignatureSvg x={360} y={822} signature={secondSignatureName} name={normaliseSignatureName(secondSignatureName)} title={secondSignatureTitle} href={secondSignatureHref} />
            <CenterSeal href={sealHref} logoHref={logoHref} />
            <SignatureSvg x={1040} y={822} signature={displaySignatureName} name={normaliseSignatureName(displaySignatureName)} title={signatureTitle} href={firstSignatureHref} />

            <CertificateFactSvg x={800} y={872} label="Date of Issue" value={issuedLong} />
            <line x1="940" y1="842" x2="940" y2="925" stroke="#d4ad5b" strokeWidth="2" />
            <CertificateFactSvg x={1038} y={872} label="Certificate ID" value={certificateNumber} />
            <line x1="1168" y1="842" x2="1168" y2="925" stroke="#d4ad5b" strokeWidth="2" />
            <CertificateFactSvg x={1262} y={872} label="Valid Until" value={expiresShort} />

            <text x="700" y="940" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8.5" fill="#6b7280">
              {CERTIFICATE_SHORT_DISCLAIMER}
            </text>
          </svg>
        </article>
      )}
    </div>
  );
}

function CertificateCorner({ x, y, corner }: { x: number; y: number; corner: "tl" | "tr" | "bl" | "br" }) {
  const paths = {
    tl: `M${x + 80} ${y} Q${x + 80} ${y + 42} ${x + 38} ${y + 42} L${x + 38} ${y + 82}`,
    tr: `M${x - 80} ${y} Q${x - 80} ${y + 42} ${x - 38} ${y + 42} L${x - 38} ${y + 82}`,
    bl: `M${x + 80} ${y} Q${x + 80} ${y - 42} ${x + 38} ${y - 42} L${x + 38} ${y - 82}`,
    br: `M${x - 80} ${y} Q${x - 80} ${y - 42} ${x - 38} ${y - 42} L${x - 38} ${y - 82}`,
  };
  return <path d={paths[corner]} fill="none" stroke="#d4ad5b" strokeWidth="5" strokeLinecap="round" />;
}

function LaurelSvg({ side }: { side: "left" | "right" }) {
  const leaves = Array.from({ length: 9 });
  const sign = side === "left" ? 1 : -1;
  const baseX = side === "left" ? 260 : 1140;

  return (
    <g opacity="0.9">
      {leaves.map((_, index) => {
        const y = 270 + index * 24;
        const x = baseX - sign * Math.sin(index / 3) * 18;
        return <ellipse key={index} cx={x} cy={y} rx="10" ry="28" fill="#c49a43" transform={`rotate(${sign * (-38 + index * 5)} ${x} ${y})`} />;
      })}
      <path d={side === "left" ? "M285 248 C220 325, 214 430, 292 510" : "M1115 248 C1180 325, 1186 430, 1108 510"} fill="none" stroke="#c49a43" strokeWidth="4" />
    </g>
  );
}

function EmbossedSeal() {
  return (
    <g opacity="0.72">
      <circle cx="185" cy="590" r="108" fill="#f7f3eb" stroke="#d8d4cb" strokeWidth="3" />
      <circle cx="185" cy="590" r="88" fill="none" stroke="#d8d4cb" strokeWidth="2" />
      <circle cx="185" cy="590" r="70" fill="none" stroke="#d8d4cb" strokeWidth="1.5" />
      <text x="185" y="542" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" letterSpacing="3" fill="#c8c2b8">
        HOUSELINK ZIMBABWE ACADEMY
      </text>
      <text x="185" y="595" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="74" fontWeight="800" fill="#d6d0c7">
        HL
      </text>
      <text x="185" y="654" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="700" letterSpacing="3" fill="#c8c2b8">
        EXCELLENCE - INTEGRITY
      </text>
    </g>
  );
}

function CenterSeal({ href, logoHref }: { href: string; logoHref: string }) {
  if (href) {
    return <image href={href} x="610" y="758" width="180" height="180" preserveAspectRatio="xMidYMid meet" filter="url(#soft-shadow)" />;
  }

  return (
    <g filter="url(#soft-shadow)">
      <circle cx="700" cy="850" r="78" fill="#071936" stroke="#d4ad5b" strokeWidth="10" />
      <circle cx="700" cy="850" r="61" fill="none" stroke="#f6d37d" strokeWidth="2" />
      <text x="700" y="801" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" letterSpacing="2" fill="#f6d37d">
        HOUSELINK ZIMBABWE ACADEMY
      </text>
      <image href={logoHref} x="660" y="815" width="80" height="70" preserveAspectRatio="xMidYMid meet" />
      <text x="700" y="901" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="800" letterSpacing="4" fill="#f6d37d">
        EST. 2026
      </text>
    </g>
  );
}

function SignatureSvg({
  x,
  y,
  signature,
  name,
  title,
  href,
}: {
  x: number;
  y: number;
  signature: string;
  name: string;
  title: string;
  href: string;
}) {
  return (
    <g>
      {href ? (
        <image href={href} x={x - 100} y={y - 58} width="200" height="62" preserveAspectRatio="xMidYMid meet" />
      ) : (
        <text x={x} y={y} textAnchor="middle" fontFamily="'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive" fontSize="36" fontStyle="italic" fill="#071936">
          {signature}
        </text>
      )}
      <line x1={x - 125} y1={y + 14} x2={x + 125} y2={y + 14} stroke="#a87922" strokeWidth="2" />
      <text x={x} y={y + 42} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="800" letterSpacing="4" fill="#071936">
        {name.toUpperCase()}
      </text>
      <text x={x} y={y + 66} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="800" letterSpacing="2" fill="#0b7a46">
        {title.toUpperCase()}
      </text>
    </g>
  );
}

function CertificateFactSvg({ x, y, label, value }: { x: number; y: number; label: string; value: string }) {
  return (
    <g>
      <text x={x} y={y} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" letterSpacing="2" fill="#6b7280">
        {label.toUpperCase()}
      </text>
      <text x={x} y={y + 32} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fontWeight="700" fill="#071936">
        {value}
      </text>
    </g>
  );
}

function splitCertificateLine(value: string, maxLength: number) {
  if (value.length <= maxLength) return [value];
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function absoluteAssetUrl(value: string, origin: string) {
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
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
