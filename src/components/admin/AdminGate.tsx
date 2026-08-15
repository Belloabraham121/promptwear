"use client";

import { FormEvent, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { PageHeader } from "@/components/dashboard/ui";

const ADMIN_UNLOCK_CODE = "promptwear-admin";

/**
 * Local demo gate — no real auth.
 * Unlock via Account role toggle, or enter the unlock code here.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { ready, user, setUser } = useDashboard();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading admin…</p>;
  }

  if (user.role === "admin") {
    return <>{children}</>;
  }

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (code.trim().toLowerCase() !== ADMIN_UNLOCK_CODE) {
      setError(true);
      return;
    }
    setError(false);
    await setUser({
      ...user,
      role: "admin",
      guest: false,
      name: user.name || "Admin",
    });
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Admin access"
        description="Demo gate only — enter the unlock code or enable admin on Account."
      />
      <form onSubmit={unlock} className="space-y-4 border border-[#f3f0e8]/12 p-5">
        <label className="block">
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
            Unlock code
          </span>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(false);
            }}
            placeholder="promptwear-admin"
            className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
            autoComplete="off"
          />
        </label>
        {error ? (
          <p className="text-xs text-red-300">Wrong code. Try promptwear-admin.</p>
        ) : (
          <p className="text-xs text-[#c8c4b8]">
            Code: <span className="text-[#f3f0e8]">promptwear-admin</span>
            {" · "}
            Or open Account → Enable admin mode.
          </p>
        )}
        <button
          type="submit"
          className="bg-[#d6ff3c] px-5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] hover:bg-[#e2ff6a]"
        >
          Enter admin
        </button>
      </form>
    </div>
  );
}
