"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Canvas, FabricImage, PencilBrush } from "fabric";
import type { PanelJson, PatternPanel } from "@/lib/dashboard/types";
import { PANEL_LABELS } from "@/lib/dashboard/types";

export type StudioTool = "select" | "pen" | "eraser";

export type PatternCanvasHandle = {
  addImageFromUrl: (url: string) => Promise<void>;
  clear: () => void;
  exportPrintDataUrl: () => string;
};

type Props = {
  panel: PatternPanel;
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

function guideDataUrl(panel: PatternPanel) {
  const guide = document.createElement("canvas");
  guide.width = SIZE;
  guide.height = SIZE;
  const ctx = guide.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = "rgba(214,255,60,0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);

  if (panel === "front" || panel === "back") {
    ctx.beginPath();
    ctx.moveTo(96, 72);
    ctx.lineTo(160, 48);
    ctx.quadraticCurveTo(256, 28, 352, 48);
    ctx.lineTo(416, 72);
    ctx.lineTo(400, 460);
    ctx.lineTo(112, 460);
    ctx.closePath();
    ctx.stroke();
  } else if (panel === "collar") {
    ctx.beginPath();
    ctx.moveTo(80, 200);
    ctx.quadraticCurveTo(256, 120, 432, 200);
    ctx.lineTo(400, 300);
    ctx.quadraticCurveTo(256, 240, 112, 300);
    ctx.closePath();
    ctx.stroke();
  } else {
    const flip = panel === "sleeveR";
    ctx.beginPath();
    if (!flip) {
      ctx.moveTo(80, 120);
      ctx.lineTo(280, 80);
      ctx.lineTo(340, 400);
      ctx.lineTo(120, 420);
    } else {
      ctx.moveTo(432, 120);
      ctx.lineTo(232, 80);
      ctx.lineTo(172, 400);
      ctx.lineTo(392, 420);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(243,240,232,0.55)";
  ctx.font = "12px sans-serif";
  ctx.fillText(PANEL_LABELS[panel], 16, 28);
  return guide.toDataURL("image/png");
}

/** Export artwork only (transparent) so it composites onto tee colour. */
function exportPrint(canvas: Canvas): string {
  const prevBg = canvas.backgroundColor;
  const prevBgImage = canvas.backgroundImage;
  canvas.backgroundColor = "";
  canvas.backgroundImage = undefined;
  canvas.requestRenderAll();
  const dataUrl = canvas.toDataURL({
    format: "png",
    multiplier: 1,
    enableRetinaScaling: false,
  });
  canvas.backgroundColor = prevBg;
  canvas.backgroundImage = prevBgImage;
  canvas.requestRenderAll();
  return dataUrl;
}

export const PatternCanvas = forwardRef<PatternCanvasHandle, Props>(
  function PatternCanvas(
    { panel, json, tool, penColor, penWidth, onChange, className },
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
    toolRef.current = tool;
    penColorRef.current = penColor;
    penWidthRef.current = penWidth;

    function applyTool(canvas: Canvas) {
      const t = toolRef.current;
      canvas.selection = t === "select";
      canvas.isDrawingMode = t === "pen" || t === "eraser";
      if (!(canvas.freeDrawingBrush instanceof PencilBrush)) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
      }
      const brush = canvas.freeDrawingBrush as PencilBrush;
      // Eraser paints editor bg; stripped from transparent tee export less ideal —
      // use destination-out so strokes punch holes in artwork.
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
      const printDataUrl = exportPrint(canvas);
      // Persist artwork objects only — not guide backgroundImage / editor bg.
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
        const max = SIZE * 0.6;
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
        return exportPrint(canvas);
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
          // Abort, dispose race, or stale/invalid Fabric JSON — keep empty artwork.
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
          const img = await FabricImage.fromURL(guideDataUrl(panel), {
            signal,
          });
          if (!isCanvasAlive(canvas) || signal.aborted) return;
          img.set({ selectable: false, evented: false });
          canvas.backgroundColor = EDITOR_BG;
          canvas.backgroundImage = img;
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
    }, [panel]);

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
