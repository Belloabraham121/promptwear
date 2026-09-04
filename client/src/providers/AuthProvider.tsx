"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  getSession,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type LoginInput,
  type RegisterInput,
} from "@/lib/api/auth";
import { setAuthFailureHandler } from "@/lib/api/auth-events";
import { clearCsrfToken } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { SafeUser } from "@/lib/api/types";
import { clearLocalUserData } from "@/lib/db/purge";
import { resetQueryCacheForUser } from "@/lib/query/session-cache";

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

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null>(null);

  const sessionQuery = useQuery({
    queryKey: queryKeys.session(),
    queryFn: getSession,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    setAuthFailureHandler(() => {
      clearCsrfToken();
      queryClient.clear();
      void clearLocalUserData();
    });
    return () => setAuthFailureHandler(null);
  }, [queryClient]);

  useEffect(() => {
    const userId = sessionQuery.data?.id ?? null;
    if (
      prevUserIdRef.current !== null &&
      prevUserIdRef.current !== userId &&
      sessionQuery.data
    ) {
      resetQueryCacheForUser(queryClient, sessionQuery.data);
      void clearLocalUserData();
    }
    prevUserIdRef.current = userId;
  }, [queryClient, sessionQuery.data]);

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      clearCsrfToken();
      resetQueryCacheForUser(queryClient, user);
      void clearLocalUserData();
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (user) => {
      clearCsrfToken();
      resetQueryCacheForUser(queryClient, user);
      void clearLocalUserData();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      clearCsrfToken();
      queryClient.clear();
      void clearLocalUserData();
    },
  });

  const login = useCallback(
    (input: LoginInput) => loginMutation.mutateAsync(input),
    [loginMutation],
  );

  const register = useCallback(
    (input: RegisterInput) => registerMutation.mutateAsync(input),
    [registerMutation],
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      clearCsrfToken();
      queryClient.clear();
      void clearLocalUserData();
    }
  }, [logoutMutation, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      // undefined while the first session fetch is in flight; null when logged out.
      session: sessionQuery.isPending
        ? undefined
        : (sessionQuery.data ?? null),
      isLoading: sessionQuery.isPending,
      isAuthenticated: sessionQuery.data != null,
      login,
      register,
      logout,
      isLoggingIn: loginMutation.isPending,
      isRegistering: registerMutation.isPending,
      isLoggingOut: logoutMutation.isPending,
    }),
    [
      sessionQuery.data,
      sessionQuery.isPending,
      login,
      register,
      logout,
      loginMutation.isPending,
      registerMutation.isPending,
      logoutMutation.isPending,
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
