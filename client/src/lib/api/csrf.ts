import { ApiError } from "./errors";
import type { ApiEnvelope } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

let cachedToken: string | null = null;
let csrfFetchPromise: Promise<string> | null = null;

export function clearCsrfToken(): void {
  cachedToken = null;
  csrfFetchPromise = null;
}

export async function fetchCsrfToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  if (csrfFetchPromise) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = (async () => {
    const response = await fetch(`${API_BASE}/auth/csrf`, {
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

export function getApiBaseUrl(): string {
  return API_BASE;
}
