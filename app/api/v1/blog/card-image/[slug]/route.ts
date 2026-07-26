import { NextResponse } from "next/server";

type Props = { params: Promise<{ slug: string }> };

const palettes = [
  ["#063f3a", "#0f766e", "#f8fafc"],
  ["#1f2937", "#2563eb", "#ecfeff"],
  ["#3f2f12", "#ca8a04", "#fff7ed"],
  ["#3b1020", "#be123c", "#fff1f2"],
  ["#123524", "#16a34a", "#f0fdf4"],
  ["#172554", "#0891b2", "#eff6ff"],
] as const;

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const variant = new URL(_request.url).searchParams.get("variant") === "hero" ? "hero" : "card";
  const title = titleFromSlug(slug);
  const palette = palettes[hash(slug) % palettes.length];
  const accentX = 120 + (hash(`${slug}-x`) % 780);
  const accentY = 80 + (hash(`${slug}-y`) % 380);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette[0]}"/>
      <stop offset="1" stop-color="${palette[1]}"/>
    </linearGradient>
    <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M64 0H0V64" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#grid)" opacity="0.55"/>
  <circle cx="${accentX}" cy="${accentY}" r="${variant === "hero" ? 210 : 150}" fill="${palette[2]}" opacity="0.12"/>
  <path d="M0 530 C180 455 330 595 510 520 S860 438 1200 520 V675 H0 Z" fill="rgba(255,255,255,0.12)"/>
  <path d="M120 505 L280 395 L450 505 Z" fill="rgba(255,255,255,0.20)"/>
  <path d="M335 505 L520 340 L760 505 Z" fill="rgba(255,255,255,0.16)"/>
  <rect x="122" y="505" width="635" height="36" fill="rgba(255,255,255,0.20)"/>
  <text x="96" y="112" fill="${palette[2]}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="4">HOUSELINK PROPERTY BLOG</text>
  <text x="96" y="210" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${variant === "hero" ? 72 : 60}" font-weight="800">
    ${titleLines(title).map((line, index) => `<tspan x="96" dy="${index === 0 ? 0 : variant === "hero" ? 82 : 68}">${escapeXml(line)}</tspan>`).join("")}
  </text>
  <text x="96" y="604" fill="${palette[2]}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700">Zimbabwe property advice</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .slice(0, 9)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Property Advice";
}

function titleLines(title: string) {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 24 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === 3) break;
  }
  if (current && lines.length < 4) lines.push(current);
  return lines.slice(0, 4);
}

function hash(value: string) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) >>> 0;
  }
  return total;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
