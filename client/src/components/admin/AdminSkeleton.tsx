import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[#0b1f1c]/8",
        className,
      )}
    />
  );
}

/** Full-page gate skeleton (auth / admin access). */
export function AdminGateSkeleton() {
  return (
    <div className="flex min-h-dvh bg-[#f3f0e8] text-[#0b1f1c]">
      <aside className="hidden w-60 shrink-0 border-r border-[#0b1f1c]/10 p-6 md:block">
        <Bone className="h-6 w-24" />
        <Bone className="mt-2 h-3 w-14" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="mt-auto pt-16">
          <Bone className="h-4 w-28" />
          <Bone className="mt-3 h-4 w-36" />
          <Bone className="mt-2 h-3 w-40" />
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-6 md:p-8">
        <Bone className="h-8 w-40" />
        <Bone className="mt-3 h-4 w-72 max-w-full" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** In-page admin content skeleton. */
export function AdminPageSkeleton({
  cards = 4,
  rows = 4,
}: {
  cards?: number;
  rows?: number;
}) {
  return (
    <div aria-busy="true" aria-label="Loading admin">
      <Bone className="h-9 w-48" />
      <Bone className="mt-3 h-4 w-80 max-w-full" />
      {cards > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            <Bone key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : null}
      <div className="mt-10 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Bone key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Compact sidebar user block skeleton. */
export function AdminUserSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading profile">
      <Bone className="h-4 w-32" />
      <Bone className="h-3 w-40" />
      <Bone className="h-3 w-16" />
    </div>
  );
}
