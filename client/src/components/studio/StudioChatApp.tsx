"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AudioLines,
  ChevronDown,
  Image as ImageIcon,
  Menu,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useVoiceDictation } from "@/hooks/useVoiceDictation";
import { VoiceWaveform } from "@/components/studio/VoiceWaveform";
import { uploadAsset } from "@/lib/api/assets";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/api/errors";
import type { DesignChatMessage } from "@/lib/api/designs";
import {
  getChatHistory,
  getStudioImageOptions,
  getStudioModels,
  pollGenerateJob,
  sendChat,
  STUDIO_IMAGE_MODEL_ID,
  type ImageQuality,
  type ImageSize,
  type StudioAiModel,
  type StudioImageOption,
} from "@/lib/api/studio";
import type { Design } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE_OPTIONS: StudioImageOption[] = [
  { quality: "low", size: "1024x1024", priceUsd: 0.011, label: "Low · Square" },
  { quality: "low", size: "1024x1536", priceUsd: 0.016, label: "Low · Portrait" },
  { quality: "low", size: "1536x1024", priceUsd: 0.016, label: "Low · Landscape" },
  {
    quality: "medium",
    size: "1024x1024",
    priceUsd: 0.042,
    label: "Medium · Square",
  },
  {
    quality: "medium",
    size: "1024x1536",
    priceUsd: 0.063,
    label: "Medium · Portrait",
  },
  {
    quality: "medium",
    size: "1536x1024",
    priceUsd: 0.063,
    label: "Medium · Landscape",
  },
  { quality: "high", size: "1024x1024", priceUsd: 0.167, label: "High · Square" },
  {
    quality: "high",
    size: "1024x1536",
    priceUsd: 0.25,
    label: "High · Portrait",
  },
  {
    quality: "high",
    size: "1536x1024",
    priceUsd: 0.25,
    label: "High · Landscape",
  },
];

function studioApiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 429 || error.code === "RATE_LIMIT") {
      return error.message || "Too many requests — wait a moment and try again.";
    }
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function chatPreview(design: Design): string {
  const last = design.chat[design.chat.length - 1];
  if (last?.text) return last.text;
  if (design.prompt) return design.prompt;
  return "New chat";
}

function formatChatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function StudioChatApp() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const activeId = typeof params.id === "string" ? params.id : undefined;
  const { ready, designs, addDesign, updateDesign, removeDesign } =
    useDashboard();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Design | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [chat, setChat] = useState<DesignChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [studioModels, setStudioModels] = useState<StudioAiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState(STUDIO_IMAGE_MODEL_ID);
  const [imageMode, setImageMode] = useState(true);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [imageOptions, setImageOptions] = useState<StudioImageOption[]>(
    FALLBACK_IMAGE_OPTIONS,
  );
  const [imageQuality, setImageQuality] = useState<ImageQuality>("medium");
  const [imageSize, setImageSize] = useState<ImageSize>("1024x1024");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingRefs, setPendingRefs] = useState<
    { assetId: string; url: string; name: string }[]
  >([]);
  const [uploadingRef, setUploadingRef] = useState(false);
  const {
    isListening,
    supported: voiceSupported,
    mediaStream: voiceStream,
    toggle: toggleVoice,
    stop: stopVoice,
  } = useVoiceDictation();

  const handleVoiceToggle = useCallback(() => {
    if (!voiceSupported) {
      toast.message("Voice input is not supported in this browser.");
      return;
    }
    if (chatSending || generating) return;
    toggleVoice(chatInput, (next) => setChatInput(next));
  }, [voiceSupported, chatSending, generating, toggleVoice, chatInput]);

  const activeDesign = useMemo(
    () => designs.find((d) => d.id === activeId),
    [designs, activeId],
  );

  const sortedDesigns = useMemo(
    () =>
      [...designs].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [designs],
  );

  const isImageMode = imageMode;
  const selectedImageOption =
    imageOptions.find(
      (o) => o.quality === imageQuality && o.size === imageSize,
    ) ?? imageOptions[0];

  const selectedModelMeta = studioModels.find((m) => m.id === selectedModel);
  // #1: center label is chat-model only — image choice never shows here,
  // it only highlights inside its own image-picker dropdown.
  const composerModelLabel = selectedModelMeta?.label ?? selectedModel;

  const imageOptionsByQuality = useMemo(() => {
    const order: ImageQuality[] = ["low", "medium", "high"];
    return order
      .map((quality) => ({
        quality,
        options: imageOptions.filter((option) => option.quality === quality),
      }))
      .filter((group) => group.options.length > 0);
  }, [imageOptions]);

  const modelsByGroup = useMemo(() => {
    const groups: Array<{
      group: StudioAiModel["group"];
      models: StudioAiModel[];
    }> = [];
    for (const model of studioModels) {
      const existing = groups.find((entry) => entry.group === model.group);
      if (existing) {
        existing.models.push(model);
      } else {
        groups.push({ group: model.group, models: [model] });
      }
    }
    return groups;
  }, [studioModels]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [catalog, images] = await Promise.all([
          getStudioModels(),
          getStudioImageOptions(),
        ]);
        if (cancelled) return;
        setStudioModels(catalog.models);
        setSelectedModel(catalog.defaultModel || catalog.models[0]?.id || "gpt-4o-mini");
        setImageMode(true);
        setOpenaiConfigured(
          catalog.openaiConfigured || images.openaiConfigured,
        );
        setImageOptions(
          images.options.length ? images.options : FALLBACK_IMAGE_OPTIONS,
        );
        setImageQuality(images.defaultQuality);
        setImageSize(images.defaultSize);
      } catch {
        // Keep fallbacks.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      setChat([]);
      setChatLoading(false);
      return;
    }

    let cancelled = false;
    setChatLoading(true);

    void (async () => {
      try {
        const { chat: history } = await getChatHistory(activeId);
        if (!cancelled) setChat(history);
      } catch (error) {
        if (!cancelled) {
          toast.error(studioApiMessage(error, "Could not load chat history."));
        }
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat, chatSending, generating]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [chatInput]);

  async function createChat() {
    setCreating(true);
    try {
      const design = await addDesign({
        title: "New chat",
        method: "prompt",
        color: "#1a1e19",
      });
      setSidebarOpen(false);
      router.push(`/dashboard/studio/${design.id}`);
    } catch (error) {
      toast.error(studioApiMessage(error, "Could not create chat."));
    } finally {
      setCreating(false);
    }
  }

  async function confirmDeleteChat() {
    if (!deleteTarget) return;
    const deletingId = deleteTarget.id;
    setDeleting(true);
    try {
      await removeDesign(deletingId);
      toast.success("Chat deleted");
      setDeleteTarget(null);
      if (activeId === deletingId) {
        setChat([]);
        router.push("/dashboard/studio");
      }
    } catch (error) {
      toast.error(studioApiMessage(error, "Could not delete chat."));
    } finally {
      setDeleting(false);
    }
  }

  async function awaitGenerateJob(designId: string, jobId: string) {
    setGenerating(true);
    try {
      const job = await pollGenerateJob(designId, jobId);
      if (job.status === "failed") {
        throw new Error(job.error ?? "Generation failed.");
      }
      if (job.result?.imageUrl) {
        const imageUrl = job.result.imageUrl;
        const imageAssetId = job.result.assetId;
        setChat((current) => {
          const next = [...current];
          for (let i = next.length - 1; i >= 0; i -= 1) {
            if (next[i].role === "assistant") {
              next[i] = {
                ...next[i],
                imageUrl,
                imageAssetId,
                text:
                  next[i].text ||
                  "Here’s a design concept from your prompt.",
              };
              break;
            }
          }
          void updateDesign(designId, { chat: next });
          return next;
        });
      }
    } catch (error) {
      toast.error(studioApiMessage(error, "Could not generate image."));
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefFiles(files: FileList | null) {
    if (!files?.length || !activeId || uploadingRef) return;
    const remaining = 3 - pendingRefs.length;
    if (remaining <= 0) {
      toast.message("Up to 3 reference images per message.");
      return;
    }
    const chosen = [...files]
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining);
    if (!chosen.length) {
      toast.message("Pick a JPEG, PNG, or WebP image.");
      return;
    }
    setUploadingRef(true);
    try {
      for (const file of chosen) {
        const { asset, url } = await uploadAsset({
          blob: file,
          mime: file.type || "image/jpeg",
          name: file.name,
          designId: activeId,
        });
        setPendingRefs((prev) =>
          prev.length < 3
            ? [...prev, { assetId: asset.id, url, name: file.name }]
            : prev,
        );
      }
    } catch {
      toast.error("Could not upload reference image.");
    } finally {
      setUploadingRef(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (isListening) stopVoice();
    const text = chatInput.trim();
    if (!text || !activeId || chatSending || generating) return;
    const refIds = pendingRefs.map((r) => r.assetId);
    const refPreview = pendingRefs.map((r) => ({
      assetId: r.assetId,
      url: r.url,
    }));

    setChatInput("");
    setPendingRefs([]);
    setChatSending(true);
    setModelPickerOpen(false);
    setImagePickerOpen(false);

    const optimisticAt = new Date().toISOString();
    setChat((current) => [
      ...current,
      {
        role: "user",
        text,
        at: optimisticAt,
        ...(refPreview.length ? { attachments: refPreview } : {}),
      },
    ]);

    try {
      const { chat: nextChat, generateJobId } = await sendChat(activeId, text, {
        // Chat model always sent — in image mode it acts as prompt
        // enhancer only (option C); backend forwards to gpt-image-1.
        model: selectedModel,
        generateImage: isImageMode,
        ...(isImageMode
          ? { quality: imageQuality, size: imageSize }
          : {}),
        ...(refIds.length ? { imageAssetIds: refIds } : {}),
      });
      setChat(nextChat);
      void updateDesign(activeId, {
        chat: nextChat,
        prompt: text,
        title:
          activeDesign?.title === "New chat" ||
          activeDesign?.title === "Untitled design"
            ? text.slice(0, 48)
            : activeDesign?.title,
        method: "prompt",
      });

      if (generateJobId) {
        setChatSending(false);
        await awaitGenerateJob(activeId, generateJobId);
        return;
      }
    } catch (error) {
      setChatInput(text);
      setPendingRefs(refPreview.map((r) => ({ ...r, name: r.assetId })));
      setChat((current) =>
        current.filter(
          (m) =>
            !(m.at === optimisticAt && m.role === "user" && m.text === text),
        ),
      );
      toast.error(studioApiMessage(error, "Could not send message."));
    } finally {
      setChatSending(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#070807] text-[#c8c4b8]">
        <p className="text-sm tracking-[0.08em] uppercase">Loading studio…</p>
      </div>
    );
  }

  const busy = chatSending || generating;

  return (
    <div className="flex h-dvh overflow-hidden bg-[#070807] text-[#f3f0e8] font-[family-name:var(--font-body)]">
      {/* Mobile overlay */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close chats"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Left chat list — floating detached card on desktop */}
      {sidebarCollapsed ? (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          aria-label="Expand chats sidebar"
          title="Expand chats sidebar"
          className="mt-3 ml-3 hidden size-11 shrink-0 place-items-center self-start rounded-2xl border border-[#f3f0e8]/10 bg-[#0c0e0c] text-[#c8c4b8] shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition hover:text-[#d6ff3c] md:grid"
        >
          <PanelLeftOpen size={19} strokeWidth={2} />
        </button>
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[18.5rem] flex-col border-r border-[#f3f0e8]/10 bg-[#0c0e0c] transition-transform md:static md:m-3 md:h-[calc(100dvh-1.5rem)] md:shrink-0 md:translate-x-0 md:rounded-2xl md:border md:shadow-[0_8px_30px_rgba(0,0,0,0.45)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed && "md:hidden",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#f3f0e8]/10 px-3 py-3">
          <BrandLogo href="/dashboard" variant="onDark" size="sm" />
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-[#c8c4b8] transition hover:bg-[#f3f0e8]/8 hover:text-[#f3f0e8] md:hidden"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
          <button
            type="button"
            className="hidden size-9 place-items-center rounded-lg text-[#c8c4b8] transition hover:bg-[#f3f0e8]/8 hover:text-[#d6ff3c] md:grid"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            onClick={() => setSidebarCollapsed(true)}
          >
            <PanelLeftClose size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            disabled={creating}
            onClick={() => void createChat()}
            className="flex w-full items-center justify-center gap-2 bg-[#d6ff3c] px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-[#070807] transition hover:bg-[#e2ff6a] disabled:opacity-50"
          >
            <MessageSquarePlus size={15} strokeWidth={2.25} />
            {creating ? "Creating…" : "New chat"}
          </button>
        </div>

        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4"
          aria-label="Chats"
        >
          {sortedDesigns.length === 0 ? (
            <p className="px-2 py-4 text-sm text-[#c8c4b8]">
                No chats yet. Start one to talk through an apparel idea.
            </p>
          ) : (
            sortedDesigns.map((design) => {
              const active = design.id === activeId;
              return (
                <div
                  key={design.id}
                  className={cn(
                    "group flex items-stretch gap-1 rounded-md transition",
                    active
                      ? "bg-[#d6ff3c]/12 text-[#f3f0e8]"
                      : "text-[#c8c4b8] hover:bg-[#f3f0e8]/6 hover:text-[#f3f0e8]",
                  )}
                >
                  <Link
                    href={`/dashboard/studio/${design.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className="min-w-0 flex-1 px-3 py-2.5"
                  >
                    <p className="truncate text-sm font-medium text-[#f3f0e8]">
                      {design.title || "Untitled chat"}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[#8a867c]">
                      {chatPreview(design)}
                    </p>
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${design.title || "chat"}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDeleteTarget(design);
                    }}
                    className="mr-1 grid size-9 shrink-0 place-items-center self-center text-[#8a867c] opacity-100 transition hover:text-red-300 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 size={14} strokeWidth={2.25} />
                  </button>
                </div>
              );
            })
          )}
        </nav>

        <div className="border-t border-[#f3f0e8]/10 p-3">
          <Link
            href="/dashboard"
            className="text-xs font-semibold uppercase tracking-[0.08em] text-[#c8c4b8] hover:text-[#f3f0e8]"
          >
            ← Dashboard
          </Link>
        </div>
      </aside>

      {/* Main chat pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-[#f3f0e8]/10 px-3 py-3 md:px-5">
          <button
            type="button"
            className="grid size-10 place-items-center border border-[#f3f0e8]/20 text-[#f3f0e8] md:hidden"
            aria-label="Open chats"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em]">
              {activeDesign?.title ?? "Studio agent"}
            </p>
            <p className="text-xs text-[#c8c4b8]">
                Talk through ideas, then generate a design concept.
            </p>
          </div>
          {activeDesign ? (
            <button
              type="button"
              onClick={() => setDeleteTarget(activeDesign)}
              className="inline-flex items-center gap-1.5 border border-[#f3f0e8]/20 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[#c8c4b8] transition hover:border-red-300 hover:text-red-300"
            >
              <Trash2 size={13} strokeWidth={2.25} />
              Delete
            </button>
          ) : null}
          {!openaiConfigured ? (
            <span className="hidden text-[0.65rem] uppercase tracking-[0.1em] text-[#ff8f7a] sm:inline">
              AI offline
            </span>
          ) : null}
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-6 md:px-8">
          {!activeId ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <Sparkles className="text-[#d6ff3c]" size={28} />
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[-0.04em]">
                What should we design?
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#c8c4b8]">
                Start a chat to brainstorm apparel & merch concepts with your agent. Switch
                to image mode when you’re ready to generate artwork.
              </p>
              <button
                type="button"
                disabled={creating}
                onClick={() => void createChat()}
                className="mt-8 bg-[#d6ff3c] px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#070807] hover:bg-[#e2ff6a] disabled:opacity-50"
              >
                {creating ? "Creating…" : "New chat"}
              </button>
            </div>
          ) : chatLoading && chat.length === 0 ? (
            <p className="text-center text-sm text-[#c8c4b8]">Loading chat…</p>
          ) : chat.length === 0 ? (
            <div className="mx-auto max-w-2xl pt-16 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em]">
                Describe the vibe
              </h2>
              <p className="mt-2 text-sm text-[#c8c4b8]">
                Ask for directions, iterate on copy, or generate a design image.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-5">
              {chat.map((message, index) => {
                const isUser = message.role === "user";
                // Option C: image-mode assistant placeholders carry no text —
                // hide them until the image lands (wave indicator covers it).
                if (!isUser && !message.text && !message.imageUrl) return null;
                return (
                  <div
                    key={`${message.at}-${index}`}
                    className={cn(
                      "flex flex-col gap-1",
                      isUser ? "items-end" : "items-start",
                    )}
                  >
                    <span className="px-1 text-[0.65rem] font-medium tracking-[0.08em] text-[#8a877c] uppercase">
                      {isUser ? "You" : "Driplap"}
                    </span>
                    {isUser ? (
                      <div className="max-w-[min(100%,34rem)] rounded-2xl rounded-br-md bg-[#d6ff3c]/15 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words text-[#f3f0e8]">
                        {message.attachments?.length ? (
                          <span className="mb-2 flex flex-wrap gap-1.5">
                            {message.attachments.map((a) =>
                              a.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={a.assetId}
                                  src={a.url}
                                  alt="Reference"
                                  className="size-16 rounded-lg border border-[#f3f0e8]/20 object-cover"
                                />
                              ) : null,
                            )}
                          </span>
                        ) : null}
                        {message.text ? <p>{message.text}</p> : null}
                        <p className="mt-2 text-[0.65rem] text-[#8a867c]">
                          {formatChatTime(message.at)}
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-[min(100%,34rem)] text-sm leading-relaxed whitespace-pre-wrap break-words text-[#e8e4d8]">
                        {message.text ? <p>{message.text}</p> : null}
                        {message.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={message.imageUrl}
                            alt="Generated design concept"
                            className={cn(
                              "max-h-80 w-full rounded-xl object-contain",
                              message.text ? "mt-2" : "mt-0",
                            )}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
              {busy ? (
                <div className="flex flex-col items-start gap-2">
                  <span className="px-1 text-[0.65rem] font-medium tracking-[0.08em] text-[#8a877c] uppercase">
                    Driplap
                  </span>
                  {generating ? (
                    <div className="w-full max-w-[min(100%,34rem)]">
                      <div className="flex h-8 items-center gap-[3px]" aria-hidden>
                        {Array.from({ length: 24 }).map((_, i) => (
                          <span
                            key={i}
                            className="w-[3px] origin-center animate-pulse rounded-full bg-[#d6ff3c]/70"
                            style={{
                              height: `${8 + 14 * Math.abs(Math.sin(i / 3))}px`,
                              animationDelay: `${(i % 8) * 120}ms`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 aspect-square max-h-80 w-full animate-pulse rounded-xl bg-gradient-to-br from-[#f3f0e8]/15 via-[#d6ff3c]/10 to-[#f3f0e8]/5" />
                      <p className="mt-2 animate-pulse text-xs text-[#8a877c]">
                        Composing design…
                      </p>
                    </div>
                  ) : (
                    <p className="animate-pulse text-sm text-[#8a877c]">
                      Thinking…
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {activeId ? (
          <div className="shrink-0 px-3 pb-5 pt-3 md:px-8">
            <div className="mx-auto w-[min(100%,36rem)]">
              {!openaiConfigured ? (
                <p className="mb-2 px-1 text-xs text-[#c8c4b8]">
                  Live AI needs OPENAI_API_KEY in backend/.env — using local
                  fallback replies for now.
                </p>
              ) : null}

              <form
                onSubmit={(e) => void onSubmit(e)}
                className="relative w-full rounded-2xl border border-[#f3f0e8]/14 bg-[#121511]/95 shadow-[0_0_0_1px_rgba(214,255,60,0.04),0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
              >
                {pendingRefs.length > 0 || uploadingRef ? (
                  <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
                    {pendingRefs.map((ref) => (
                      <span
                        key={ref.assetId}
                        className="relative inline-block size-14 overflow-hidden rounded-lg border border-[#d6ff3c]/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ref.url}
                          alt={ref.name}
                          className="size-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${ref.name}`}
                          onClick={() =>
                            setPendingRefs((prev) =>
                              prev.filter((r) => r.assetId !== ref.assetId),
                            )
                          }
                          className="absolute top-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-black/70 text-white hover:bg-black/90"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {uploadingRef ? (
                      <span className="animate-pulse px-1 text-xs text-[#8a877c]">
                        Uploading…
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={2}
                  disabled={busy}
                  placeholder={
                    isListening
                      ? "Listening… speak now"
                      : isImageMode
                        ? "Describe the design to generate…"
                        : "Ask about your design…"
                  }
                  className="min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.95rem] leading-relaxed text-[#f3f0e8] outline-none placeholder:text-[#8a877c] disabled:cursor-not-allowed disabled:opacity-50"
                />

                <div className="flex items-center justify-between gap-3 px-2.5 pb-2.5 pt-1">
                  <div className="relative flex items-center gap-0.5">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      aria-label="Upload reference images"
                      onChange={(e) => void handleRefFiles(e.target.files)}
                    />
                    <button
                      type="button"
                      aria-label="Add reference images"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={busy || uploadingRef}
                      className={cn(
                        "grid size-8 place-items-center rounded-lg transition",
                        pendingRefs.length
                          ? "bg-[#d6ff3c]/15 text-[#d6ff3c]"
                          : "text-[#f3f0e8]/80 hover:bg-[#f3f0e8]/8 hover:text-[#d6ff3c]",
                      )}
                    >
                      <Plus size={18} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      aria-label="Choose image model"
                      aria-expanded={imagePickerOpen}
                      aria-pressed={isImageMode}
                      onClick={() => {
                        setImagePickerOpen((open) => !open);
                        setModelPickerOpen(false);
                      }}
                      className={cn(
                        "grid size-8 place-items-center rounded-lg transition",
                        isImageMode
                          ? "bg-[#d6ff3c]/15 text-[#d6ff3c]"
                          : "text-[#c8c4b8] hover:bg-[#f3f0e8]/8 hover:text-[#d6ff3c]",
                      )}
                    >
                      <ImageIcon size={16} strokeWidth={2} />
                    </button>
                    {imagePickerOpen ? (
                      <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-40 max-h-[min(16rem,42vh)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-[#f3f0e8]/14 bg-[#121511] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                        <p className="px-2 pb-1 text-[0.65rem] font-semibold tracking-[0.12em] text-[#8a877c] uppercase">
                          Image models
                        </p>
                        <p className="px-2 pb-1.5 text-[0.7rem] text-[#8a877c]">
                          gpt-image-1 — pick a price, then describe the design
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setImageMode(false);
                            setImagePickerOpen(false);
                          }}
                          className={cn(
                            "mb-1.5 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition",
                            !isImageMode
                              ? "bg-[#d6ff3c]/12 text-[#d6ff3c]"
                              : "text-[#f3f0e8] hover:bg-[#f3f0e8]/8",
                          )}
                        >
                          <span>Chat only (no image)</span>
                        </button>
                        {imageOptionsByQuality.map(({ quality, options }) => (
                          <div key={quality} className="mb-1.5 last:mb-0">
                            <p className="px-2 pb-0.5 text-[0.6rem] tracking-[0.1em] text-[#8a877c] uppercase">
                              {quality}
                            </p>
                            {options.map((option) => {
                              const active =
                                isImageMode &&
                                option.quality === imageQuality &&
                                option.size === imageSize;
                              return (
                                <button
                                  key={`${option.quality}-${option.size}`}
                                  type="button"
                                  onClick={() => {
                                    setImageQuality(option.quality);
                                    setImageSize(option.size);
                                    setImageMode(true);
                                    setImagePickerOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition",
                                    active
                                      ? "bg-[#d6ff3c]/12 text-[#d6ff3c]"
                                      : "text-[#f3f0e8] hover:bg-[#f3f0e8]/8",
                                  )}
                                >
                                  <span>{option.size}</span>
                                  <span className="text-[0.7rem] text-[#8a877c]">
                                    ${option.priceUsd.toFixed(3)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="relative flex items-center gap-0.5 sm:gap-1">
                    {modelPickerOpen ? (
                      <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-40 max-h-[min(16rem,42vh)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-[#f3f0e8]/14 bg-[#121511] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                        {modelsByGroup.map(({ group, models }) => (
                          <div key={group} className="mb-2 last:mb-0">
                            <p className="px-2 pb-1 text-[0.65rem] font-semibold tracking-[0.12em] text-[#8a877c] uppercase">
                              {group}
                            </p>
                            {models.map((model) => {
                              const active = model.id === selectedModel;
                              return (
                                <button
                                  key={model.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedModel(model.id);
                                    setModelPickerOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full flex-col items-start rounded-lg px-2 py-1.5 text-left transition",
                                    active
                                      ? "bg-[#d6ff3c]/12 text-[#d6ff3c]"
                                      : "text-[#f3f0e8] hover:bg-[#f3f0e8]/8",
                                  )}
                                >
                                  <span className="text-sm font-medium">
                                    {model.label}
                                  </span>
                                  <span className="text-[0.7rem] text-[#8a877c]">
                                    {model.description}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setModelPickerOpen((open) => !open);
                        setImagePickerOpen(false);
                      }}
                      className="inline-flex max-w-[14rem] items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-[#f3f0e8] transition hover:bg-[#f3f0e8]/8"
                      aria-label="Choose chat model"
                      aria-expanded={modelPickerOpen}
                    >
                      <span className="truncate">{composerModelLabel}</span>
                      <ChevronDown size={14} strokeWidth={2} />
                    </button>
                    {isListening ? (
                      <VoiceWaveform active={isListening} stream={voiceStream} />
                    ) : null}
                    <button
                      type="button"
                      aria-label={isListening ? "Stop voice input" : "Start voice input"}
                      aria-pressed={isListening}
                      onClick={handleVoiceToggle}
                      disabled={busy}
                      className={cn(
                        "grid size-8 place-items-center rounded-lg transition",
                        isListening
                          ? "bg-[#d6ff3c]/15 text-[#d6ff3c]"
                          : "text-[#c8c4b8] hover:bg-[#f3f0e8]/8 hover:text-[#d6ff3c]",
                      )}
                    >
                      <AudioLines size={16} strokeWidth={2} />
                    </button>
                    <button
                      type="submit"
                      aria-label="Send prompt"
                      disabled={busy || !chatInput.trim()}
                      className="grid size-8 place-items-center rounded-lg text-[#d6ff3c] transition hover:bg-[#d6ff3c]/15 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Send size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete this chat?"
        description={
          deleteTarget ? (
            <>
              This permanently deletes{" "}
              <span className="text-[#f3f0e8]">
                {deleteTarget.title || "Untitled chat"}
              </span>{" "}
              and its messages. This cannot be undone.
            </>
          ) : (
            "This permanently deletes the chat and its messages."
          )
        }
        confirmLabel="Delete chat"
        cancelLabel="Keep chat"
        tone="danger"
        confirming={deleting}
        onConfirm={() => void confirmDeleteChat()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
