"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api/auth-client";
import { setAuthFailureHandler } from "@/lib/api/auth-events";
import { ApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type { SafeUser, UserRole } from "@/lib/api/types";
import { clearLocalUserData } from "@/lib/db/purge";
import { resetQueryCacheForUser } from "@/lib/query/session-cache";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface AuthContextValue {
  /** undefined while loading, null when unauthenticated. */
  session: SafeUser | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<SafeUser>;
  register: (input: RegisterInput) => Promise<SafeUser>;
  logout: () => Promise<void>;
  isLoggingIn: boolean;
  isRegistering: boolean;
  isLoggingOut: boolean;
}

/**
 * Better Auth session user as served at runtime (role/guest come from the
 * admin plugin + additionalFields). The client infers a narrower type, so we
 * map defensively instead of relying on generated types.
 */
interface BetterAuthSessionUser {
  id: string;
  email: string;
  name: string;
  role?: unknown;
  guest?: unknown;
  createdAt: string | Date;
  updatedAt: string | Date;
}

function toSafeUser(user: BetterAuthSessionUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (user.role === "admin" ? "admin" : "customer") as UserRole,
    guest: user.guest === true,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : String(user.createdAt),
    updatedAt:
      user.updatedAt instanceof Date
        ? user.updatedAt.toISOString()
        : String(user.updatedAt),
  };
}

function toApiError(error: unknown, fallback: string): ApiError {
  if (error && typeof error === "object") {
    const err = error as { message?: unknown; status?: unknown; code?: unknown };
    return new ApiError(
      typeof err.status === "number" ? err.status : 400,
      typeof err.code === "string" ? err.code : "AUTH_ERROR",
      typeof err.message === "string" && err.message
        ? err.message
        : fallback,
    );
  }
  return new ApiError(400, "AUTH_ERROR", fallback);
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: sessionData, isPending, refetch } = authClient.useSession();
  const session = isPending
    ? undefined
    : sessionData?.user
      ? toSafeUser(sessionData.user as unknown as BetterAuthSessionUser)
      : null;

  useEffect(() => {
    setAuthFailureHandler(() => {
      queryClient.clear();
      void clearLocalUserData();
    });
    return () => setAuthFailureHandler(null);
  }, [queryClient]);

  useEffect(() => {
    const userId = session?.id ?? null;
    if (
      prevUserIdRef.current !== null &&
      prevUserIdRef.current !== userId &&
      session
    ) {
      resetQueryCacheForUser(queryClient, session);
      void clearLocalUserData();
    }
    prevUserIdRef.current = userId;
  }, [queryClient, session]);

  const login = useCallback(
    async (input: LoginInput): Promise<SafeUser> => {
      setIsLoggingIn(true);
      try {
        const { data, error } = await authClient.signIn.email({
          email: input.email,
          password: input.password,
        });
        if (error || !data?.user) {
          throw toApiError(error, "Invalid email or password");
        }
        const user = toSafeUser(data.user as unknown as BetterAuthSessionUser);
        resetQueryCacheForUser(queryClient, user);
        void clearLocalUserData();
        await refetch();
        return user;
      } finally {
        setIsLoggingIn(false);
      }
    },
    [queryClient, refetch],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<SafeUser> => {
      setIsRegistering(true);
      try {
        const { data, error } = await authClient.signUp.email({
          name: input.name,
          email: input.email,
          password: input.password,
        });
        if (error || !data?.user) {
          throw toApiError(error, "Could not create your account");
        }
        const user = toSafeUser(data.user as unknown as BetterAuthSessionUser);
        resetQueryCacheForUser(queryClient, user);
        void clearLocalUserData();
        await refetch();
        return user;
      } finally {
        setIsRegistering(false);
      }
    },
    [queryClient, refetch],
  );

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
    } finally {
      queryClient.clear();
      void clearLocalUserData();
      setIsLoggingOut(false);
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      // undefined while the first session fetch is in flight; null when logged out.
      session,
      isLoading: isPending,
      isAuthenticated: session != null,
      login,
      register,
      logout,
      isLoggingIn,
      isRegistering,
      isLoggingOut,
    }),
    [
      session,
      isPending,
      login,
      register,
      logout,
      isLoggingIn,
      isRegistering,
      isLoggingOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
