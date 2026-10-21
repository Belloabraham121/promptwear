import { cn } from "@/lib/utils";

/**
 * Skeleton loaders shaped like the real dashboard screens, so content
 * settles in place instead of jumping in after a "Loading…" line.
 */

/** One placeholder block. Square, ink-tinted, pulses unless motion is reduced. */
export function Bone({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse bg-ink/8 motion-reduce:animate-none", className)}
    />
  );
}

/** Announces loading to assistive tech while the bones stay silent. */
function Busy({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-6">
      <div className="w-full max-w-xl">
        <Bone className="h-3 w-24" />
        <Bone className="mt-5 h-12 w-3/4 max-w-[22rem] md:h-14" />
        <Bone className="mt-5 h-4 w-full" />
        <Bone className="mt-2 h-4 w-2/3" />
      </div>
      {action ? <Bone className="h-10 w-36" /> : null}
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-ink/12 bg-ink/12 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-paper p-5">
          <Bone className="h-3 w-20" />
          <Bone className="mt-5 h-10 w-14" />
          <Bone className="mt-4 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function SectionHeadingSkeleton() {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-ink/12 pb-4">
      <Bone className="h-6 w-48" />
      <Bone className="h-3 w-16" />
    </div>
  );
}

export function DesignCardSkeleton() {
  return (
    <div>
      <Bone className="aspect-[4/5] w-full bg-sand" />
      <Bone className="mt-3 h-5 w-2/3" />
      <div className="mt-2 flex justify-between gap-3">
        <Bone className="h-3 w-14" />
        <Bone className="h-3 w-16" />
      </div>
    </div>
  );
}

export function DesignGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <DesignCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ink/10 border border-ink/12 bg-paper">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="w-full max-w-xs">
            <Bone className="h-4 w-3/4" />
            <Bone className="mt-2 h-3 w-1/2" />
          </div>
          <Bone className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

function PanelSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("border border-ink/12 bg-paper p-5", className)}>
      <Bone className="h-5 w-32" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex justify-between gap-4">
            <Bone className="h-3 w-24" />
            <Bone className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div>
      <Bone className="h-3 w-16" />
      <Bone className="mt-2 h-12 w-full" />
    </div>
  );
}

/* ——— Page skeletons ——— */

export function OverviewSkeleton() {
  return (
    <Busy label="Loading your studio">
      <PageHeaderSkeleton />
      <StatGridSkeleton />
      <section className="mt-14">
        <SectionHeadingSkeleton />
        <DesignGridSkeleton count={3} />
      </section>
      <section className="mt-14">
        <SectionHeadingSkeleton />
        <RowListSkeleton rows={3} />
      </section>
    </Busy>
  );
}

export function DesignsSkeleton() {
  return (
    <Busy label="Loading designs">
      <PageHeaderSkeleton />
      <DesignGridSkeleton count={8} className="xl:grid-cols-4" />
    </Busy>
  );
}

export function DesignDetailSkeleton() {
  return (
    <Busy label="Loading design">
      <PageHeaderSkeleton />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Bone className="aspect-[4/5] w-full bg-sand" />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <PanelSkeleton lines={1} />
            <PanelSkeleton lines={1} />
          </div>
          <PanelSkeleton lines={3} />
          <div className="flex gap-4">
            <Bone className="h-10 w-36" />
            <Bone className="h-10 w-28" />
          </div>
        </div>
      </div>
    </Busy>
  );
}

export function OrdersSkeleton() {
  return (
    <Busy label="Loading orders">
      <PageHeaderSkeleton />
      <RowListSkeleton rows={5} />
    </Busy>
  );
}

export function OrderDetailSkeleton() {
  return (
    <Busy label="Loading order">
      <PageHeaderSkeleton />
      <div className="mb-8 border border-ink/12 bg-paper p-5">
        <Bone className="h-5 w-40" />
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton lines={4} />
        <PanelSkeleton lines={3} />
      </div>
    </Busy>
  );
}

export function CheckoutSkeleton() {
  return (
    <Busy label="Loading checkout">
      <PageHeaderSkeleton action={false} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div className="space-y-6">
          <FieldSkeleton />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Bone key={i} className="h-16 w-full" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Bone key={i} className="h-11 w-full" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </div>
        <PanelSkeleton lines={3} className="h-fit" />
      </div>
    </Busy>
  );
}

export function AccountSkeleton() {
  return (
    <Busy label="Loading account">
      <PageHeaderSkeleton action={false} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <div className="space-y-5">
          <FieldSkeleton />
          <FieldSkeleton />
          <Bone className="h-10 w-32" />
        </div>
        <PanelSkeleton lines={4} className="h-fit" />
      </div>
    </Busy>
  );
}

export function TeamSkeleton() {
  return (
    <Busy label="Loading workspaces">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="space-y-6">
          <PanelSkeleton lines={2} />
          <PanelSkeleton lines={1} />
        </div>
        <div className="space-y-6">
          <PanelSkeleton lines={3} />
          <PanelSkeleton lines={1} />
        </div>
      </div>
    </Busy>
  );
}

/** Small inline list placeholder, e.g. members while a workspace loads. */
export function InlineListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Busy label="Loading" className="mt-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="w-1/2">
            <Bone className="h-3.5 w-3/4" />
            <Bone className="mt-1.5 h-3 w-1/2" />
          </div>
          <Bone className="h-6 w-16" />
        </div>
      ))}
    </Busy>
  );
}

/** Full app chrome (sidebar + overview) while the session is checked. */
export function DashboardShellSkeleton({ navItems = 6 }: { navItems?: number }) {
  return (
    <div className="flex min-h-dvh bg-bone text-ink">
      <aside className="hidden h-dvh w-[16.5rem] shrink-0 flex-col border-r border-ink/12 bg-paper md:flex">
        <div className="px-5 pt-5">
          <Bone className="h-6 w-24" />
          <Bone className="mt-4 h-3 w-28" />
        </div>
        <div className="mt-8 border-t border-ink/12">
          {Array.from({ length: navItems }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-ink/12 px-5 py-4">
              <Bone className="h-3 w-4" />
              <Bone className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 border-t border-ink/12 p-5">
          <Bone className="size-10" />
          <div className="flex-1">
            <Bone className="h-3.5 w-24" />
            <Bone className="mt-1.5 h-3 w-32" />
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-ink/12 px-4 py-4 md:px-6 lg:px-10">
          <Bone className="h-3 w-40" />
          <Bone className="h-9 w-32" />
        </div>
        <div className="px-4 py-8 md:px-6 md:py-10 lg:px-10">
          <OverviewSkeleton />
        </div>
      </div>
    </div>
  );
}
