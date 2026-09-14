"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  GhostLink,
  PageHeader,
  PrimaryLink,
} from "@/components/dashboard/ui";
import { ChatGarmentCard } from "@/components/dashboard/GarmentArt";

export default function DesignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, designs, removeDesign } = useDashboard();
  const design = designs.find((d) => d.id === params.id);

  if (!ready) {
    return <p className="text-sm text-[#52706a]">Loading design…</p>;
  }

  if (!design) {
    return (
      <div>
        <PageHeader title="Design not found" />
        <GhostLink href="/dashboard/designs">Back to designs</GhostLink>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={design.title}
        description="Saved from the studio. Order it with sizes, cloth quality and print method."
        action={
          <PrimaryLink href={`/dashboard/orders/new?design=${design.id}`}>
            Order this design
          </PrimaryLink>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <ChatGarmentCard
          title={design.title}
          text={design.prompt}
          method={design.method}
          messageCount={design.chat.length}
        />

        <div className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#0b1f1c]/12 bg-white p-4 shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
              <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-[#52706a]">
                Method
              </dt>
              <dd className="mt-2 capitalize">{design.method}</dd>
            </div>
            <div className="rounded-2xl border border-[#0b1f1c]/12 bg-white p-4 shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
              <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-[#52706a]">
                Colour
              </dt>
              <dd className="mt-2 flex items-center gap-2">
                <span
                  className="inline-block size-4 border border-[#0b1f1c]/30"
                  style={{ backgroundColor: design.color }}
                />
                {design.color}
              </dd>
            </div>
          </dl>

          <div className="rounded-2xl border border-[#0b1f1c]/12 bg-white p-4 shadow-[0_1px_2px_rgba(11,31,28,0.05)]">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#52706a]">
              Prompt / notes
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#0b1f1c]">
              {design.prompt || "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href={`/dashboard/studio/${design.id}`}
              className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3f4d0e] underline-offset-4 hover:underline"
            >
              Open in studio
            </Link>
            <Link
              href="/dashboard/studio"
              className="text-xs font-semibold uppercase tracking-[0.08em] text-[#52706a] underline-offset-4 hover:text-[#0b1f1c] hover:underline"
            >
              Studio hub
            </Link>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.08em] text-red-700 underline-offset-4 hover:underline"
              onClick={() => {
                void removeDesign(design.id).then(() =>
                  router.push("/dashboard/designs"),
                );
              }}
            >
              Delete design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
