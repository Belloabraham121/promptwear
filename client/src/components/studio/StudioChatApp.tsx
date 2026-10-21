"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AudioLines,
  ChevronDown,
  Image as ImageIcon,
  Menu,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
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
import { BrandLogo, BrandMark } from "@/components/brand/BrandLogo";
import { BrandButton, Kicker } from "@/components/brand/ui";
import { Bone } from "@/components/dashboard/Skeletons";
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
      <div className="flex min-h-dvh items-center justify-center bg-bone text-mute">
        <p className="text-sm tracking-[0.08em] uppercase">Loading studio…</p>
      </div>
    );
  }

  const busy = chatSending || generating;

  return (
    <div className="flex h-dvh overflow-hidden bg-bone text-ink font-sans">
      {/* Mobile overlay */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close chats"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/*
        Chat list. Desktop: flat paper column that collapses to an icon rail
        (same behaviour as the dashboard sidebar). Mobile: slide-over drawer.
      */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[18.5rem] flex-col overflow-hidden border-r border-ink/12 bg-paper transition-[transform,width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none md:static md:h-dvh md:shrink-0 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "md:w-[4.5rem]" : "md:w-[18.5rem]",
        )}
      >
        <div
          className={cn(
            "flex gap-2 pt-5",
            sidebarCollapsed ? "md:flex-col md:items-center md:px-0" : "",
            "items-center justify-between px-5",
          )}
        >
          {sidebarCollapsed ? (
            <>
              <span className="md:hidden">
                <BrandLogo href="/dashboard" size="md" />
              </span>
              <span className="hidden md:inline-flex">
                <BrandMark href="/dashboard" label="Back to dashboard" />
              </span>
            </>
          ) : (
            <BrandLogo href="/dashboard" size="md" />
          )}
          <button
            type="button"
            className="grid size-9 place-items-center text-mute transition-colors hover:bg-ink/5 hover:text-ink md:hidden"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
          <button
            type="button"
            className={cn(
              "hidden size-9 place-items-center text-mute transition-colors hover:bg-ink/5 hover:text-ink md:grid",
              sidebarCollapsed && "md:mt-2",
            )}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} strokeWidth={2} />
            ) : (
              <PanelLeftClose size={18} strokeWidth={2} />
            )}
          </button>
        </div>
        <Kicker
          className={cn(
            "mt-3 px-5 whitespace-nowrap text-olive",
            sidebarCollapsed && "md:hidden",
          )}
        >
          Studio · Chats
        </Kicker>

        <div className={cn("p-5 pb-4", sidebarCollapsed && "md:flex md:justify-center md:px-0")}>
          <button
            type="button"
            disabled={creating}
            onClick={() => void createChat()}
            title={sidebarCollapsed ? "New chat" : undefined}
            className={cn(
              "flex w-full items-center justify-center gap-2 bg-lime px-3 py-3 text-[0.7rem] font-bold tracking-[0.16em] whitespace-nowrap text-ink uppercase transition-colors hover:bg-ink hover:text-lime disabled:opacity-50",
              sidebarCollapsed && "md:size-10 md:p-0",
            )}
          >
            <MessageSquarePlus size={15} strokeWidth={2.25} aria-hidden />
            <span className={cn(sidebarCollapsed && "md:sr-only")}>
              {creating ? "Creating…" : "New chat"}
            </span>
          </button>
        </div>

        <nav
          className={cn(
            "min-h-0 flex-1 overflow-y-auto border-t border-ink/12",
            sidebarCollapsed && "md:invisible",
          )}
          aria-label="Chats"
        >
          {sortedDesigns.length === 0 ? (
            <p className="px-5 py-4 text-sm text-mute">
              No chats yet. Start one to talk through an apparel idea.
            </p>
          ) : (
            sortedDesigns.map((design) => {
              const active = design.id === activeId;
              return (
                <div
                  key={design.id}
                  className={cn(
                    "group flex items-stretch gap-1 border-b border-ink/12 transition-colors",
                    active ? "bg-ink text-bone" : "text-ink hover:bg-ink/5",
                  )}
                >
                  <Link
                    href={`/dashboard/studio/${design.id}`}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className="min-w-0 flex-1 py-3.5 pl-5"
                  >
                    <p className="m-0 truncate font-heading text-[0.95rem] font-bold tracking-[-0.02em]">
                      {design.title || "Untitled chat"}
                    </p>
                    <p
                      className={cn(
                        "mt-1 mb-0 line-clamp-1 text-xs",
                        active ? "text-mist" : "text-mute",
                      )}
                    >
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
                    className={cn(
                      "mr-2 grid size-9 shrink-0 place-items-center self-center opacity-100 transition hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
                      active ? "text-mist" : "text-mute",
                    )}
                  >
                    <Trash2 size={14} strokeWidth={2.25} />
                  </button>
                </div>
              );
            })
          )}
        </nav>

        <div className={cn("border-t border-ink/12 p-5", sidebarCollapsed && "md:flex md:justify-center md:px-0")}>
          <Link
            href="/dashboard"
            title={sidebarCollapsed ? "Back to dashboard" : undefined}
            className="inline-flex items-center gap-1.5 border-b border-current pb-0.5 text-[0.66rem] font-semibold tracking-[0.18em] whitespace-nowrap text-mute uppercase transition-colors hover:text-ink"
          >
            <ArrowLeft size={13} strokeWidth={2.25} aria-hidden />
            <span className={cn(sidebarCollapsed && "md:sr-only")}>Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main chat pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-ink/12 px-4 py-4 md:px-8">
          <button
            type="button"
            className="grid size-10 place-items-center border border-ink/15 text-ink md:hidden"
            aria-label="Open chats"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <Kicker className="text-olive">{activeDesign ? "Studio chat" : "Studio"}</Kicker>
            <p className="mt-1.5 mb-0 truncate font-heading text-[1.35rem] leading-none font-extrabold tracking-[-0.04em]">
              {activeDesign?.title ?? "Studio agent"}
            </p>
          </div>
          {activeDesign ? (
            <button
              type="button"
              onClick={() => setDeleteTarget(activeDesign)}
              className="inline-flex items-center gap-1.5 border border-ink/15 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-mute transition hover:border-red-400 hover:text-red-600"
            >
              <Trash2 size={13} strokeWidth={2.25} />
              Delete
            </button>
          ) : null}
          {!openaiConfigured ? (
            <span className="hidden text-[0.65rem] uppercase tracking-[0.1em] text-red-700 sm:inline">
              AI offline
            </span>
          ) : null}
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-6 md:px-8">
          {!activeId ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <div aria-hidden className="flex items-end justify-center">
                {["hero-cutout-02.png", "hero-cutout-01.png", "hero-cutout-05.png"].map((file, i) => (
                  <Image
                    key={file}
                    src={`/landing/v2/${file}`}
                    alt=""
                    width={240}
                    height={256}
                    className={cn(
                      "h-auto w-24 drop-shadow-[0_16px_20px_rgba(7,8,7,0.2)] sm:w-28",
                      i === 0 && "-mr-5 rotate-[-9deg]",
                      i === 1 && "relative z-10 -mb-1",
                      i === 2 && "-ml-5 rotate-[9deg]",
                    )}
                  />
                ))}
              </div>
              <Kicker className="mt-8 text-olive">Studio agent</Kicker>
              <h1 className="mt-4 mb-0 font-heading text-[clamp(2.4rem,5vw,3.8rem)] leading-[0.92] font-extrabold tracking-[-0.055em]">
                What should we design?
              </h1>
              <p className="mt-4 mb-0 max-w-md text-[0.95rem] leading-relaxed text-mute">
                Start a chat to brainstorm apparel and merch with your agent. Switch to image mode
                when you’re ready to generate artwork.
              </p>
              <BrandButton
                disabled={creating}
                onClick={() => void createChat()}
                className="mt-8"
              >
                {creating ? "Creating…" : "New chat"}
              </BrandButton>
            </div>
          ) : chatLoading && chat.length === 0 ? (
            <ChatSkeleton />
          ) : chat.length === 0 ? (
            <div className="mx-auto max-w-2xl pt-16 text-center">
              <Kicker className="justify-center text-olive">New chat</Kicker>
              <h2 className="mt-4 mb-0 font-heading text-[clamp(2rem,4vw,2.8rem)] leading-[0.95] font-extrabold tracking-[-0.05em]">
                Describe the vibe.
              </h2>
              <p className="mt-3 mb-0 text-[0.95rem] text-mute">
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
                    <span
                      className={cn(
                        "px-0.5 text-[0.62rem] font-semibold tracking-[0.2em] uppercase",
                        isUser ? "text-mute" : "text-olive",
                      )}
                    >
                      {isUser ? "You" : "Driplab"}
                    </span>
                    {isUser ? (
                      <div className="max-w-[min(100%,34rem)] bg-lime px-4 py-3 text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words text-ink">
                        {message.attachments?.length ? (
                          <span className="mb-2 flex flex-wrap gap-1.5">
                            {message.attachments.map((a) =>
                              a.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={a.assetId}
                                  src={a.url}
                                  alt="Reference"
                                  className="size-16 border border-ink/15 object-cover"
                                />
                              ) : null,
                            )}
                          </span>
                        ) : null}
                        {message.text ? <p>{message.text}</p> : null}
                        <p className="mt-2 text-[0.62rem] tracking-[0.08em] text-ink/55 uppercase">
                          {formatChatTime(message.at)}
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-[min(100%,34rem)] border-l-2 border-ink pl-4 text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words text-ink">
                        {message.text ? <p>{message.text}</p> : null}
                        {message.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={message.imageUrl}
                            alt="Generated design concept"
                            className={cn(
                              "max-h-80 w-full object-contain",
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
                  <span className="px-0.5 text-[0.62rem] font-semibold tracking-[0.2em] text-olive uppercase">
                    Driplab
                  </span>
                  {generating ? (
                    <div className="w-full max-w-[min(100%,34rem)]">
                      <div className="flex h-8 items-center gap-[3px]" aria-hidden>
                        {Array.from({ length: 24 }).map((_, i) => (
                          <span
                            key={i}
                            className="w-[3px] origin-center animate-pulse rounded-full bg-ink/50"
                            style={{
                              height: `${8 + 14 * Math.abs(Math.sin(i / 3))}px`,
                              animationDelay: `${(i % 8) * 120}ms`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 aspect-square max-h-80 w-full animate-pulse bg-gradient-to-br from-ink/10 via-lime/40 to-ink/5" />
                      <p className="mt-2 animate-pulse text-xs text-mute">
                        Composing design…
                      </p>
                    </div>
                  ) : (
                    <p className="animate-pulse text-sm text-mute">
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
                <p className="mb-2 px-1 text-xs text-mute">
                  Live AI needs OPENAI_API_KEY in backend/.env — using local
                  fallback replies for now.
                </p>
              ) : null}

              <form
                onSubmit={(e) => void onSubmit(e)}
                className="relative w-full border border-ink/20 bg-paper transition-colors focus-within:border-ink"
              >
                {pendingRefs.length > 0 || uploadingRef ? (
                  <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
                    {pendingRefs.map((ref) => (
                      <span
                        key={ref.assetId}
                        className="relative inline-block size-14 overflow-hidden border border-ink/15"
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
                          className="absolute top-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-black/70 text-bone hover:bg-black/90"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {uploadingRef ? (
                      <span className="animate-pulse px-1 text-xs text-mute">
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
                  className="min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.95rem] leading-relaxed text-ink outline-none placeholder:text-mute disabled:cursor-not-allowed disabled:opacity-50"
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
                        "grid size-8 place-items-center transition",
                        pendingRefs.length
                          ? "bg-ink text-bone"
                          : "text-ink/70 hover:bg-ink/5 hover:text-ink",
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
                        "grid size-8 place-items-center transition",
                        isImageMode
                          ? "bg-ink text-bone"
                          : "text-mute hover:bg-ink/5 hover:text-ink",
                      )}
                    >
                      <ImageIcon size={16} strokeWidth={2} />
                    </button>
                    {imagePickerOpen ? (
                      <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-40 max-h-[min(16rem,42vh)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain border border-ink/10 bg-paper p-2">
                        <p className="px-2 pb-1 text-[0.65rem] font-semibold tracking-[0.12em] text-mute uppercase">
                          Image models
                        </p>
                        <p className="px-2 pb-1.5 text-[0.7rem] text-mute">
                          gpt-image-1 — pick a price, then describe the design
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setImageMode(false);
                            setImagePickerOpen(false);
                          }}
                          className={cn(
                            "mb-1.5 flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm transition",
                            !isImageMode
                              ? "bg-ink/[0.06] text-ink"
                              : "text-ink hover:bg-ink/5",
                          )}
                        >
                          <span>Chat only (no image)</span>
                        </button>
                        {imageOptionsByQuality.map(({ quality, options }) => (
                          <div key={quality} className="mb-1.5 last:mb-0">
                            <p className="px-2 pb-0.5 text-[0.6rem] tracking-[0.1em] text-mute uppercase">
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
                                    "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm transition",
                                    active
                                      ? "bg-ink/[0.06] text-ink"
                                      : "text-ink hover:bg-ink/5",
                                  )}
                                >
                                  <span>{option.size}</span>
                                  <span className="text-[0.7rem] text-mute">
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
                      <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-40 max-h-[min(16rem,42vh)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain border border-ink/10 bg-paper p-2">
                        {modelsByGroup.map(({ group, models }) => (
                          <div key={group} className="mb-2 last:mb-0">
                            <p className="px-2 pb-1 text-[0.65rem] font-semibold tracking-[0.12em] text-mute uppercase">
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
                                    "flex w-full flex-col items-start px-2 py-1.5 text-left transition",
                                    active
                                      ? "bg-ink/[0.06] text-ink"
                                      : "text-ink hover:bg-ink/5",
                                  )}
                                >
                                  <span className="text-sm font-medium">
                                    {model.label}
                                  </span>
                                  <span className="text-[0.7rem] text-mute">
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
                      className="inline-flex max-w-[14rem] items-center gap-1 px-2 py-1.5 text-sm text-ink transition hover:bg-ink/5"
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
                        "grid size-8 place-items-center transition",
                        isListening
                          ? "bg-ink text-bone"
                          : "text-mute hover:bg-ink/5 hover:text-ink",
                      )}
                    >
                      <AudioLines size={16} strokeWidth={2} />
                    </button>
                    <button
                      type="submit"
                      aria-label="Send prompt"
                      disabled={busy || !chatInput.trim()}
                      className="grid size-9 place-items-center bg-ink text-bone transition-colors hover:bg-lime hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
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
              <span className="text-ink">
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

/** Placeholder conversation while a chat's messages load. */
function ChatSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading chat" className="mx-auto flex max-w-2xl flex-col gap-6">
      <span className="sr-only">Loading chat…</span>
      <div className="flex flex-col items-end gap-1.5">
        <Bone className="h-2.5 w-8" />
        <Bone className="h-14 w-[min(70%,22rem)] bg-lime/40" />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <Bone className="h-2.5 w-14" />
        <div className="w-[min(85%,30rem)] space-y-2 border-l-2 border-ink/15 pl-4">
          <Bone className="h-3.5 w-full" />
          <Bone className="h-3.5 w-11/12" />
          <Bone className="h-3.5 w-2/3" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Bone className="h-2.5 w-8" />
        <Bone className="h-10 w-[min(55%,16rem)] bg-lime/40" />
      </div>
    </div>
  );
}
