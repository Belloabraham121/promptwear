"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { DesignSwatch, EmptyState, PageHeader } from "@/components/dashboard/ui";
import type { DesignStatus } from "@/lib/dashboard/types";
import { DESIGN_STATUS_LABELS } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const TABS: { id: DesignStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "saved", label: "Designs" },
  { id: "ordered", label: "Ordered" },
];

export default function StudioHubPage() {
  const router = useRouter();
  const { ready, designs, addDesign } = useDashboard();
  const [tab, setTab] = useState<DesignStatus | "all">("all");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (tab === "all") return designs;
    return designs.filter((d) => d.status === tab);
  }, [designs, tab]);

  async function createNew() {
    setCreating(true);
    try {
      const design = await addDesign({
        title: "Untitled design",
        method: "draw",
        color: "#1a1e19",
      });
      router.push(`/dashboard/studio/${design.id}`);
    } finally {
      setCreating(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading studio…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Studio"
        description="Drafts, finished designs, and ordered pieces — all saved in your browser (IndexedDB), including images."
        action={
          <button
            type="button"
            disabled={creating}
            onClick={() => void createNew()}
            className="bg-[#d6ff3c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] transition hover:bg-[#e2ff6a] disabled:opacity-50"
          >
            {creating ? "Opening…" : "New design"}
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.12em] transition",
              tab === t.id
                ? "bg-[#d6ff3c] font-semibold text-[#070807]"
                : "border border-[#f3f0e8]/15 text-[#c8c4b8] hover:border-[#f3f0e8]/35",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === "all" ? "No designs yet" : `No ${tab} pieces`}
          body="Start a new design — paint on the pattern, drop images, and chat a brief. Everything lands in index.db."
          action={
            <button
              type="button"
              onClick={() => void createNew()}
              className="bg-[#d6ff3c] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[#070807]"
            >
              New design
            </button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((design) => (
            <Link
              key={design.id}
              href={`/dashboard/studio/${design.id}`}
              className="block border border-[#f3f0e8]/10 bg-[#0c0e0c] transition hover:border-[#d6ff3c]/40"
            >
              <DesignSwatch
                color={design.color}
                title={design.title}
                className="border-0"
              />
              <div className="space-y-1 p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#d6ff3c]">
                  {DESIGN_STATUS_LABELS[design.status]} · {design.method}
                </p>
                <p className="line-clamp-2 text-sm text-[#c8c4b8]">
                  {design.prompt || "Open to draw, upload, or prompt"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
