"use client";

import Link from "next/link";
import {
  ArrowLeft,
  AudioLines,
  ChevronDown,
  Eraser,
  ImagePlus,
  Mic,
  Minus,
  MousePointer2,
  PanelRight,
  PenTool,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  PatternCanvas,
  type PatternCanvasHandle,
  type StudioTool,
} from "@/components/studio/PatternCanvas";
import { StudioBackdrop } from "@/components/studio/StudioBackdrop";
import {
  StudioTeeViewport,
  zoomStudioTee,
} from "@/components/studio/StudioTee";
import type {
  Design,
  PanelJson,
  PatternPanel,
  StudioBackground,
} from "@/lib/dashboard/types";
import {
  DESIGN_STATUS_LABELS,
  PANEL_LABELS,
  PATTERN_PANELS,
} from "@/lib/dashboard/types";
import { STUDIO_BG } from "@/lib/studio/atlas";
import { cn } from "@/lib/utils";

const TEE_COLORS = [
  "#1a1e19",
  "#f3f0e8",
  "#d6ff3c",
  "#7ec8e3",
  "#e8a87c",
  "#ffffff",
];
const PEN_COLORS = ["#f3f0e8", "#d6ff3c", "#070807", "#ff5a5a", "#7ec8e3"];

/** Matches the reference composer width — not full viewport. */
const CHAT_WIDTH = "w-[min(100%,36rem)]";

type Props = { design: Design };

export function StudioWorkspace({ design: initial }: Props) {
  const { updateDesign, saveAsset } = useDashboard();
  const [design, setDesign] = useState(initial);
  const [tool, setTool] = useState<StudioTool>("pen");
  const [penColor, setPenColor] = useState("#d6ff3c");
  const [penWidth, setPenWidth] = useState(6);
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const [printRevision, setPrintRevision] = useState(0);
  const [panelPrints, setPanelPrints] = useState<
    Partial<Record<PatternPanel, string>>
  >({});
  const [chatInput, setChatInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  const patternRef = useRef<PatternCanvasHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<{
    object: import("three").Camera;
    target: import("three").Vector3;
    update: () => void;
    minDistance: number;
    maxDistance: number;
  } | null>(null);

  useEffect(() => {
    setDesign(initial);
  }, [initial]);

  function schedulePersist(next: Design) {
    setDesign(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void updateDesign(next.id, {
        title: next.title,
        panels: next.panels,
        status: next.status,
        color: next.color,
        background: next.background,
        activePanel: next.activePanel,
        prompt: next.prompt,
        method: next.method,
        chat: next.chat,
        thumbnailAssetId: next.thumbnailAssetId,
      });
    }, 450);
  }

  async function persistNow(patch: Partial<Design>) {
    setSaving(true);
    const updated = await updateDesign(design.id, patch);
    if (updated) setDesign(updated);
    setSaving(false);
  }

  function onPanelChange(json: PanelJson, printDataUrl: string) {
    const panel = design.activePanel;
    setPanelPrints((prev) => ({ ...prev, [panel]: printDataUrl }));
    setPrintUrl(printDataUrl);
    setPrintRevision((n) => n + 1);

    const panels = { ...design.panels, [panel]: json };
    const next: Design = {
      ...design,
      panels,
      status: design.status === "ordered" ? "ordered" : "draft",
      updatedAt: new Date().toISOString(),
    };
    schedulePersist(next);

    if (thumbTimer.current) clearTimeout(thumbTimer.current);
    thumbTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(printDataUrl);
          const blob = await res.blob();
          const asset = await saveAsset({
            blob,
            mime: "image/png",
            name: `${design.id}-${panel}.png`,
            designId: design.id,
          });
          await updateDesign(design.id, {
            panels,
            thumbnailAssetId: asset.id,
          });
        } catch {
          // Ignore blob persistence errors during rapid drawing
        }
      })();
    }, 800);
  }

  async function onUpload(file: File) {
    const asset = await saveAsset({
      blob: file,
      mime: file.type || "image/png",
      name: file.name,
      designId: design.id,
    });
    const url = URL.createObjectURL(asset.blob);
    await patternRef.current?.addImageFromUrl(url);
  }

  async function switchPanel(panel: PatternPanel) {
    if (panel === design.activePanel) return;
    await persistNow({ activePanel: panel });
    const cached = panelPrints[panel];
    if (cached) {
      setPrintUrl(cached);
      setPrintRevision((n) => n + 1);
    }
  }

  async function onChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    const at = new Date().toISOString();
    const userMsg = { role: "user" as const, text, at };
    const reply = {
      role: "assistant" as const,
      text: `Got it — I’ll treat “${text.slice(0, 80)}${text.length > 80 ? "…" : ""}” as the brief for the ${PANEL_LABELS[design.activePanel].toLowerCase()}. Sketch or upload on the pattern, and it maps to the tee.`,
      at: new Date().toISOString(),
    };
    const chat = [...design.chat, userMsg, reply];
    const prompt = design.prompt ? design.prompt : text;
    await persistNow({
      chat,
      prompt,
      method: design.method === "draw" ? "hybrid" : design.method,
      status: design.status === "ordered" ? "ordered" : "draft",
    });
  }

  const statusLabel = useMemo(
    () => DESIGN_STATUS_LABELS[design.status],
    [design.status],
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Top bar */}
      <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-3 border-b border-[#f3f0e8]/10 bg-[#070807]/90 px-3 py-2.5 backdrop-blur md:px-4">
        <Link
          href="/dashboard/studio"
          className="grid size-9 place-items-center border border-[#f3f0e8]/15 text-[#c8c4b8] hover:border-[#d6ff3c] hover:text-[#d6ff3c]"
          aria-label="Back to studio"
        >
          <ArrowLeft size={16} />
        </Link>
        <input
          value={design.title}
          onChange={(e) =>
            schedulePersist({ ...design, title: e.target.value })
          }
          onBlur={() => void persistNow({ title: design.title })}
          className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em] outline-none md:text-xl"
        />
        <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
          {saving ? "Saving…" : `Saved · ${statusLabel}`}
        </span>
        <button
          type="button"
          onClick={() => setToolsOpen((v) => !v)}
          className={cn(
            "grid size-9 place-items-center border transition",
            toolsOpen
              ? "border-[#d6ff3c] text-[#d6ff3c]"
              : "border-[#f3f0e8]/20 text-[#c8c4b8]",
          )}
          aria-label={toolsOpen ? "Hide tools" : "Show tools"}
        >
          <PanelRight size={16} />
        </button>
        <button
          type="button"
          onClick={() =>
            void persistNow({
              status: design.status === "ordered" ? "ordered" : "saved",
            })
          }
          className="border border-[#f3f0e8]/20 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.06em] hover:border-[#d6ff3c]"
        >
          Mark design
        </button>
        <Link
          href={`/dashboard/orders/new?design=${design.id}`}
          className="bg-[#d6ff3c] px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.06em] text-[#070807] hover:bg-[#e2ff6a]"
        >
          Order
        </Link>
      </div>

      {/* Full-bleed stage */}
      <div className="relative min-h-0 flex-1">
        <StudioBackdrop background={design.background} />
        <StudioTeeViewport
          color={design.color}
          printUrl={printUrl}
          printRevision={printRevision}
          controlsRef={controlsRef}
          className="absolute inset-0"
        />

        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomStudioTee(controlsRef.current, "in")}
            className="grid size-9 place-items-center bg-black/50 text-[#f3f0e8] backdrop-blur hover:bg-black/70"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomStudioTee(controlsRef.current, "out")}
            className="grid size-9 place-items-center bg-black/50 text-[#f3f0e8] backdrop-blur hover:bg-black/70"
          >
            <Minus size={16} />
          </button>
        </div>

        <div className="absolute right-14 top-3 z-10 flex flex-wrap justify-end gap-1.5">
          {(Object.keys(STUDIO_BG) as StudioBackground[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => void persistNow({ background: key })}
              className={cn(
                "px-2 py-1 text-[0.6rem] uppercase tracking-[0.12em]",
                design.background === key
                  ? "bg-[#d6ff3c] text-[#070807]"
                  : "bg-black/40 text-[#f3f0e8] backdrop-blur",
              )}
            >
              {STUDIO_BG[key].label}
            </button>
          ))}
        </div>

        {/* Floating tools (does not shrink the stage) */}
        {toolsOpen ? (
          <aside className="absolute bottom-28 left-3 top-14 z-20 flex w-[min(100%-1.5rem,17.5rem)] flex-col overflow-hidden rounded-xl border border-[#f3f0e8]/12 bg-[#0a0c0a]/92 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-[#f3f0e8]/10 px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                Tools
              </p>
              <button
                type="button"
                aria-label="Close tools"
                onClick={() => setToolsOpen(false)}
                className="grid size-7 place-items-center text-[#c8c4b8] hover:text-[#f3f0e8]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["select", MousePointer2, "Select"],
                    ["pen", PenTool, "Pen"],
                    ["eraser", Eraser, "Eraser"],
                  ] as const
                ).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => setTool(id)}
                    className={cn(
                      "grid size-9 place-items-center border transition",
                      tool === id
                        ? "border-[#d6ff3c] bg-[#d6ff3c]/15 text-[#d6ff3c]"
                        : "border-[#f3f0e8]/15 text-[#c8c4b8] hover:border-[#f3f0e8]/35",
                    )}
                  >
                    <Icon size={15} />
                  </button>
                ))}
                <button
                  type="button"
                  title="Upload image"
                  onClick={() => fileRef.current?.click()}
                  className="grid size-9 place-items-center border border-[#f3f0e8]/15 text-[#c8c4b8] hover:border-[#f3f0e8]/35"
                >
                  <ImagePlus size={15} />
                </button>
                <button
                  type="button"
                  title="Clear panel"
                  onClick={() => patternRef.current?.clear()}
                  className="grid size-9 place-items-center border border-[#f3f0e8]/15 text-[#c8c4b8] hover:border-[#ff5a5a]/50"
                >
                  <Trash2 size={15} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>

              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  Pen colour
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => {
                        setPenColor(c);
                        setTool("pen");
                      }}
                      className={cn(
                        "size-7 border-2",
                        penColor === c
                          ? "border-[#d6ff3c]"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <label className="mt-2 block text-[0.6rem] uppercase tracking-[0.12em] text-[#c8c4b8]">
                  Width {penWidth}
                  <input
                    type="range"
                    min={1}
                    max={28}
                    value={penWidth}
                    onChange={(e) => setPenWidth(Number(e.target.value))}
                    className="mt-1 w-full accent-[#d6ff3c]"
                  />
                </label>
              </div>

              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  Tee colour
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TEE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => void persistNow({ color: c })}
                      className={cn(
                        "size-7 border-2",
                        design.color === c
                          ? "border-[#d6ff3c]"
                          : "border-[#f3f0e8]/20",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  Pattern
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {PATTERN_PANELS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => void switchPanel(p)}
                      className={cn(
                        "px-2 py-1.5 text-left text-[0.65rem] uppercase tracking-[0.08em]",
                        design.activePanel === p
                          ? "bg-[#d6ff3c] font-semibold text-[#070807]"
                          : "border border-[#f3f0e8]/15 text-[#c8c4b8]",
                      )}
                    >
                      {PANEL_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              <PatternCanvas
                key={design.activePanel}
                ref={patternRef}
                panel={design.activePanel}
                json={design.panels[design.activePanel]}
                tool={tool}
                penColor={penColor}
                penWidth={penWidth}
                onChange={onPanelChange}
                className="w-full overflow-hidden border border-[#f3f0e8]/10"
              />
            </div>
          </aside>
        ) : null}

        {/* Centered chat composer — fixed width, no side chrome */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-5 pt-8 bg-gradient-to-t from-[#070807]/80 via-[#070807]/25 to-transparent">
          <div className={cn("pointer-events-auto", CHAT_WIDTH)}>
            {design.chat.length > 0 ? (
              <div className="mb-2 max-h-14 space-y-1 overflow-y-auto px-1 text-xs text-[#c8c4b8]">
                {design.chat.slice(-2).map((m, i) => (
                  <p key={`${m.at}-${i}`} className="truncate">
                    <span className="text-[#d6ff3c]">
                      {m.role === "user" ? "You" : "Promptwear"}
                    </span>
                    {": "}
                    {m.text}
                  </p>
                ))}
              </div>
            ) : null}

            <form
              onSubmit={onChatSubmit}
              className="w-full rounded-2xl border border-[#f3f0e8]/14 bg-[#121511]/95 shadow-[0_0_0_1px_rgba(214,255,60,0.04),0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                placeholder="Type / for skills"
                className="min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.95rem] leading-relaxed text-[#f3f0e8] outline-none placeholder:text-[#8a877c]"
              />

              <div className="flex items-center justify-between gap-3 px-2.5 pb-2.5 pt-1">
                <button
                  type="button"
                  aria-label="Add image or attachment"
                  onClick={() => fileRef.current?.click()}
                  className="grid size-8 place-items-center rounded-lg text-[#f3f0e8]/80 transition hover:bg-[#f3f0e8]/8 hover:text-[#d6ff3c]"
                >
                  <Plus size={18} strokeWidth={2} />
                </button>

                <div className="flex items-center gap-0.5 sm:gap-1">
                  <button
                    type="button"
                    className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[#f3f0e8] transition hover:bg-[#f3f0e8]/8 sm:inline-flex"
                  >
                    Promptwear
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-[#c8c4b8] transition hover:bg-[#f3f0e8]/8 hover:text-[#f3f0e8]"
                  >
                    Medium
                    <ChevronDown size={14} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Voice input"
                    className="grid size-8 place-items-center rounded-lg text-[#c8c4b8] transition hover:bg-[#f3f0e8]/8 hover:text-[#d6ff3c]"
                  >
                    <Mic size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="submit"
                    aria-label="Send prompt"
                    disabled={!chatInput.trim()}
                    className="grid size-8 place-items-center rounded-lg text-[#d6ff3c] transition hover:bg-[#d6ff3c]/15 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <AudioLines size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
