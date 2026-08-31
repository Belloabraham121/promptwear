import { api } from "@/lib/api/client";
import type { SafeUser } from "@/lib/api/types";

export type UpdateUserInput = {
  name?: string;
  email?: string;
};

export function updateMe(patch: UpdateUserInput) {
  return api.patch<SafeUser>("/users/me", patch);
}
