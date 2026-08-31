import { api } from "./client";
import { ApiError } from "./errors";
import type { SafeUser } from "./types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export async function getSession(): Promise<SafeUser | null> {
  try {
    return await api.get<SafeUser>("/auth/session", {
      skipAuthRetry: true,
      skipAuthRedirect: true,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function login(input: LoginInput): Promise<SafeUser> {
  return api.post<SafeUser>("/auth/login", input);
}

export function register(input: RegisterInput): Promise<SafeUser> {
  return api.post<SafeUser>("/auth/register", input);
}

export function logout(): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>("/auth/logout");
}

export function refreshSession(): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>("/auth/refresh", undefined, {
    skipAuthRetry: true,
    skipAuthRedirect: true,
  });
}
