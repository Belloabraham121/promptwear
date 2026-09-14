"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { PageHeader } from "@/components/dashboard/ui";
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
    return <p className="text-sm text-[#52706a]">Loading account…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Account"
        description="Profile details for quotes and delivery."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#52706a]">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#52706a]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border border-[#0b1f1c]/15 bg-white rounded-xl px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
          {error ? (
            <p className="text-xs text-red-700">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-[#d6ff3c] px-5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] hover:bg-[#e2ff6a] disabled:opacity-50"
          >
            {saveMutation.isPending
              ? "Saving…"
              : saved
                ? "Saved"
                : "Save profile"}
          </button>
        </form>

        <aside className="rounded-2xl border border-[#0b1f1c]/12 bg-white p-5 shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Snapshot
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-[#52706a]">
            <li>
              Account:{" "}
              <span className="text-[#0b1f1c]">
                {session?.guest ? "Guest" : "Registered"}
              </span>
            </li>
            <li>
              Role:{" "}
              <span className="text-[#0b1f1c]">
                {session?.role === "admin" ? "Admin" : "Customer"}
              </span>
            </li>
            <li>
              Designs saved:{" "}
              <span className="text-[#0b1f1c]">{designs.length}</span>
            </li>
            <li>
              Orders placed:{" "}
              <span className="text-[#0b1f1c]">{orders.length}</span>
            </li>
          </ul>
          <p className="mt-6 text-xs text-[#52706a]">
            Designs, orders, and assets are synced to your account.
          </p>
        </aside>
      </div>
    </div>
  );
}
