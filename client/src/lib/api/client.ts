import { notifyAuthFailure } from "./auth-events";
import { getApiBaseUrl } from "./csrf";
import { ApiError } from "./errors";
import type { ApiEnvelope } from "./types";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip redirect to /login on auth failure. */
  skipAuthRedirect?: boolean;
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
    skipAuthRedirect = false,
  } = options;

  const requestHeaders: Record<string, string> = { ...headers };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  // No X-CSRF-Token: Better Auth relies on Origin verification instead
  // (backend OriginGuard). No manual refresh endpoint either — the Better Auth
  // session cookie slides automatically; an expired session is a plain 401.
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: "include",
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuthRedirect) {
    notifyAuthFailure();
    redirectToLogin();
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
