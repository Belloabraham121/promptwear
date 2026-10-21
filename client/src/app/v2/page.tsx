import { permanentRedirect } from "next/navigation";

// The V2 landing page now lives at "/". Keep old /v2 links working.
export default function LandingV2Page() {
  permanentRedirect("/");
}
