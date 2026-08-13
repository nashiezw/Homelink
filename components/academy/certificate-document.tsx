"use client";

import { useRef, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CERTIFICATE_SHORT_DISCLAIMER } from "@/lib/legal/disclaimers";
import QRCode from 'qrcode';

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
  leftLaurelUrl?: string | null;
  rightLaurelUrl?: string | null;
  designation?: string | null;
  completionIntro?: string | null;
  awardIntro?: string | null;
  badgeLine?: string | null;
  recognitionLineOne?: string | null;
  recognitionLineTwo?: string | null;
  learnerNameFont?: string | null;
  learnerNameMaxFontSize?: number | null;
  learnerNameMinFontSize?: number | null;
  designationMaxFontSize?: number | null;
  badgeLineMaxFontSize?: number | null;
  customHtml?: string;
  customCss?: string;
  skillsAssessed?: string[];
  badgeName?: string;
  previewMode?: boolean;
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
  leftLaurelUrl,
  rightLaurelUrl,
  designation,
  completionIntro,
  awardIntro,
  badgeLine,
  recognitionLineOne,
  recognitionLineTwo,
  learnerNameFont,
  learnerNameMaxFontSize,
  learnerNameMinFontSize,
  designationMaxFontSize,
  badgeLineMaxFontSize,
  customHtml = "",
  customCss = "",
  badgeName,
  previewMode = false,
}: CertificateDocumentProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const issuedLong = formatDate(issuedAt);
  const expiresShort = expiresAt ? formatDate(expiresAt) : "No expiry";
  const verifyOrigin = typeof window !== "undefined" ? window.location.origin : "https://www.houselink.co.zw";
  const verifyPath = verifyUrl.replace(/^https?:\/\/[^/]+/, "");
  const verifyAbsoluteUrl = `${verifyOrigin}${verifyPath}`;
  const [qrUrl, setQrUrl] = useState<string>("");
  const displayDesignation = templateText(designation, "Certified HouseLink Agent");
  const displayCompletionIntro = templateText(completionIntro, "has successfully completed the requirements of the");
  const displayAwardIntro = templateText(awardIntro, "and is hereby awarded the designation of");
  const displayBadgeLine = templateText(badgeLine ?? badgeName, "HouseLink Foundations Graduate");
  const displayRecognitionLineOne = templateText(recognitionLineOne, "In recognition of demonstrated knowledge, skills and commitment");
  const displayRecognitionLineTwo = templateText(recognitionLineTwo, "to ethical practice and professional excellence in real estate.");
  const displaySignatureName = signatureName === "HouseLink Zimbabwe Academy" ? "T. Ndudzo" : signatureName;
  const badgeText = displayBadgeLine.toUpperCase();
  const logoHref = absoluteAssetUrl(logoUrl || "/brand/houselink-nav-lockup.png", verifyOrigin);
  const iconHref = absoluteAssetUrl("/brand/houselink-icon-transparent.png", verifyOrigin);
  const backgroundHref = backgroundUrl ? absoluteAssetUrl(backgroundUrl, verifyOrigin) : "";
  const firstSignatureHref = signatureUrl ? absoluteAssetUrl(signatureUrl, verifyOrigin) : "";
  const secondSignatureHref = secondSignatureUrl ? absoluteAssetUrl(secondSignatureUrl, verifyOrigin) : "";
  const sealHref = sealUrl ? absoluteAssetUrl(sealUrl, verifyOrigin) : "";
  const leftLaurelHref = leftLaurelUrl ? absoluteAssetUrl(leftLaurelUrl, verifyOrigin) : "";
  const rightLaurelHref = rightLaurelUrl ? absoluteAssetUrl(rightLaurelUrl, verifyOrigin) : "";
  const learnerFontStack = certificateFontStack(learnerNameFont);
  
  const [base64Images, setBase64Images] = useState<Record<string, string>>({});
  
  // Helper to get base64 version of image if available
  const getBase64Image = (url: string) => base64Images[url] || url;
  
  // Generate QR code and convert all images to base64 when component mounts
  useEffect(() => {
    const prepareCertificate = async () => {
      // Generate QR code client-side
      try {
        const qrDataUrl = await QRCode.toDataURL(verifyAbsoluteUrl, {
          width: 180,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        setQrUrl(qrDataUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
      
      // Convert all external images to base64
      const imageUrls = [logoHref, iconHref, backgroundHref, firstSignatureHref, secondSignatureHref, sealHref, leftLaurelHref, rightLaurelHref].filter(Boolean);
      const base64Map: Record<string, string> = {};
      
      await Promise.all(
        imageUrls.map(async (url) => {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            base64Map[url] = base64;
          } catch (error) {
            console.error('Failed to convert image to base64:', url, error);
          }
        })
      );
      
      setBase64Images(base64Map);
      
      // Preload fonts
      const fontPromises = [
        document.fonts.load('16px "Great Vibes"'),
        document.fonts.load('16px "Edwardian Script ITC"'),
        document.fonts.load('16px "Allura"'),
        document.fonts.load('16px "Palatino Linotype"'),
        document.fonts.load('16px "Book Antiqua"'),
        document.fonts.load('16px "Georgia"'),
        document.fonts.load('16px "Arial"'),
        document.fonts.load('16px "Times New Roman"'),
      ];
      
      await Promise.all(fontPromises);
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Extra wait for rendering
    };
    
    prepareCertificate();
  }, [logoHref, iconHref, backgroundHref, firstSignatureHref, secondSignatureHref, sealHref, leftLaurelHref, rightLaurelHref, verifyAbsoluteUrl]);
  const learnerFontSize = fitTextToWidth(
    learnerName,
    720,
    clampNumber(learnerNameMaxFontSize, 78, 52, 96),
    clampNumber(learnerNameMinFontSize, 44, 32, 64),
  );
  const learnerLetterSpacing = 0;
  const learnerTextLength = fittedTextLength(learnerName, learnerFontSize, 720);
  const designationText = displayDesignation.toUpperCase();
  const designationFontSize = fitTextToWidth(designationText, 760, clampNumber(designationMaxFontSize, 30, 18, 42), 18);
  const designationLetterSpacing = designationText.length > 34 ? 3.5 : designationText.length > 26 ? 5 : 8;
  const designationTextLength = fittedTextLength(designationText, designationFontSize, 760, designationLetterSpacing);
  const badgeFontSize = fitTextToWidth(badgeText, 680, clampNumber(badgeLineMaxFontSize, 13, 8, 24), 8);
  const badgeLetterSpacing = badgeText.length > 34 ? 3 : badgeText.length > 26 ? 5 : 8;
  const badgeTextLength = fittedTextLength(badgeText, badgeFontSize, 680, badgeLetterSpacing);
  const courseLines = splitCertificateLine(courseTitle, 42);
  const showCompletionIntro = displayCompletionIntro.trim().length > 0;
  const showAwardIntro = displayAwardIntro.trim().length > 0;
  const showDesignation = displayDesignation.trim().length > 0;
  const showBadgeLine = displayBadgeLine.trim().length > 0;
  const showRecognitionLineOne = displayRecognitionLineOne.trim().length > 0;
  const showRecognitionLineTwo = displayRecognitionLineTwo.trim().length > 0;
  const courseLineOffset = courseLines.length * 16;
  const awardLineOffset = showAwardIntro ? 0 : -24;
  const badgeSlotOffset = showBadgeLine ? 0 : 22;
  const designationY = 654 + courseLineOffset + awardLineOffset + badgeSlotOffset;
  const dividerY = 680 + courseLineOffset + awardLineOffset + badgeSlotOffset;
  const badgeLineY = 713 + courseLineOffset + awardLineOffset;
  const recognitionBaseY = showBadgeLine
    ? 746 + courseLines.length * 8 + awardLineOffset
    : 746 + courseLines.length * 8;

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
        completionIntro: displayCompletionIntro,
        awardIntro: displayAwardIntro,
        badgeLine: displayBadgeLine,
        recognitionLineOne: displayRecognitionLineOne,
        recognitionLineTwo: displayRecognitionLineTwo,
        learnerNameFont: learnerNameFont ?? "",
        learnerNameMaxFontSize: String(learnerNameMaxFontSize ?? ""),
        learnerNameMinFontSize: String(learnerNameMinFontSize ?? ""),
        designationMaxFontSize: String(designationMaxFontSize ?? ""),
        badgeLineMaxFontSize: String(badgeLineMaxFontSize ?? ""),
        accent,
        backgroundUrl: backgroundUrl ?? "",
        logoUrl: logoUrl ?? "",
        signatureUrl: signatureUrl ?? "",
        secondSignatureUrl: secondSignatureUrl ?? "",
        sealUrl: sealUrl ?? "",
        leftLaurelUrl: leftLaurelUrl ?? "",
        rightLaurelUrl: rightLaurelUrl ?? "",
        badgeName: displayBadgeLine,
      })
    : "";

  return (
    <div id={previewMode ? undefined : "houselink-certificate-print"} className={previewMode ? "certificate-print-host w-full" : "certificate-print-host mx-auto w-full max-w-7xl px-3 py-6 print:max-w-none print:px-0 print:py-0"}>
      {!previewMode ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
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
      ) : null}
      {!previewMode ? (
        <div className="certificate-actions mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">HouseLink digital certificate</p>
            <h1 className="break-words text-2xl font-bold text-slate-950 [overflow-wrap:anywhere]">{certificateTitle}</h1>
          </div>
          <div className="grid gap-2 sm:grid-cols-1">
            <Button className="w-full" type="button" variant="secondary" onClick={() => window.print()}>
              <Printer className="mr-2 size-4" /> Print
            </Button>
          </div>
        </div>
      ) : null}

      {renderedCustomHtml ? (
        <article className={previewMode ? "certificate-sheet relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-lg bg-white shadow-sm" : "certificate-sheet relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-lg bg-white shadow-hero print:rounded-none print:shadow-none"}>
          {customCss.trim() ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
          <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: renderedCustomHtml }} />
          <p className="absolute inset-x-[4%] bottom-[1.4%] text-center text-[clamp(5px,0.72vw,8px)] leading-tight text-slate-500">
            {CERTIFICATE_SHORT_DISCLAIMER}
          </p>
        </article>
      ) : (
        <article className={previewMode ? "certificate-sheet mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-lg bg-[#061936] shadow-sm" : "certificate-sheet mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-lg bg-[#061936] shadow-hero print:rounded-none print:shadow-none"}>
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
              <filter id="logo-plaque-shadow" x="-20%" y="-30%" width="140%" height="160%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#061936" floodOpacity="0.06" />
              </filter>
              <path id="embossed-seal-top-arc" d="M105 590 A80 80 0 0 0 265 590" />
              <path id="embossed-seal-bottom-arc" d="M105 590 A80 80 0 0 1 265 590" />
              <path id="center-seal-top-arc" d="M668 834 A32 32 0 0 0 732 834" />
              <path id="center-seal-bottom-arc" d="M668 834 A32 32 0 0 1 732 834" />
            </defs>

            <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#061936" />
            <rect x="30" y="24" width="1340" height="942" rx="0" fill="url(#paper-glow)" />
            {backgroundHref ? <image href={getBase64Image(backgroundHref)} x="30" y="24" width="1340" height="942" preserveAspectRatio="xMidYMid slice" opacity="0.1" /> : null}
            <rect x="30" y="24" width="1340" height="942" fill="url(#houselink-paper-dots)" />

            <rect x="45" y="39" width="1310" height="912" fill="none" stroke="#d4ad5b" strokeWidth="2" />
            <rect x="60" y="54" width="1280" height="882" fill="none" stroke="#d4ad5b" strokeWidth="4" />
            <CertificateCorner x={45} y={39} corner="tl" />
            <CertificateCorner x={1355} y={39} corner="tr" />
            <CertificateCorner x={45} y={951} corner="bl" />
            <CertificateCorner x={1355} y={951} corner="br" />

            <g>
              <line x1="76" y1="69" x2="470" y2="69" stroke="#d4ad5b" strokeWidth="2" opacity="0.68" />
              <line x1="930" y1="69" x2="1324" y2="69" stroke="#d4ad5b" strokeWidth="2" opacity="0.68" />
              <line x1="96" y1="85" x2="468" y2="85" stroke="#d4ad5b" strokeWidth="1.2" opacity="0.42" />
              <line x1="932" y1="85" x2="1304" y2="85" stroke="#d4ad5b" strokeWidth="1.2" opacity="0.42" />
            </g>
            <g filter="url(#logo-plaque-shadow)">
              <rect x="470" y="31" width="460" height="76" rx="22" fill="#fff8ea" opacity="0.92" stroke="#d4ad5b" strokeWidth="1.4" />
              <rect x="484" y="43" width="432" height="52" rx="16" fill="none" stroke="#e5d8b7" strokeWidth="1" opacity="0.68" />
              <line x1="525" y1="101" x2="875" y2="101" stroke="#d4ad5b" strokeWidth="1" opacity="0.55" />
            </g>
            <image href={getBase64Image(logoHref)} x="545" y="48" width="310" height="40" preserveAspectRatio="xMidYMid meet" />
            <text x="700" y="143" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="800" letterSpacing="9" fill="#071936">
              ZIMBABWE ACADEMY
            </text>

            <text x="1195" y="91" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="800" letterSpacing="4" fill="#071936">
              CERTIFICATE NO.
            </text>
            <text x="1195" y="117" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="19" fontWeight="700" fill="#a87922">
              {certificateNumber}
            </text>

            <LaurelSvg side="left" href={getBase64Image(leftLaurelHref)} />
            <LaurelSvg side="right" href={getBase64Image(rightLaurelHref)} />
            <EmbossedSeal iconHref={getBase64Image(iconHref)} />

            <text x="700" y="247" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="83" fontWeight="600" letterSpacing="18" fill="#071936">
              CERTIFICATE
            </text>
            <line x1="330" y1="293" x2="430" y2="293" stroke="#d4ad5b" strokeWidth="2" />
            <text x="700" y="307" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="38" letterSpacing="11" fill="#a87922">
              OF ACHIEVEMENT
            </text>
            <line x1="960" y1="293" x2="1060" y2="293" stroke="#d4ad5b" strokeWidth="2" />
            <text x="700" y="362" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" letterSpacing="8" fill="#071936">
              THIS CERTIFIES THAT
            </text>
            <text x="700" y="467" textAnchor="middle" fontFamily={learnerFontStack} fontSize={learnerFontSize} fontStyle="normal" fontWeight="400" letterSpacing={learnerLetterSpacing} textLength={learnerTextLength} lengthAdjust="spacingAndGlyphs" fill="#071936">
              {learnerName}
            </text>
            <path d="M470 484 C585 499, 815 499, 930 484" fill="none" stroke="#d4ad5b" strokeWidth="2" />
            {showCompletionIntro ? (
              <text x="700" y="536" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fill="#2d2a25">
                {displayCompletionIntro}
              </text>
            ) : null}
            {courseLines.map((line, index) => (
              <text key={line} x="700" y={566 + index * 24} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontWeight="700" fill="#071936">
                {line}
              </text>
            ))}
            {showAwardIntro ? (
              <text x="700" y={590 + courseLines.length * 24} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fill="#2d2a25">
                {displayAwardIntro}
              </text>
            ) : null}
            {showDesignation ? (
              <text x="700" y={designationY} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize={designationFontSize} fontWeight="700" letterSpacing={designationLetterSpacing} textLength={designationTextLength} lengthAdjust="spacingAndGlyphs" fill="#0b7a46">
                {designationText}
              </text>
            ) : null}
            <line x1="470" y1={dividerY} x2="930" y2={dividerY} stroke="#d4ad5b" strokeWidth="2" />
            {showBadgeLine ? (
              <text x="700" y={badgeLineY} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={badgeFontSize} fontWeight="800" letterSpacing={badgeLetterSpacing} textLength={badgeTextLength} lengthAdjust="spacingAndGlyphs" fill="#071936">
                {badgeText}
              </text>
            ) : null}
            {showRecognitionLineOne ? (
              <text x="700" y={recognitionBaseY} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="17" fontStyle="italic" fill="#2d2a25">
                {displayRecognitionLineOne}
              </text>
            ) : null}
            {showRecognitionLineTwo ? (
              <text x="700" y={recognitionBaseY + 24} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="17" fontStyle="italic" fill="#2d2a25">
                {displayRecognitionLineTwo}
              </text>
            ) : null}

            {qrUrl && <image href={qrUrl} x="80" y="792" width="74" height="74" />}
            <text x="117" y="883" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8.5" fontWeight="800" letterSpacing="1.2" fill="#071936">
              VERIFY THIS CERTIFICATE
            </text>
            <text x="117" y="899" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8.5" fill="#2d2a25">
              Scan the QR code or visit:
            </text>
            <text x="117" y="914" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8.5" fontWeight="700" fill="#0b7a46">
              {verifyOrigin.replace(/^https?:\/\//, "")}/academy/verify
            </text>

            <SignatureSvg x={375} y={812} signature={secondSignatureName} name={normaliseSignatureName(secondSignatureName)} title={secondSignatureTitle} href={getBase64Image(secondSignatureHref)} />
            <CenterSeal href={getBase64Image(sealHref)} />
            <SignatureSvg x={1050} y={812} signature={displaySignatureName} name={normaliseSignatureName(displaySignatureName)} title={signatureTitle} href={getBase64Image(firstSignatureHref)} />

            <CertificateFactSvg x={700} y={895} label="Date of Issue" value={issuedLong} />
            <line x1="860" y1="878" x2="860" y2="932" stroke="#d4ad5b" strokeWidth="2" />
            <CertificateFactSvg x={1050} y={895} label="Certificate ID" value={certificateNumber} />
            <line x1="1190" y1="878" x2="1190" y2="932" stroke="#d4ad5b" strokeWidth="2" />
            <CertificateFactSvg x={1275} y={895} label="Valid Until" value={expiresShort} />

            <text x="700" y="947" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="6.8" fill="#6b7280">
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

function LaurelSvg({ side, href }: { side: "left" | "right"; href?: string }) {
  if (href) {
    const x = side === "left" ? 235 : 1065;
    return <image href={href} x={x} y="250" width="110" height="270" preserveAspectRatio="xMidYMid meet" />;
  }

  const leaves = [
    { x: 296, y: 278, angle: -48, scale: 0.78 },
    { x: 282, y: 299, angle: -53, scale: 0.9 },
    { x: 269, y: 323, angle: -57, scale: 1 },
    { x: 259, y: 350, angle: -60, scale: 1.08 },
    { x: 253, y: 380, angle: -61, scale: 1.1 },
    { x: 253, y: 410, angle: -57, scale: 1.04 },
    { x: 260, y: 438, angle: -50, scale: 0.98 },
    { x: 272, y: 464, angle: -40, scale: 0.9 },
    { x: 288, y: 487, angle: -29, scale: 0.78 },
  ];
  const mirror = side === "right" ? "translate(1400 0) scale(-1 1)" : undefined;

  return (
    <g transform={mirror} opacity="0.95">
      <path d="M316 256 C254 324 248 430 314 512" fill="none" stroke="#b88b32" strokeWidth="3" strokeLinecap="round" />
      {leaves.map((leaf, index) => (
        <g key={index}>
          <path d={`M${leaf.x + 18} ${leaf.y + 8} C${leaf.x + 7} ${leaf.y + 5}, ${leaf.x} ${leaf.y}, ${leaf.x - 7} ${leaf.y - 10}`} fill="none" stroke="#b88b32" strokeWidth="1.7" strokeLinecap="round" />
          <path
            d="M0 0 C-12 -14 -12 -34 7 -50 C21 -29 17 -10 0 0Z"
            fill="#c69b45"
            transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle}) scale(${leaf.scale})`}
          />
          <path
            d="M0 0 C-4 -11 -1 -25 7 -39"
            fill="none"
            stroke="#e0bd68"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.55"
            transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle}) scale(${leaf.scale})`}
          />
        </g>
      ))}
      <path d="M314 512 C301 500 290 487 282 472" fill="none" stroke="#b88b32" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  );
}

function EmbossedSeal({ iconHref }: { iconHref: string }) {
  return (
    <g opacity="0.72">
      <circle cx="185" cy="590" r="108" fill="#f7f3eb" stroke="#d8d4cb" strokeWidth="3" />
      <circle cx="185" cy="590" r="88" fill="none" stroke="#d8d4cb" strokeWidth="2" />
      <circle cx="185" cy="590" r="70" fill="none" stroke="#d8d4cb" strokeWidth="1.5" />
      <text fontFamily="Arial, sans-serif" fontSize="12" fontWeight="800" letterSpacing="2.5" fill="#c8c2b8">
        <textPath href="#embossed-seal-top-arc" startOffset="50%" textAnchor="middle">
          HOUSELINK ZIMBABWE ACADEMY
        </textPath>
      </text>
      {iconHref && <image href={iconHref} x="139" y="548" width="92" height="76" preserveAspectRatio="xMidYMid meet" opacity="0.24" />}
      <text fontFamily="Arial, sans-serif" fontSize="10.5" fontWeight="800" letterSpacing="2.8" fill="#c8c2b8">
        <textPath href="#embossed-seal-bottom-arc" startOffset="50%" textAnchor="middle">
          EXCELLENCE - INTEGRITY
        </textPath>
      </text>
    </g>
  );
}

function CenterSeal({ href }: { href: string }) {
  if (href) {
    return <image href={href} x="654" y="786" width="92" height="92" preserveAspectRatio="xMidYMid meet" filter="url(#soft-shadow)" />;
  }

  return (
    <g filter="url(#soft-shadow)">
      <circle cx="700" cy="834" r="46" fill="#071936" stroke="#d4ad5b" strokeWidth="6" />
      <circle cx="700" cy="834" r="36" fill="none" stroke="#f6d37d" strokeWidth="1.2" />
      <text fontFamily="Arial, sans-serif" fontSize="6.4" fontWeight="800" letterSpacing="1" fill="#f6d37d">
        <textPath href="#center-seal-top-arc" startOffset="50%" textAnchor="middle">
          HOUSELINK ACADEMY
        </textPath>
      </text>
      <HouseLinkSealIcon x={700} y={836} />
      <text fontFamily="Arial, sans-serif" fontSize="6.5" fontWeight="800" letterSpacing="1.6" fill="#f6d37d">
        <textPath href="#center-seal-bottom-arc" startOffset="50%" textAnchor="middle">
          EST. 2026
        </textPath>
      </text>
    </g>
  );
}

function HouseLinkSealIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 20} ${y - 22}) scale(0.72)`} fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 35 L8 18 L28 5 L48 18 L48 35" strokeWidth="5.5" />
      <path d="M16 35 H48" strokeWidth="5.5" />
      <path d="M18 35 V25 C18 19 22 16 27 16 C32 16 36 19 36 25 V35" strokeWidth="5.5" />
      <g fill="#ffffff" stroke="none">
        <rect x="24" y="20" width="5" height="5" rx="1" />
        <rect x="31" y="20" width="5" height="5" rx="1" />
        <rect x="24" y="27" width="5" height="5" rx="1" />
        <rect x="31" y="27" width="5" height="5" rx="1" />
      </g>
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
        <image href={href} x={x - 94} y={y - 60} width="188" height="48" preserveAspectRatio="xMidYMid meet" />
      ) : (
        <text x={x} y={y - 8} textAnchor="middle" fontFamily="'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive" fontSize="31" fontStyle="italic" fill="#071936">
          {signature}
        </text>
      )}
      <line x1={x - 112} y1={y + 12} x2={x + 112} y2={y + 12} stroke="#a87922" strokeWidth="2" />
      <text x={x} y={y + 36} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" letterSpacing="2.5" fill="#071936">
        {name.toUpperCase()}
      </text>
      <text x={x} y={y + 55} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8.6" fontWeight="800" letterSpacing="1.1" fill="#0b7a46">
        {title.toUpperCase()}
      </text>
    </g>
  );
}

function CertificateFactSvg({ x, y, label, value }: { x: number; y: number; label: string; value: string }) {
  return (
    <g>
      <text x={x} y={y} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9.5" fontWeight="800" letterSpacing="1.8" fill="#6b7280">
        {label.toUpperCase()}
      </text>
      <text x={x} y={y + 29} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize={value.length > 20 ? 13 : 16} fontWeight="700" fill="#071936">
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

function fitTextToWidth(value: string, maxWidth: number, maxFontSize: number, minFontSize: number) {
  const estimatedWidthAtOnePixel = value.split("").reduce((sum, char) => {
    if (char === " ") return sum + 0.28;
    if (/[A-Z]/.test(char)) return sum + 0.62;
    if (/[il.,']/i.test(char)) return sum + 0.28;
    if (/[mw]/i.test(char)) return sum + 0.82;
    return sum + 0.52;
  }, 0);
  if (!estimatedWidthAtOnePixel) return maxFontSize;
  return Math.max(minFontSize, Math.min(maxFontSize, Math.floor(maxWidth / estimatedWidthAtOnePixel)));
}

function fittedTextLength(value: string, fontSize: number, maxWidth: number, letterSpacing = 0) {
  const estimatedWidth = value.split("").reduce((sum, char) => {
    if (char === " ") return sum + 0.28 * fontSize;
    if (/[A-Z]/.test(char)) return sum + 0.62 * fontSize;
    if (/[il.,']/i.test(char)) return sum + 0.28 * fontSize;
    if (/[mw]/i.test(char)) return sum + 0.82 * fontSize;
    return sum + 0.52 * fontSize;
  }, Math.max(0, value.length - 1) * letterSpacing);
  return Math.round(Math.min(maxWidth, Math.max(estimatedWidth, maxWidth * 0.42)));
}

function certificateFontStack(value: string | null | undefined) {
  if (value === "formal-script") return "'Edwardian Script ITC', 'Great Vibes', 'Good Vibes', 'Segoe Script', 'Brush Script MT', cursive";
  if (value === "clean-script") return "'Allura', 'Great Vibes', 'Good Vibes', 'Segoe Script', cursive";
  if (value === "classic-serif") return "'Palatino Linotype', 'Book Antiqua', Georgia, serif";
  return "'Great Vibes', 'Good Vibes', 'Allura', 'Edwardian Script ITC', 'Segoe Script', 'Brush Script MT', cursive";
}

function clampNumber(value: number | null | undefined, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function absoluteAssetUrl(value: string, origin: string) {
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function normaliseSignatureName(value: string) {
  if (/^w\.\s*tigere$/i.test(value.trim())) return "Wadzanai Tigere";
  if (/^t\.\s*ndudzo$/i.test(value.trim())) return "Tinashe Ndudzo";
  return value;
}

function templateText(value: string | null | undefined, fallback: string) {
  return value === undefined || value === null ? fallback : value;
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
