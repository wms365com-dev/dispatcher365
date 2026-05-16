import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { DEFAULT_PRODUCTION_APP_URL } from "@/lib/branding";

const CANONICAL_APP_HOST =
  process.env.CANONICAL_APP_HOST ??
  process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ??
  DEFAULT_PRODUCTION_APP_URL.replace(/^https?:\/\//, "");

const LEGACY_APP_HOSTS = new Set([
  "ship365.co",
  "www.ship365.co",
  "dispatcher365-production.up.railway.app"
]);

function getRequestHost(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host
  )
    .split(",")[0]
    ?.trim()
    .toLowerCase();
}

function shouldSkipCanonicalRedirect(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$/i.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const host = getRequestHost(request);

  if (!host || shouldSkipCanonicalRedirect(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (
    host === CANONICAL_APP_HOST.toLowerCase() ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1")
  ) {
    return NextResponse.next();
  }

  if (LEGACY_APP_HOSTS.has(host)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https";
    redirectUrl.host = CANONICAL_APP_HOST;
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*"
};
