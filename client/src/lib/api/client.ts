import { notifyAuthFailure } from "./auth-events";
import { clearCsrfToken, fetchCsrfToken, getApiBaseUrl } from "./csrf";
import { ApiError } from "./errors";
import type { ApiEnvelope } from "./types";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip 401 refresh retry (e.g. session bootstrap). */
  skipAuthRetry?: boolean;
  /** Skip redirect to /login on auth failure. */
  skipAuthRedirect?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

function isMutation(method: HttpMethod): boolean {
  return method !== "GET";
}

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const token = await fetchCsrfToken();
      const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": token,
        },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  if (path === "/login" || path === "/signup" || path === "/admin/login") return;

  if (path.startsWith("/dashboard/admin") || path.startsWith("/admin")) {
    window.location.assign("/admin/login");
    return;
  }

  window.location.assign("/login");
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    skipAuthRetry = false,
    skipAuthRedirect = false,
  } = options;

  const requestHeaders: Record<string, string> = { ...headers };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (isMutation(method)) {
    requestHeaders["X-CSRF-Token"] = await fetchCsrfToken();
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: "include",
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuthRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { ...options, skipAuthRetry: true });
    }

    clearCsrfToken();
    notifyAuthFailure();

    if (!skipAuthRedirect) {
      redirectToLogin();
    }

    throw await ApiError.fromResponse(response);
  }

  return parseEnvelope<T>(response);
}

export const api = {
  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "GET" });
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) {
    return request<T>(path, { ...options, method: "POST", body });
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) {
    return request<T>(path, { ...options, method: "PATCH", body });
  },

  put<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) {
    return request<T>(path, { ...options, method: "PUT", body });
  },

  delete<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return request<T>(path, { ...options, method: "DELETE" });
  },
};

export { clearCsrfToken };

function withQuery(
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  if (!query) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/** @deprecated Prefer `api.get`. */
export function apiGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
) {
  return api.get<T>(withQuery(path, query));
}

/** @deprecated Prefer `api.post` / `api.patch`. */
export function apiMutate<T>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  const options = headers ? { headers } : undefined;
  switch (method) {
    case "POST":
      return api.post<T>(path, body, options);
    case "PATCH":
      return api.patch<T>(path, body, options);
    case "PUT":
      return api.put<T>(path, body, options);
    case "DELETE":
      return api.delete<T>(path, options);
  }
}
