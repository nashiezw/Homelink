import { getCanonicalSiteUrl } from "@/lib/seo/site-url";

type MetaPixelTestResult = {
  ok: boolean;
  message: string;
  sample?: string;
};

function normaliseMetaPixelId(value: string) {
  return value.replace(/\D/g, "");
}

function scriptPattern(pixelId: string) {
  return new RegExp(`fbq\\(\\s*['"]init['"]\\s*,\\s*['"]${pixelId}['"]\\s*\\)`);
}

function getDirective(csp: string, directive: string) {
  const lowerDirective = directive.toLowerCase();
  return csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith(`${lowerDirective} `))
    ?.toLowerCase();
}

function directiveAllowsHost(csp: string, directive: string, host: string) {
  if (!csp.trim()) return true;
  const value = getDirective(csp, directive) ?? getDirective(csp, "default-src") ?? "";
  const normalisedHost = host.toLowerCase();
  const wildcardHost = normalisedHost.replace(/^https:\/\/[^.]+\./, "https://*.");
  const bareWildcard = wildcardHost.replace(/^https:\/\//, "*.");

  return (
    value.includes(normalisedHost)
    || value.includes(wildcardHost)
    || value.includes(bareWildcard)
    || value.includes("*")
  );
}

export async function testMetaPixelInstallation(
  metaPixelId: string,
  siteUrl = getCanonicalSiteUrl(),
): Promise<MetaPixelTestResult> {
  const pixelId = normaliseMetaPixelId(metaPixelId);

  if (!pixelId) {
    return { ok: false, message: "Add a Meta Pixel ID in Platform Settings > Integrations." };
  }

  if (!/^\d{6,32}$/.test(pixelId)) {
    return { ok: false, message: "Meta Pixel ID should be numeric and between 6 and 32 digits." };
  }

  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch {
    return { ok: false, message: "The configured public website URL is invalid." };
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        "User-Agent": "HouseLink-Admin-MetaPixel-Test/1.0",
      },
    });
    const html = await response.text();
    const csp = response.headers.get("content-security-policy") ?? "";

    if (!response.ok) {
      return {
        ok: false,
        message: `Public website returned HTTP ${response.status}; Meta cannot detect the pixel until the page loads successfully.`,
        sample: url.origin,
      };
    }

    const cspProblems = [
      directiveAllowsHost(csp, "script-src", "https://connect.facebook.net")
        ? ""
        : "script-src must allow https://connect.facebook.net",
      directiveAllowsHost(csp, "img-src", "https://www.facebook.com")
        ? ""
        : "img-src must allow https://www.facebook.com",
      directiveAllowsHost(csp, "connect-src", "https://www.facebook.com")
        ? ""
        : "connect-src must allow https://www.facebook.com",
    ].filter(Boolean);

    if (cspProblems.length) {
      return {
        ok: false,
        message: `The live Content-Security-Policy blocks Meta Pixel from running: ${cspProblems.join("; ")}.`,
        sample: url.origin,
      };
    }

    const headEnd = html.toLowerCase().indexOf("</head>");
    const markerIndex = html.indexOf("houselink-meta-pixel");
    const loaderIndex = html.indexOf("connect.facebook.net/en_US/fbevents.js");
    const initIndex = html.search(scriptPattern(pixelId));
    const noScriptIndex = html.indexOf(`facebook.com/tr?id=${pixelId}`);

    if (markerIndex === -1 || loaderIndex === -1 || initIndex === -1) {
      return {
        ok: false,
        message: `Meta Pixel ID ${pixelId} is saved, but the public homepage HTML does not contain the full pixel script yet. Save settings and wait for the latest deployment/cache to refresh.`,
        sample: url.origin,
      };
    }

    if (headEnd === -1 || markerIndex > headEnd || loaderIndex > headEnd || initIndex > headEnd) {
      return {
        ok: false,
        message: "Meta Pixel script exists, but it is not in the document head. Deploy the latest build so Meta's setup tool can detect it reliably.",
        sample: url.origin,
      };
    }

    if (noScriptIndex === -1) {
      return {
        ok: false,
        message: "Meta Pixel script is installed, but the noscript fallback image is missing.",
        sample: url.origin,
      };
    }

    return {
      ok: true,
      message: `Meta Pixel ${pixelId} is installed on ${url.origin}, loaded from connect.facebook.net, and rendered in the document head.`,
      sample: "Use Meta Events Manager > Test Events to confirm receipt of the browser test event.",
    };
  } catch (error) {
    return {
      ok: false,
      message: `Meta Pixel test failed while checking the public website: ${error instanceof Error ? error.message : "Network error"}`,
      sample: url.origin,
    };
  }
}
