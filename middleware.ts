import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "houselink_session";
const CSRF_HEADER = "x-houselink-csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = [
  /^\/api\/v1\/payments\/webhooks\/[^/]+$/,
  /^\/api\/v1\/payments\/callback\/[^/]+$/,
  /^\/api\/v1\/analytics\/pageviews$/,
];
const RATE_LIMITS = [
  { pattern: /^\/api\/v1\/auth\/session$/, limit: 20 },
  { pattern: /^\/api\/v1\/enquiries(?:\/.*)?$/, limit: 30 },
  { pattern: /^\/api\/v1\/listings\/[^/]+\/contact-intent$/, limit: 20 },
  { pattern: /^\/api\/v1\/uploads$/, limit: 20 },
  { pattern: /^\/api\/v1\/reports$/, limit: 10 },
  { pattern: /^\/api\/v1\/search\/ai$/, limit: 12 },
  { pattern: /^\/api\/v1\/payments\/checkout$/, limit: 20 },
  { pattern: /^\/api\/v1\/messages(?:\/.*)?$/, limit: 60 },
  { pattern: /^\/api\/v1\/analytics\/pageviews$/, limit: 240 },
  { pattern: /^\/api\/v1\/analytics\/events$/, limit: 120 },
  { pattern: /^\/api\/v1\/admin(?:\/.*)?$/, limit: 120 },
];

type Role = "ADMIN" | "AGENT" | "LANDLORD" | "CONSULTANT" | "TRAINER" | "LEARNER";

const ROLE_PERMISSIONS: Record<string, Role[]> = {
  "/api/v1/admin/academy": ["ADMIN", "TRAINER"],
  "/api/v1/admin/academy/coupons": ["ADMIN"],
  "/api/v1/academy/coupons/validate": ["AGENT", "LEARNER"],
  "/api/v1/academy/register": ["AGENT", "LEARNER"],
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const { pathname } = request.nextUrl;
  
  // Check role-based permissions for Academy routes
  const permissionCheck = checkRolePermissions(request, pathname);
  if (!permissionCheck.allowed) {
    return withRequestId(
      NextResponse.json(
        {
          error: { code: "FORBIDDEN", message: permissionCheck.message },
          meta: { requestId },
        },
        { status: 403 },
      ),
      requestId,
    );
  }
  
  const limited = checkRouteRateLimit(request, pathname);
  if (!limited.allowed) {
    return withRequestId(
      NextResponse.json(
        {
          error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." },
          meta: { requestId },
        },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 60) } },
      ),
      requestId,
    );
  }

  if (SAFE_METHODS.has(request.method)) return withRequestId(NextResponse.next(), requestId);

  if (CSRF_EXEMPT_PATHS.some((pattern) => pattern.test(pathname))) {
    return withRequestId(NextResponse.next(), requestId);
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "none") {
    return csrfProblem("CSRF_CROSS_SITE", "Cross-site state-changing requests are not allowed.", requestId);
  }

  if (!hasTrustedOrigin(request)) {
    return csrfProblem("CSRF_ORIGIN_MISMATCH", "State-changing requests must come from the HouseLink origin.", requestId);
  }

  if (request.cookies.has(SESSION_COOKIE) && request.headers.get(CSRF_HEADER) !== "1") {
    return csrfProblem("CSRF_HEADER_REQUIRED", "Missing CSRF confirmation header.", requestId);
  }

  return withRequestId(NextResponse.next(), requestId);
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
    ...(process.env.HOUSELINK_ALLOWED_ORIGINS?.split(",") ?? []),
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

function csrfProblem(code: string, message: string, requestId: string) {
  return withRequestId(NextResponse.json(
    {
      error: { code, message, requestId },
      meta: { requestId },
    },
    { status: 403 },
  ), requestId);
}

function checkRouteRateLimit(request: NextRequest, pathname: string) {
  const matched = RATE_LIMITS.find((entry) => entry.pattern.test(pathname));
  if (!matched) return { allowed: true };
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const key = `${matched.pattern.source}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true };
  }
  if (bucket.count >= matched.limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true };
}

function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set("X-Request-Id", requestId);
  return response;
}

function checkRolePermissions(request: NextRequest, pathname: string): { allowed: boolean; message?: string } {
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie) {
    return { allowed: true };
  }
  
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie.value));
    const userRoles: Role[] = session.roles || [];
    
    for (const [pattern, allowedRoles] of Object.entries(ROLE_PERMISSIONS)) {
      if (pathname.startsWith(pattern)) {
        const hasPermission = allowedRoles.some(role => userRoles.includes(role));
        if (!hasPermission) {
          return { allowed: false, message: `Requires one of: ${allowedRoles.join(", ")}` };
        }
      }
    }
  } catch {
    return { allowed: true };
  }
  
  return { allowed: true };
}
