import { ApiError } from "./errors";
import type { ApiEnvelope } from "./types";

/**
 * Resolves the API base used by the browser.
 *
 * - Local: absolute `http://localhost:3001/api/v1`
 * - Vercel + HTTP Coolify: relative `/api/v1` (proxied by next.config rewrites)
 *
 * Never point NEXT_PUBLIC_API_URL at an `http://` host from an HTTPS page —
 * the browser will block it. Use `/api/v1` + API_PROXY_TARGET instead.
 */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");

  // Unset: HTTPS deploy → same-origin proxy; local → Nest on 3001.
  if (!trimmed) {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      return "/api/v1";
    }
    return "http://localhost:3001/api/v1";
  }

  // Same-origin proxy path (recommended for HTTPS frontend + HTTP API).
  if (trimmed.startsWith("/")) {
    return /\/api\/v1$/i.test(trimmed) ? trimmed : `${trimmed}/api/v1`;
  }

  // Absolute URL (local dev, or HTTPS API).
  let url = trimmed;
  if (!/\/api\/v1$/i.test(url)) {
    url = `${url}/api/v1`;
  }

  // If someone still set http:// on an HTTPS page, fall back to same-origin proxy
  // so auth does not get mixed-content blocked against an HTTP Coolify host.
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http://")
  ) {
    return "/api/v1";
  }

  return url;
}

let cachedToken: string | null = null;
let csrfFetchPromise: Promise<string> | null = null;

export function clearCsrfToken(): void {
  cachedToken = null;
  csrfFetchPromise = null;
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

export async function fetchCsrfToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  if (csrfFetchPromise) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = (async () => {
    const response = await fetch(`${getApiBaseUrl()}/auth/csrf`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    const body = (await response.json()) as ApiEnvelope<{ token: string }>;
    cachedToken = body.data.token;
    return cachedToken;
  })();

  try {
    return await csrfFetchPromise;
  } finally {
    csrfFetchPromise = null;
  }
}
