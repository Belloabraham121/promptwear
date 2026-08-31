"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Canvas, FabricImage, PencilBrush, Polygon } from "fabric";
import type { PanelJson, PatternPanel } from "@/lib/dashboard/types";
import { PANEL_LABELS } from "@/lib/dashboard/types";
import type { StudioGarmentId } from "@/lib/studio/garments";
import {
  getGarmentPanelShape,
  outlineToCanvasPoints,
  strokeOutline,
} from "@/lib/studio/panelShapeUtils";

export type StudioTool = "select" | "pen" | "eraser";

export type PatternCanvasHandle = {
  addImageFromUrl: (url: string) => Promise<void>;
  clear: () => void;
  exportPrintDataUrl: () => string;
};

type Props = {
  panel: PatternPanel;
  garmentId: StudioGarmentId;
  json: PanelJson;
  tool: StudioTool;
  penColor: string;
  penWidth: number;
  onChange: (json: PanelJson, printDataUrl: string) => void;
  className?: string;
};

const SIZE = 512;
const EDITOR_BG = "#1a1f1a";

function isCanvasAlive(canvas: Canvas) {
  return !canvas.disposed;
}

/** Artwork-only payload for Fabric 7 — skip editor chrome that loadFromJSON would clear/restore. */
function artworkPayload(
  json: PanelJson,
): { objects: unknown[] } | null {
  if (!json || typeof json !== "object") return null;
  const objects = (json as { objects?: unknown }).objects;
  if (!Array.isArray(objects) || objects.length === 0) return null;
  return { objects };
}

function guideDataUrl(garmentId: StudioGarmentId, panel: PatternPanel) {
  const shape = getGarmentPanelShape(garmentId, panel);
  const guide = document.createElement("canvas");
  guide.width = SIZE;
  guide.height = SIZE;
  const ctx = guide.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, SIZE, SIZE);

  const pts = outlineToCanvasPoints(shape.outline, SIZE);
  // Soft fill so the panel piece reads as a sewing pattern
  strokeOutline(ctx, pts);
  ctx.fillStyle = "rgba(214,255,60,0.07)";
  ctx.fill();
  ctx.strokeStyle = "rgba(214,255,60,0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner grain hint
  ctx.save();
  strokeOutline(ctx, pts);
  ctx.clip();
  ctx.strokeStyle = "rgba(243,240,232,0.06)";
  ctx.lineWidth = 1;
  for (let y = 24; y < SIZE; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(243,240,232,0.55)";
  ctx.font = "12px sans-serif";
  ctx.fillText(PANEL_LABELS[panel], 16, 28);
  return guide.toDataURL("image/png");
}

function clipPolygon(garmentId: StudioGarmentId, panel: PatternPanel) {
  const shape = getGarmentPanelShape(garmentId, panel);
  const pts = outlineToCanvasPoints(shape.outline, SIZE).map((p) => ({
    x: p.x,
    y: p.y,
  }));
  return new Polygon(pts, {
    absolutePositioned: true,
    selectable: false,
    evented: false,
    fill: "#ffffff",
    strokeWidth: 0,
    objectCaching: false,
  });
}

/** Export artwork only (transparent), masked to the panel silhouette. */
function exportPrint(
  canvas: Canvas,
  garmentId: StudioGarmentId,
  panel: PatternPanel,
): string {
  const prevBg = canvas.backgroundColor;
  const prevBgImage = canvas.backgroundImage;
  const prevClip = canvas.clipPath;
  canvas.backgroundColor = "";
  canvas.backgroundImage = undefined;
  canvas.clipPath = undefined;
  canvas.requestRenderAll();

  const art = document.createElement("canvas");
  art.width = SIZE;
  art.height = SIZE;
  const actx = art.getContext("2d");
  const el = canvas.lowerCanvasEl;
  if (actx && el) {
    actx.clearRect(0, 0, SIZE, SIZE);
    actx.drawImage(el, 0, 0, SIZE, SIZE);
  }

  canvas.backgroundColor = prevBg;
  canvas.backgroundImage = prevBgImage;
  canvas.clipPath = prevClip;
  canvas.requestRenderAll();

  if (!actx || !el) {
    return canvas.toDataURL({
      format: "png",
      multiplier: 1,
      enableRetinaScaling: false,
    });
  }

  const shape = getGarmentPanelShape(garmentId, panel);
  const out = document.createElement("canvas");
  out.width = SIZE;
  out.height = SIZE;
  const ctx = out.getContext("2d");
  if (!ctx) return art.toDataURL("image/png");

  const pts = outlineToCanvasPoints(shape.outline, SIZE);
  ctx.clearRect(0, 0, SIZE, SIZE);
  strokeOutline(ctx, pts);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.globalCompositeOperation = "source-in";
  ctx.drawImage(art, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  return out.toDataURL("image/png");
}

export const PatternCanvas = forwardRef<PatternCanvasHandle, Props>(
  function PatternCanvas(
    { panel, garmentId, json, tool, penColor, penWidth, onChange, className },
    ref,
  ) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const hostRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<Canvas | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const skipEmit = useRef(false);
    const toolRef = useRef(tool);
    const penColorRef = useRef(penColor);
    const penWidthRef = useRef(penWidth);
    const garmentRef = useRef(garmentId);
    toolRef.current = tool;
    penColorRef.current = penColor;
    penWidthRef.current = penWidth;
    garmentRef.current = garmentId;

    function applyTool(canvas: Canvas) {
      const t = toolRef.current;
      canvas.selection = t === "select";
      canvas.isDrawingMode = t === "pen" || t === "eraser";
      if (!(canvas.freeDrawingBrush instanceof PencilBrush)) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
      }
      const brush = canvas.freeDrawingBrush as PencilBrush;
      (
        brush as PencilBrush & { globalCompositeOperation?: GlobalCompositeOperation }
      ).globalCompositeOperation =
        t === "eraser" ? "destination-out" : "source-over";
      brush.color = t === "eraser" ? "#000000" : penColorRef.current;
      brush.width =
        t === "eraser"
          ? Math.max(penWidthRef.current * 2.5, 14)
          : penWidthRef.current;
      canvas.getObjects().forEach((obj) => {
        obj.selectable = t === "select";
        obj.evented = t === "select";
      });
      canvas.requestRenderAll();
    }

    function syncCssSize(canvas: Canvas) {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const css = Math.max(180, Math.floor(wrap.clientWidth));
      canvas.setDimensions(
        { width: css, height: css },
        { cssOnly: true },
      );
    }

    function emit(canvas: Canvas) {
      if (skipEmit.current || !isCanvasAlive(canvas)) return;
      const objects = canvas.getObjects();
      const data = canvas.toJSON() as Record<string, unknown>;
      const printDataUrl = exportPrint(canvas, garmentRef.current, panel);
      const panelJson: PanelJson = objects.length
        ? { version: data.version, objects: data.objects }
        : null;
      onChangeRef.current(panelJson, printDataUrl);
    }

    useImperativeHandle(ref, () => ({
      async addImageFromUrl(url: string) {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const img = await FabricImage.fromURL(url, {
          crossOrigin: "anonymous",
        });
        const max = SIZE * 0.55;
        const scale = Math.min(max / (img.width || 1), max / (img.height || 1));
        img.set({
          left: SIZE / 2,
          top: SIZE / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        applyTool(canvas);
        canvas.requestRenderAll();
        emit(canvas);
      },
      clear() {
        const canvas = fabricRef.current;
        if (!canvas) return;
        canvas.getObjects().forEach((o) => canvas.remove(o));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        emit(canvas);
      },
      exportPrintDataUrl() {
        const canvas = fabricRef.current;
        if (!canvas) return "";
        return exportPrint(canvas, garmentRef.current, panel);
      },
    }));

    useEffect(() => {
      const el = hostRef.current;
      if (!el) return undefined;

      const ac = new AbortController();
      const { signal } = ac;

      const canvas = new Canvas(el, {
        width: SIZE,
        height: SIZE,
        backgroundColor: EDITOR_BG,
        preserveObjectStacking: true,
        selection: false,
        isDrawingMode: true,
        enableRetinaScaling: false,
      });
      fabricRef.current = canvas;
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.clipPath = clipPolygon(garmentId, panel);
      applyTool(canvas);
      syncCssSize(canvas);

      const bump = () => emit(canvas);
      canvas.on("path:created", bump);
      canvas.on("object:modified", bump);
      canvas.on("object:removed", bump);

      const ro = new ResizeObserver(() => {
        if (isCanvasAlive(canvas)) syncCssSize(canvas);
      });
      if (wrapRef.current) ro.observe(wrapRef.current);

      skipEmit.current = true;
      void (async () => {
        try {
          const payload = artworkPayload(json);
          if (payload && isCanvasAlive(canvas) && !signal.aborted) {
            await canvas.loadFromJSON(payload, undefined, { signal });
          }
        } catch {
          if (!isCanvasAlive(canvas) || signal.aborted) return;
          try {
            canvas.getObjects().forEach((o) => canvas.remove(o));
            canvas.discardActiveObject();
          } catch {
            return;
          }
        }

        if (!isCanvasAlive(canvas) || signal.aborted) return;

        try {
          const img = await FabricImage.fromURL(guideDataUrl(garmentId, panel), {
            signal,
          });
          if (!isCanvasAlive(canvas) || signal.aborted) return;
          img.set({ selectable: false, evented: false });
          canvas.backgroundColor = EDITOR_BG;
          canvas.backgroundImage = img;
          canvas.clipPath = clipPolygon(garmentId, panel);
          canvas.requestRenderAll();
        } catch {
          if (!isCanvasAlive(canvas) || signal.aborted) return;
          canvas.backgroundColor = EDITOR_BG;
        }

        if (!isCanvasAlive(canvas) || signal.aborted) return;
        skipEmit.current = false;
        applyTool(canvas);
        emit(canvas);
      })();

      return () => {
        ac.abort();
        skipEmit.current = true;
        ro.disconnect();
        fabricRef.current = null;
        void canvas.dispose();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [panel, garmentId]);

    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      applyTool(canvas);
    }, [tool, penColor, penWidth]);

    return (
      <div ref={wrapRef} className={className}>
        <canvas ref={hostRef} />
      </div>
    );
  },
);
