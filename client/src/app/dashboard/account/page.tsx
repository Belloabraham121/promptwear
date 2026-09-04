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
    return <p className="text-sm text-[#c8c4b8]">Loading account…</p>;
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
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
          {error ? (
            <p className="text-xs text-red-400">{error}</p>
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

        <aside className="border border-[#f3f0e8]/12 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Snapshot
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-[#c8c4b8]">
            <li>
              Account:{" "}
              <span className="text-[#f3f0e8]">
                {session?.guest ? "Guest" : "Registered"}
              </span>
            </li>
            <li>
              Role:{" "}
              <span className="text-[#f3f0e8]">
                {session?.role === "admin" ? "Admin" : "Customer"}
              </span>
            </li>
            <li>
              Designs saved:{" "}
              <span className="text-[#f3f0e8]">{designs.length}</span>
            </li>
            <li>
              Orders placed:{" "}
              <span className="text-[#f3f0e8]">{orders.length}</span>
            </li>
          </ul>
          <p className="mt-6 text-xs text-[#c8c4b8]">
            Designs, orders, and assets are synced to your account.
          </p>
        </aside>
      </div>
    </div>
  );
}
