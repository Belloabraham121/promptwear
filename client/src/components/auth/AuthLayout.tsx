import Image from "next/image";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Kicker, TextLink } from "@/components/brand/ui";
import { cn } from "@/lib/utils";

const PANELS = {
  studio: {
    src: "/landing/v2/campaign-studio-mobile.jpg",
    alt: "Model in an oversized black tee with a lime graphic in a sunlit studio",
    lines: ["Create", "your way."],
  },
  street: {
    src: "/landing/v2/campaign-street-mobile.jpg",
    alt: "Three friends laughing on a Lagos street at golden hour in Driplab tees",
    lines: ["Discover", "your people."],
  },
  workshop: {
    src: "/landing/v2/process-02-make.jpg",
    alt: "Printer pulling lime ink across a screen in a Lagos print workshop",
    lines: ["Make it", "real."],
  },
} as const;

export type AuthPanel = keyof typeof PANELS;

/**
 * Split-screen shell for auth pages: campaign photo on one side (a short strip
 * on mobile), the form on bone on the other.
 */
export function AuthLayout({
  panel = "studio",
  headerLink = { href: "/dashboard", label: "Continue as guest" },
  children,
}: {
  panel?: AuthPanel;
  /** Link in the top-right corner; pass null to hide it. */
  headerLink?: { href: string; label: string } | null;
  children: React.ReactNode;
}) {
  const art = PANELS[panel];

  return (
    <div className="grid min-h-dvh bg-bone text-ink lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-sand lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start">
        <Image src={art.src} alt={art.alt} fill preload sizes="50vw" className="object-cover" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,8,7,0.78),rgba(7,8,7,0)_48%)]"
        />
        {/* Bone tags keep the masthead legible over light and dark photos alike. */}
        <div className="absolute inset-x-0 top-0 flex justify-between p-8 text-ink">
          <Kicker className="bg-bone px-2.5 py-1.5">Issue 01 — AW26</Kicker>
          <Kicker className="bg-bone px-2.5 py-1.5">Lagos, Nigeria</Kicker>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-8 text-bone xl:p-12">
          <p
            aria-hidden
            className="m-0 font-heading text-[clamp(3.2rem,6.4vw,6.5rem)] leading-[0.86] font-extrabold tracking-[-0.06em]"
          >
            {art.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          <Kicker className="mt-6 text-lime">Designed by the community · Made in Lagos</Kicker>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-[clamp(1.15rem,4vw,3rem)] py-5">
          <BrandLogo href="/" size="md" />
          {headerLink ? <TextLink href={headerLink.href}>{headerLink.label}</TextLink> : null}
        </header>

        <div aria-hidden className="relative h-36 overflow-hidden bg-sand sm:h-44 lg:hidden">
          <Image src={art.src} alt="" fill sizes="100vw" className="object-cover object-[50%_35%]" />
        </div>

        <main className="flex flex-1 items-center justify-center px-[clamp(1.15rem,4vw,3rem)] py-10 lg:py-12">
          <div className="w-full max-w-[27rem] motion-safe:animate-[nf-fade-up_0.7s_ease-out_both]">
            {children}
          </div>
        </main>

        <footer className="flex justify-between gap-4 border-t border-ink/10 px-[clamp(1.15rem,4vw,3rem)] py-4 text-[0.68rem] font-semibold tracking-[0.18em] text-mute uppercase">
          <span>© {new Date().getFullYear()} Driplab</span>
          <span>Made in Lagos</span>
        </footer>
      </div>
    </div>
  );
}

/** Kicker, display title and lead line that open every auth form. */
export function AuthHeading({
  kicker,
  index,
  title,
  lead,
}: {
  kicker: string;
  index?: string;
  title: string;
  lead?: React.ReactNode;
}) {
  return (
    <>
      <Kicker index={index} className="text-olive">
        {kicker}
      </Kicker>
      <h1 className="mt-5 mb-0 font-heading text-[clamp(2.4rem,6vw,3.4rem)] leading-[0.92] font-extrabold tracking-[-0.055em]">
        {title}
      </h1>
      {lead ? (
        <p className="mt-4 mb-0 max-w-[36ch] text-[0.95rem] leading-[1.55] text-mute">{lead}</p>
      ) : null}
    </>
  );
}

/** Flat status panel with a coloured edge: lime for success, red for errors. */
export function AuthNotice({
  tone = "success",
  children,
  className,
}: {
  tone?: "success" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "border-l-4 bg-paper px-5 py-4 text-[0.95rem] leading-[1.55]",
        tone === "success" && "border-lime",
        tone === "error" && "border-red-600 text-red-800",
        tone === "info" && "border-ink/20 text-mute",
        className,
      )}
    >
      {children}
    </div>
  );
}
