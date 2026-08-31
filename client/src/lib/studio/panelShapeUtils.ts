import type { PatternPanel } from "@/lib/dashboard/types";
import type { UvRect } from "@/lib/studio/atlas";
import { uvRectToPixels } from "@/lib/studio/atlas";
import {
  getPanelShape,
  type PanelShape,
} from "@/lib/studio/generated/panelShapes";
import type { StudioGarmentId } from "@/lib/studio/garments";

export type { PanelShape };

/** Local outline → canvas pixel points for a square editor of `size`. */
export function outlineToCanvasPoints(
  outline: [number, number][],
  size: number,
  pad = 0.06,
): { x: number; y: number }[] {
  const inner = size * (1 - pad * 2);
  const ox = size * pad;
  const oy = size * pad;
  return outline.map(([lx, ly]) => ({
    x: ox + lx * inner,
    y: oy + ly * inner,
  }));
}

/** Local outline → atlas pixel points for a panel UV rect. */
export function outlineToAtlasPoints(
  shape: PanelShape,
  atlasSize: number,
): { x: number; y: number }[] {
  const { x, y, w, h } = uvRectToPixels(shape.uvRect, atlasSize);
  return shape.outline.map(([lx, ly]) => ({
    x: x + lx * w,
    y: y + ly * h,
  }));
}

export function strokeOutline(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

export function getGarmentPanelShape(
  garmentId: StudioGarmentId,
  panel: PatternPanel,
): PanelShape {
  return getPanelShape(garmentId, panel);
}

export function panelUvRect(
  garmentId: StudioGarmentId,
  panel: PatternPanel,
): UvRect {
  return getPanelShape(garmentId, panel).uvRect;
}
