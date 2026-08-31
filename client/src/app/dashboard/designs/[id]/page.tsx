"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  DesignSwatch,
  GhostLink,
  PageHeader,
  PrimaryLink,
} from "@/components/dashboard/ui";

export default function DesignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, designs, removeDesign } = useDashboard();
  const design = designs.find((d) => d.id === params.id);

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading design…</p>;
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
        <DesignSwatch color={design.color} title={design.title} />

        <div className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="border border-[#f3f0e8]/12 p-4">
              <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                Method
              </dt>
              <dd className="mt-2 capitalize">{design.method}</dd>
            </div>
            <div className="border border-[#f3f0e8]/12 p-4">
              <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                Colour
              </dt>
              <dd className="mt-2 flex items-center gap-2">
                <span
                  className="inline-block size-4 border border-[#f3f0e8]/30"
                  style={{ backgroundColor: design.color }}
                />
                {design.color}
              </dd>
            </div>
          </dl>

          <div className="border border-[#f3f0e8]/12 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Prompt / notes
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#f3f0e8]">
              {design.prompt || "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href={`/dashboard/studio/${design.id}`}
              className="text-xs font-semibold uppercase tracking-[0.08em] text-[#d6ff3c] underline-offset-4 hover:underline"
            >
              Open in studio
            </Link>
            <Link
              href="/dashboard/studio"
              className="text-xs font-semibold uppercase tracking-[0.08em] text-[#c8c4b8] underline-offset-4 hover:text-[#f3f0e8] hover:underline"
            >
              Studio hub
            </Link>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.08em] text-red-300 underline-offset-4 hover:underline"
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
