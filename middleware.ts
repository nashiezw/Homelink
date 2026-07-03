import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BYPASS_PREFIXES = [
  "/maintenance",
  "/dashboard/admin",
  "/api/v1/admin",
  "/api/v1/platform",
  "/api/v1/auth",
  "/_next",
  "/icon",
  "/favicon",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (process.env.HOMELINK_MAINTENANCE_MODE === "true") {
    return NextResponse.rewrite(new URL("/maintenance", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
