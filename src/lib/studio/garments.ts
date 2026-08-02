import type { PatternPanel } from "@/lib/dashboard/types";
import type { UvRect } from "@/lib/studio/atlas";

export type StudioGarmentId = "classic" | "oversized";

export type StudioGarment = {
  id: StudioGarmentId;
  label: string;
  hint: string;
  modelPath: string;
  normalPath?: string;
  /** True when front/back/sleeves/collar have distinct UV islands */
  fullPanelSupport: boolean;
  panelUV: Record<PatternPanel, UvRect>;
};

/** Classic low-poly tee — best for per-panel editing */
const CLASSIC_UV: Record<PatternPanel, UvRect> = {
  front: { u0: 0.5117, v0: 0.4677, u1: 0.9378, v1: 0.923 },
  back: { u0: 0.0367, v0: 0.4666, u1: 0.4605, v1: 0.9535 },
  sleeveL: { u0: 0.4821, v0: 0.036, u1: 0.6517, v1: 0.4256 },
  sleeveR: { u0: 0.6548, v0: 0.0363, u1: 0.8997, v1: 0.3551 },
  collar: { u0: 0.0284, v0: 0.1936, u1: 0.4098, v1: 0.4319 },
};

/**
 * CLO Male oversized — collar (Ribana) is separate; body front/back share
 * the same jersey UV space (not unified pattern packing).
 */
const OVERSIZED_BODY: UvRect = {
  u0: 0.0894,
  v0: 0.028,
  u1: 0.9001,
  v1: 0.5102,
};
const OVERSIZED_COLLAR: UvRect = {
  u0: 0.0932,
  v0: 0.4044,
  u1: 0.3792,
  v1: 0.4466,
};

export const STUDIO_GARMENTS: Record<StudioGarmentId, StudioGarment> = {
  classic: {
    id: "classic",
    label: "Classic",
    hint: "Full panel UVs — front, back, sleeves, collar",
    modelPath: "/models/studio/tshirt.glb?v=2",
    normalPath: "/models/studio/textures/normal.png",
    fullPanelSupport: true,
    panelUV: CLASSIC_UV,
  },
  oversized: {
    id: "oversized",
    label: "Oversized",
    hint: "CLO fit — collar separate; body panels share UV",
    modelPath: "/models/studio/oversized/tshirt.glb?v=1",
    normalPath: "/models/studio/oversized/normal.jpg",
    fullPanelSupport: false,
    panelUV: {
      front: OVERSIZED_BODY,
      back: OVERSIZED_BODY,
      sleeveL: OVERSIZED_BODY,
      sleeveR: OVERSIZED_BODY,
      collar: OVERSIZED_COLLAR,
    },
  },
};

export const STUDIO_GARMENT_LIST = Object.values(STUDIO_GARMENTS);

export function getStudioGarment(id?: string | null): StudioGarment {
  if (id && id in STUDIO_GARMENTS) {
    return STUDIO_GARMENTS[id as StudioGarmentId];
  }
  return STUDIO_GARMENTS.classic;
}
