"use client";

import { useEffect } from "react";

import { DEFAULT_PRODUCTION_APP_URL } from "@/lib/branding";

const canonicalOrigin =
  process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_PRODUCTION_APP_URL;

const canonicalUrl = new URL(canonicalOrigin);

const legacyHosts = new Set([
  "ship365.co",
  "www.ship365.co",
  "dispatcher365-production.up.railway.app"
]);

export function CanonicalAppHostRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const { hostname, pathname, search, hash } = window.location;

    if (!legacyHosts.has(hostname) || hostname === canonicalUrl.hostname) {
      return;
    }

    const redirectUrl = `${canonicalUrl.origin}${pathname}${search}${hash}`;

    window.location.replace(redirectUrl);
  }, []);

  return null;
}
