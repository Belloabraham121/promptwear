import type { PatternPanel } from "@/lib/dashboard/types";
import type { UvRect } from "@/lib/studio/atlas";
import {
  CLASSIC_PANEL_SHAPES,
  OVERSIZED_PANEL_SHAPES,
} from "@/lib/studio/generated/panelShapes";

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

function uvFromShapes(
  shapes: typeof CLASSIC_PANEL_SHAPES,
): Record<PatternPanel, UvRect> {
  return {
    front: shapes.front.uvRect,
    back: shapes.back.uvRect,
    sleeveL: shapes.sleeveL.uvRect,
    sleeveR: shapes.sleeveR.uvRect,
    collar: shapes.collar.uvRect,
  };
}

export const STUDIO_GARMENTS: Record<StudioGarmentId, StudioGarment> = {
  classic: {
    id: "classic",
    label: "Classic",
    hint: "Full panel UVs — front, back, sleeves, collar",
    modelPath: "/models/studio/tshirt.glb?v=2",
    normalPath: "/models/studio/textures/normal.png",
    fullPanelSupport: true,
    panelUV: uvFromShapes(CLASSIC_PANEL_SHAPES),
  },
  oversized: {
    id: "oversized",
    label: "Oversized",
    hint: "CLO baggy fit — distinct front/back/sleeve islands + rib collar",
    modelPath: "/models/studio/oversized/tshirt.glb?v=4",
    // No normalMap: tiling jersey NRMs on unified CLO UVs read as black triangle noise.
    // Cloth folds come from the mesh; albedo is the studio color atlas.
    normalPath: undefined,
    fullPanelSupport: true,
    panelUV: uvFromShapes(OVERSIZED_PANEL_SHAPES),
  },
};

export const STUDIO_GARMENT_LIST = Object.values(STUDIO_GARMENTS);

export function getStudioGarment(id?: string | null): StudioGarment {
  if (id && id in STUDIO_GARMENTS) {
    return STUDIO_GARMENTS[id as StudioGarmentId];
  }
  return STUDIO_GARMENTS.classic;
}
