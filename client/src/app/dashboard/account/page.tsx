"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { PageHeader } from "@/components/dashboard/ui";
import { AccountSkeleton } from "@/components/dashboard/Skeletons";
import { queryKeys } from "@/lib/api/query-keys";
import { updateMe } from "@/lib/api/users";
import { useAuth } from "@/providers/AuthProvider";

export default function AccountPage() {
  const { ready, user, designs, orders } = useDashboard();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    setName(user.name);
    setEmail(user.email);
  }, [ready, user.name, user.email]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateMe({
        name: name.trim() || "Creator",
        email: email.trim(),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.session(), updated);
      setSaved(true);
      setError(null);
      window.setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      setError("Could not save profile. Check your details and try again.");
    },
  });

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    await saveMutation.mutateAsync();
  }

  if (!ready) {
    return <AccountSkeleton />;
  }

  return (
    <div>
      <PageHeader
        kicker="Profile"
        title="Account"
        description="Profile details for quotes and delivery."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-mute">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full border border-ink/15 bg-paper px-3 py-3 text-sm outline-none focus:border-lime"
            />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-mute">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border border-ink/15 bg-paper px-3 py-3 text-sm outline-none focus:border-lime"
            />
          </label>
          {error ? (
            <p className="text-xs text-red-700">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-lime px-5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-ink hover:bg-lime/80 disabled:opacity-50"
          >
            {saveMutation.isPending
              ? "Saving…"
              : saved
                ? "Saved"
                : "Save profile"}
          </button>
        </form>

        <aside className="border border-ink/12 bg-paper p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Snapshot
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-mute">
            <li>
              Account:{" "}
              <span className="text-ink">
                {session?.guest ? "Guest" : "Registered"}
              </span>
            </li>
            <li>
              Role:{" "}
              <span className="text-ink">
                {session?.role === "admin" ? "Admin" : "Customer"}
              </span>
            </li>
            <li>
              Designs saved:{" "}
              <span className="text-ink">{designs.length}</span>
            </li>
            <li>
              Orders placed:{" "}
              <span className="text-ink">{orders.length}</span>
            </li>
          </ul>
          <p className="mt-6 text-xs text-mute">
            Designs, orders, and assets are synced to your account.
          </p>
        </aside>
      </div>
    </div>
  );
}
