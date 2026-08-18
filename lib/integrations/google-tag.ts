export type GoogleTagTestResult = {
  ok: boolean;
  message: string;
  sample?: string;
};

const GOOGLE_TAG_ID_PATTERN = /\b(?:G|GT|AW|DC)-[A-Z0-9-]+\b/i;
const NORMALISED_GOOGLE_TAG_ID_PATTERN = /^(?:G|GT|AW|DC)-[A-Z0-9-]+$/;

export function normaliseGoogleTagId(value?: string | null) {
  const input = String(value || "").trim();
  if (!input) return "";

  const decoded = input
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  const matchedId = decoded.match(GOOGLE_TAG_ID_PATTERN)?.[0] ?? decoded;
  const id = matchedId.trim().toUpperCase();

  return NORMALISED_GOOGLE_TAG_ID_PATTERN.test(id) ? id : "";
}

export async function testGoogleTagInstallation(analyticsId: string): Promise<GoogleTagTestResult> {
  const tagId = normaliseGoogleTagId(analyticsId);
  if (!tagId) {
    return {
      ok: false,
      message: "Enter a valid Google tag ID such as G-XXXXXXXXXX, GT-XXXXXXX, AW-XXXXXXXXX, or paste the Google tag snippet.",
    };
  }

  return {
    ok: true,
    message: "Google tag ID is valid. The public site loads it through the runtime marketing tag injector after settings are saved.",
    sample: tagId,
  };
}
