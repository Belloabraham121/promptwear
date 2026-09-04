import { ApiError } from "./errors";
import type { ApiEnvelope } from "./types";

function normalizeApiBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");

  // HTTPS pages cannot call HTTP APIs (browser mixed-content block).
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http://")
  ) {
    url = `https://${url.slice("http://".length)}`;
  }

  // Nest serves under /api/v1 — tolerate a bare host in env.
  if (!/\/api\/v1$/i.test(url)) {
    url = `${url}/api/v1`;
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
  return normalizeApiBaseUrl(
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
  );
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
