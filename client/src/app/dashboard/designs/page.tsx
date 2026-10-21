"use client";

import Link from "next/link";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  EmptyState,
  PageHeader,
  PrimaryLink,
} from "@/components/dashboard/ui";
import { ChatGarmentCard } from "@/components/dashboard/GarmentArt";
import { DesignsSkeleton } from "@/components/dashboard/Skeletons";

export default function DesignsPage() {
  const { ready, designs } = useDashboard();

  if (!ready) {
    return <DesignsSkeleton />;
  }

  return (
    <div>
      <PageHeader
        kicker="Your shelf"
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
          {designs.map((design) => (
            <Link
              key={design.id}
              href={`/dashboard/studio/${design.id}`}
              className="block transition hover:opacity-95"
            >
              <ChatGarmentCard
                title={design.title}
                text={design.prompt}
                method={design.method}
                messageCount={design.chat.length}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
