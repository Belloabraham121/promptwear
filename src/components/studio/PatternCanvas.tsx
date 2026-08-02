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
      if (skipEmit.current) return;
      const objects = canvas.getObjects();
      const data = canvas.toJSON();
      const printDataUrl = exportPrint(canvas);
      onChangeRef.current(
        objects.length ? (data as PanelJson) : null,
        printDataUrl,
      );
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

      const canvas = new Canvas(el, {
        width: SIZE,
        height: SIZE,
        backgroundColor: "#1a1f1a",
        preserveObjectStacking: true,
        selection: false,
        isDrawingMode: true,
        enableRetinaScaling: false,
      });
      fabricRef.current = canvas;
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      applyTool(canvas);
      syncCssSize(canvas);

      void FabricImage.fromURL(guideDataUrl(panel)).then((img) => {
        img.set({ selectable: false, evented: false });
        canvas.backgroundImage = img;
        canvas.requestRenderAll();
      });

      const bump = () => emit(canvas);
      canvas.on("path:created", bump);
      canvas.on("object:modified", bump);
      canvas.on("object:removed", bump);

      const ro = new ResizeObserver(() => syncCssSize(canvas));
      if (wrapRef.current) ro.observe(wrapRef.current);

      skipEmit.current = true;
      void (async () => {
        if (json) {
          await canvas.loadFromJSON(json);
          canvas.requestRenderAll();
        }
        skipEmit.current = false;
        applyTool(canvas);
        emit(canvas);
      })();

      return () => {
        ro.disconnect();
        canvas.dispose();
        fabricRef.current = null;
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
