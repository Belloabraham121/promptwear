"use client";

import { getDb } from "@/lib/db/client";

/** Remove user-scoped IndexedDB data on logout or account switch. */
export async function clearLocalUserData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["drafts", "orders"], "readwrite");
  await Promise.all([tx.objectStore("drafts").clear(), tx.objectStore("orders").clear()]);
  await tx.done;
}
