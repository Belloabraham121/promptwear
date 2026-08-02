"use client";

import { FormEvent, useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { PageHeader } from "@/components/dashboard/ui";

export default function AccountPage() {
  const { ready, user, setUser, designs, orders } = useDashboard();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setName(user.name);
    setEmail(user.email);
  }, [ready, user.name, user.email]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    await setUser({
      name: name.trim() || "Creator",
      email: email.trim() || "hello@promptwear.ng",
      guest: false,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading account…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Account"
        description="Profile details for quotes and delivery. Auth provider wiring comes next."
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
          <button
            type="submit"
            className="bg-[#d6ff3c] px-5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] hover:bg-[#e2ff6a]"
          >
            {saved ? "Saved" : "Save profile"}
          </button>
        </form>

        <aside className="border border-[#f3f0e8]/12 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            Snapshot
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-[#c8c4b8]">
            <li>
              Mode:{" "}
              <span className="text-[#f3f0e8]">
                {user.guest ? "Guest session" : "Named account"}
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
            Profile, designs, orders, and image blobs live in IndexedDB
            (index.db) on this device.
          </p>
        </aside>
      </div>
    </div>
  );
}
