"use client";

import Link from "next/link";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  DesignSwatch,
  EmptyState,
  PageHeader,
  PrimaryLink,
} from "@/components/dashboard/ui";

export default function DesignsPage() {
  const { ready, designs } = useDashboard();

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading designs…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Designs"
        description="Everything you create in the studio lands here. Open a piece to order it."
        action={<PrimaryLink href="/dashboard/studio">New design</PrimaryLink>}
      />

      {designs.length === 0 ? (
        <EmptyState
          title="No designs saved"
          body="Prompt it, draw it, or mix both — then save. Your tee will show up on this shelf."
          action={<PrimaryLink href="/dashboard/studio">Open studio</PrimaryLink>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
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
                  {design.method}
                </p>
                <p className="line-clamp-2 text-sm text-[#c8c4b8]">
                  {design.prompt || "No prompt saved"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
