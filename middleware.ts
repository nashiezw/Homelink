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

  try {
    const configUrl = new URL("/api/v1/platform/config", request.url);
    const response = await fetch(configUrl, { cache: "no-store" });
    if (!response.ok) return NextResponse.next();
    const json = (await response.json()) as { data?: { maintenanceMode?: boolean } };
    if (json.data?.maintenanceMode) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
