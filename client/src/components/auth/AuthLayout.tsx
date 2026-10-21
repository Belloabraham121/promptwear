import Image from "next/image";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Kicker, TextLink } from "@/components/brand/ui";

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
  headerLink?: { href: string; label: string };
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
        <div className="absolute inset-x-0 top-0 flex justify-between p-8 text-ink">
          <Kicker>Issue 01 — AW26</Kicker>
          <Kicker>Lagos, Nigeria</Kicker>
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
          <TextLink href={headerLink.href}>{headerLink.label}</TextLink>
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
