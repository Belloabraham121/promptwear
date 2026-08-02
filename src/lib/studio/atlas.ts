/** Shared UV print stamp region for chest-bound studio tee. */
export const PRINT_UV = { u0: 0.18, v0: 0.02, u1: 0.82, v1: 0.6 };
export const ATLAS_SIZE = 1024;

export type StudioBg = "ink" | "bone" | "white" | "grid";

export const STUDIO_BG: Record<
  StudioBg,
  { css: string; label: string }
> = {
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
    /** Fallback flat fill — real grid is rendered by StudioBackdrop */
    css: "#070807",
  },
};
