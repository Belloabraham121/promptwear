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
  Sparkles,
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
import { ApiError } from "@/lib/api/errors";
import { getDesign } from "@/lib/api/designs";
import {
  getChatHistory,
  pollGenerateJob,
  sendChat,
  startGenerate,
} from "@/lib/api/studio";
import {
  clearDraft,
  getDraft,
  makeDraft,
  putDraft,
} from "@/lib/db/drafts";
import { STUDIO_BG } from "@/lib/studio/atlas";
import {
  STUDIO_GARMENT_LIST,
  getStudioGarment,
  type StudioGarmentId,
} from "@/lib/studio/garments";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

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

const DRAFT_DEBOUNCE_MS = 2500;
const API_SYNC_DEBOUNCE_MS = 5000;

function studioApiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 429 || error.code === "RATE_LIMIT") {
      return "Too many requests — wait a moment and try again.";
    }
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

type Props = { design: Design };

export function StudioWorkspace({ design: initial }: Props) {
  const { updateDesign, saveAsset } = useDashboard();
  const { session } = useAuth();
  const ownerId = session?.id;
  const [design, setDesign] = useState(initial);
  const [tool, setTool] = useState<StudioTool>("pen");
  const [penColor, setPenColor] = useState("#d6ff3c");
  const [penWidth, setPenWidth] = useState(6);
  const [printRevision, setPrintRevision] = useState(0);
  const [panelPrints, setPanelPrints] = useState<
    Partial<Record<PatternPanel, string>>
  >({});
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(true);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [saving, setSaving] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [draftChecked, setDraftChecked] = useState(false);
  const patternRef = useRef<PatternCanvasHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const apiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setDraftChecked(false);
  }, [initial]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { chat } = await getChatHistory(initial.id);
        if (!cancelled) {
          setDesign((current) => ({ ...current, chat }));
        }
      } catch (error) {
        if (!cancelled) {
          setChatError(
            studioApiMessage(error, "Could not load chat history."),
          );
        }
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initial.id]);

  useEffect(() => {
    if (draftChecked || !ownerId) return;

    let cancelled = false;
    void (async () => {
      const draft = await getDraft(initial.id, ownerId);
      if (cancelled) return;

      if (draft?.dirty) {
        const draftTime = new Date(draft.updatedAt).getTime();
        const serverTime = new Date(initial.updatedAt).getTime();
        if (draftTime > serverTime) {
          const restore = window.confirm(
            "Restore unsaved local changes from your last studio session?",
          );
          if (restore) {
            setDesign((current) => ({ ...current, panels: draft.panels }));
          } else {
            await clearDraft(initial.id);
          }
        }
      }

      if (!cancelled) setDraftChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [draftChecked, initial.id, initial.updatedAt, ownerId]);

  function scheduleDraftSave(panels: Record<PatternPanel, PanelJson>) {
    if (!ownerId) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      void putDraft(makeDraft(design.id, ownerId, panels));
    }, DRAFT_DEBOUNCE_MS);
  }

  function scheduleApiSync(next: Design) {
    if (apiTimer.current) clearTimeout(apiTimer.current);
    apiTimer.current = setTimeout(() => {
      void persistNow({
        title: next.title,
        panels: next.panels,
        status: next.status,
        color: next.color,
        background: next.background,
        garmentId: next.garmentId,
        activePanel: next.activePanel,
        prompt: next.prompt,
        method: next.method,
        chat: next.chat,
        thumbnailAssetId: next.thumbnailAssetId,
      });
    }, API_SYNC_DEBOUNCE_MS);
  }

  function applyLocal(next: Design, options?: { syncPanels?: boolean }) {
    setDesign(next);
    if (options?.syncPanels) {
      scheduleDraftSave(next.panels);
      scheduleApiSync(next);
    }
  }

  async function persistNow(patch: Partial<Design>) {
    setSaving(true);
    const updated = await updateDesign(design.id, patch);
    if (updated) {
      setDesign(updated);
      await clearDraft(design.id);
    }
    setSaving(false);
    return updated;
  }

  function onPanelChange(json: PanelJson, printDataUrl: string) {
    const panel = design.activePanel;
    setPanelPrints((prev) => ({ ...prev, [panel]: printDataUrl }));
    setPrintRevision((n) => n + 1);

    const panels = { ...design.panels, [panel]: json };
    const next: Design = {
      ...design,
      panels,
      status: design.status === "ordered" ? "ordered" : "draft",
      updatedAt: new Date().toISOString(),
    };
    applyLocal(next, { syncPanels: true });

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
    await patternRef.current?.addImageFromUrl(asset.url);
  }

  async function switchPanel(panel: PatternPanel) {
    if (panel === design.activePanel) return;
    await persistNow({ activePanel: panel, panels: design.panels });
  }

  async function onChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !online || chatSending) return;

    setChatInput("");
    setChatError(null);
    setChatSending(true);

    try {
      const { chat } = await sendChat(design.id, text);
      const prompt = design.prompt ? design.prompt : text;
      const method = design.method === "draw" ? "hybrid" : design.method;
      setDesign((current) => ({
        ...current,
        chat,
        prompt,
        method,
      }));
    } catch (error) {
      setChatInput(text);
      setChatError(studioApiMessage(error, "Could not send message."));
    } finally {
      setChatSending(false);
    }
  }

  async function onGenerate() {
    if (!online || generating) return;

    setGenerateError(null);
    setGenerating(true);

    try {
      const { jobId } = await startGenerate(design.id, design.activePanel);
      const job = await pollGenerateJob(design.id, jobId);

      if (job.status === "failed") {
        throw new Error(job.error ?? "Generation failed.");
      }

      const refreshed = await getDesign(design.id);
      setDesign(refreshed);
      setPrintRevision((n) => n + 1);
      setPanelPrints({});
    } catch (error) {
      setGenerateError(
        studioApiMessage(error, "Could not generate design."),
      );
    } finally {
      setGenerating(false);
    }
  }

  const statusLabel = useMemo(
    () => DESIGN_STATUS_LABELS[design.status],
    [design.status],
  );

  const garment = getStudioGarment(design.garmentId);

  async function setGarment(id: StudioGarmentId) {
    if (id === design.garmentId) return;
    await persistNow({ garmentId: id, panels: design.panels });
    setPrintRevision((n) => n + 1);
  }

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
          onChange={(e) => applyLocal({ ...design, title: e.target.value })}
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
          disabled={!online || generating}
          onClick={() => void onGenerate()}
          className="inline-flex items-center gap-1.5 border border-[#d6ff3c]/40 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.06em] text-[#d6ff3c] hover:border-[#d6ff3c] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles size={12} />
          {generating ? "Generating…" : "Generate"}
        </button>
        <button
          type="button"
          onClick={() =>
            void persistNow({
              status: design.status === "ordered" ? "ordered" : "saved",
              panels: design.panels,
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
            garmentId={design.garmentId ?? "classic"}
            color={design.color}
            panelPrints={panelPrints}
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

        <div className="absolute right-14 top-3 z-10 flex max-w-[min(100%-5rem,22rem)] flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-1.5">
            {STUDIO_GARMENT_LIST.map((g) => (
              <button
                key={g.id}
                type="button"
                title={g.hint}
                onClick={() => void setGarment(g.id)}
                className={cn(
                  "px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.12em]",
                  (design.garmentId ?? "classic") === g.id
                    ? "bg-[#d6ff3c] font-semibold text-[#070807]"
                    : "bg-black/45 text-[#f3f0e8] backdrop-blur hover:bg-black/60",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
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
          {garment.id === "oversized" ? (
            <p className="max-w-[16rem] text-right text-[0.58rem] leading-snug text-[#c8c4b8]/90">
              Oversized: panel shapes from CLO UV islands (front, back, sleeves,
              rib collar).
            </p>
          ) : null}
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
                key={`${design.garmentId ?? "classic"}-${design.activePanel}`}
                ref={patternRef}
                panel={design.activePanel}
                garmentId={design.garmentId ?? "classic"}
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
            {chatLoading ? (
              <p className="mb-2 px-1 text-xs text-[#c8c4b8]">
                Loading chat…
              </p>
            ) : null}
            {!online ? (
              <p className="mb-2 px-1 text-xs text-[#c8c4b8]">
                Offline — chat is disabled. Local drafts still save.
              </p>
            ) : null}
            {chatError ? (
              <p className="mb-2 px-1 text-xs text-[#ff5a5a]">{chatError}</p>
            ) : null}
            {generateError ? (
              <p className="mb-2 px-1 text-xs text-[#ff5a5a]">{generateError}</p>
            ) : null}
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
                disabled={!online || chatSending}
                placeholder={
                  online ? "Type / for skills" : "Chat unavailable offline"
                }
                className="min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.95rem] leading-relaxed text-[#f3f0e8] outline-none placeholder:text-[#8a877c] disabled:cursor-not-allowed disabled:opacity-50"
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
                    disabled={!online || chatSending || !chatInput.trim()}
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
