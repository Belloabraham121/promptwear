import type { Metadata } from "next";
import { LandingV2 } from "@/components/landing-v2/LandingV2";

export const metadata: Metadata = {
  title: "Driplab — Wear what the community creates",
  description:
    "Discover designs from the Driplab community, remix them or create your own. Made to order in Lagos.",
  // Preview of the new homepage; drop this once it replaces V1 at "/".
  robots: { index: false, follow: false },
};

export default function LandingV2Page() {
  return <LandingV2 />;
}
