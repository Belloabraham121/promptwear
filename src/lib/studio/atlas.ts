import type { PatternPanel } from "@/lib/dashboard/types";
import { CLASSIC_PANEL_SHAPES } from "@/lib/studio/generated/panelShapes";

export const ATLAS_SIZE = 1024;

/** UV island bounds on a studio tee atlas (native mesh UVs). */
export type UvRect = { u0: number; v0: number; u1: number; v1: number };

/** @deprecated use getStudioGarment(id).panelUV — classic defaults */
export const PANEL_UV: Record<PatternPanel, UvRect> = {
  front: CLASSIC_PANEL_SHAPES.front.uvRect,
  back: CLASSIC_PANEL_SHAPES.back.uvRect,
  sleeveL: CLASSIC_PANEL_SHAPES.sleeveL.uvRect,
  sleeveR: CLASSIC_PANEL_SHAPES.sleeveR.uvRect,
  collar: CLASSIC_PANEL_SHAPES.collar.uvRect,
};

/** @deprecated use getStudioGarment(id).modelPath */
export const STUDIO_MODEL_PATH = "/models/studio/tshirt.glb?v=2";
export const STUDIO_NORMAL_PATH = "/models/studio/textures/normal.png";

export type StudioBg = "ink" | "bone" | "white" | "grid";

export const STUDIO_BG: Record<
  StudioBg,
  { css: string; label: string; floor?: string }
> = {
  ink: {
    label: "Ink",
    css: [
      "radial-gradient(ellipse 55% 40% at 50% 28%, rgba(214,255,60,0.06) 0%, transparent 55%)",
      "radial-gradient(ellipse 70% 50% at 50% 38%, #1c2418 0%, #0c100c 48%, #070807 100%)",
    ].join(","),
    floor:
      "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 42%), radial-gradient(ellipse 80% 28% at 50% 100%, rgba(0,0,0,0.5), transparent 70%)",
  },
  bone: {
    label: "Bone",
    css: [
      "radial-gradient(ellipse 60% 45% at 50% 30%, #f7f3ea 0%, #e6dfd0 42%, #cfc6b4 100%)",
      "radial-gradient(ellipse 90% 60% at 50% 110%, rgba(80,70,50,0.18), transparent 55%)",
    ].join(","),
    floor:
      "linear-gradient(to top, rgba(90,78,55,0.22) 0%, transparent 40%), radial-gradient(ellipse 85% 30% at 50% 100%, rgba(60,50,35,0.2), transparent 70%)",
  },
  white: {
    label: "White",
    css: [
      "radial-gradient(ellipse 65% 50% at 50% 32%, #ffffff 0%, #f2f2ee 45%, #dddcd6 100%)",
      "radial-gradient(ellipse 80% 40% at 50% 100%, rgba(120,120,110,0.16), transparent 60%)",
    ].join(","),
    floor:
      "linear-gradient(to top, rgba(140,140,130,0.18) 0%, transparent 38%), radial-gradient(ellipse 80% 26% at 50% 100%, rgba(90,90,80,0.14), transparent 70%)",
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
