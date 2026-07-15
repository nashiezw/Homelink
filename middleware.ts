import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "homelink_session";
const CSRF_HEADER = "x-homelink-csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = [
  /^\/api\/v1\/payments\/webhooks\/[^/]+$/,
  /^\/api\/v1\/payments\/callback\/[^/]+$/,
];

export function middleware(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (CSRF_EXEMPT_PATHS.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "none") {
    return csrfProblem("CSRF_CROSS_SITE", "Cross-site state-changing requests are not allowed.");
  }

  if (!hasTrustedOrigin(request)) {
    return csrfProblem("CSRF_ORIGIN_MISMATCH", "State-changing requests must come from the HomeLink origin.");
  }

  if (request.cookies.has(SESSION_COOKIE) && request.headers.get(CSRF_HEADER) !== "1") {
    return csrfProblem("CSRF_HEADER_REQUIRED", "Missing CSRF confirmation header.");
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/v1/:path*",
};

function hasTrustedOrigin(request: NextRequest) {
  const candidates = [
    request.headers.get("origin"),
    request.headers.get("referer"),
  ].filter((value): value is string => Boolean(value));

  if (!candidates.length) return true;

  const allowed = new Set([
    request.nextUrl.origin,
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.HOMELINK_ALLOWED_ORIGINS?.split(",") ?? []),
  ].filter((value): value is string => Boolean(value)).map(originOf));

  return candidates.every((candidate) => allowed.has(originOf(candidate)));
}

function originOf(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function csrfProblem(code: string, message: string) {
  return NextResponse.json(
    {
      error: { code, message },
      meta: { requestId: crypto.randomUUID() },
    },
    { status: 403 },
  );
}
