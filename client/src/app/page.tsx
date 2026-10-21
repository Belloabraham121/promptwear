import type { Metadata } from "next";
import { LandingV2 } from "@/components/landing-v2/LandingV2";

export const metadata: Metadata = {
  title: "Driplab — Wear what the community creates",
  description:
    "Discover designs from the Driplab community, remix them or create your own. Made to order in Lagos.",
};

export default function Home() {
  return <LandingV2 />;
}
