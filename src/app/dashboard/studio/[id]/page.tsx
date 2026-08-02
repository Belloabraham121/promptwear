"use client";

import { useParams } from "next/navigation";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { GhostLink, PageHeader } from "@/components/dashboard/ui";
import { StudioWorkspace } from "@/components/studio/StudioWorkspace";

export default function StudioCanvasPage() {
  const params = useParams<{ id: string }>();
  const { ready, designs } = useDashboard();
  const design = designs.find((d) => d.id === params.id);

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading canvas…</p>;
  }

  if (!design) {
    return (
      <div>
        <PageHeader title="Design not found" />
        <GhostLink href="/dashboard/studio">Back to studio</GhostLink>
      </div>
    );
  }

  return <StudioWorkspace design={design} />;
}
