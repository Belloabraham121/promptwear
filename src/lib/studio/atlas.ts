import type { PatternPanel } from "@/lib/dashboard/types";
import { STUDIO_GARMENTS } from "@/lib/studio/garments";

export const ATLAS_SIZE = 1024;

/** UV island bounds on a studio tee atlas (native mesh UVs). */
export type UvRect = { u0: number; v0: number; u1: number; v1: number };

/** @deprecated use getStudioGarment(id).panelUV — classic defaults */
export const PANEL_UV: Record<PatternPanel, UvRect> =
  STUDIO_GARMENTS.classic.panelUV;

/** @deprecated use getStudioGarment(id).modelPath */
export const STUDIO_MODEL_PATH = STUDIO_GARMENTS.classic.modelPath;
export const STUDIO_NORMAL_PATH = STUDIO_GARMENTS.classic.normalPath!;

export type StudioBg = "ink" | "bone" | "white" | "grid";

export const STUDIO_BG: Record<StudioBg, { css: string; label: string }> = {
  ink: {
    label: "Ink",
    css: "radial-gradient(ellipse 70% 55% at 50% 40%, #1a2018 0%, #070807 70%)",
  },
  bone: {
    label: "Bone",
    css: "radial-gradient(ellipse 70% 55% at 50% 40%, #e8e2d4 0%, #cfc6b4 75%)",
  },
  white: {
    label: "White",
    css: "radial-gradient(ellipse 70% 55% at 50% 35%, #ffffff 0%, #e8e8e4 80%)",
  },
  grid: {
    label: "Grid",
    css: "#070807",
  },
};

/**
 * Convert UV rect to canvas pixels for CanvasTexture with flipY=false.
 * Mesh UVs: v=0 at bottom → canvas y grows down from top.
 */
export function uvRectToPixels(rect: UvRect, size: number) {
  const x = rect.u0 * size;
  const y = (1 - rect.v1) * size;
  const w = (rect.u1 - rect.u0) * size;
  const h = (rect.v1 - rect.v0) * size;
  return { x, y, w, h };
}
