"use client";

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import type { SafeUser } from "@/lib/api/types";

/** Drop cached API data when the authenticated user changes. */
export function resetQueryCacheForUser(
  queryClient: QueryClient,
  user: SafeUser,
): void {
  queryClient.clear();
  queryClient.setQueryData(queryKeys.session(), user);
}
