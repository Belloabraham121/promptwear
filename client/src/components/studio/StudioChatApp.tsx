"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ImagePlus,
  Menu,
  MessageSquarePlus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
  const { ready, designs, addDesign, updateDesign } = useDashboard();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [chat, setChat] = useState<DesignChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [studioModels, setStudioModels] = useState<StudioAiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState(STUDIO_IMAGE_MODEL_ID);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [imageOptions, setImageOptions] = useState<StudioImageOption[]>(
    FALLBACK_IMAGE_OPTIONS,
  );
  const [imageQuality, setImageQuality] = useState<ImageQuality>("medium");
  const [imageSize, setImageSize] = useState<ImageSize>("1024x1024");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const isImageMode = selectedModel === STUDIO_IMAGE_MODEL_ID;
  const selectedImageOption =
    imageOptions.find(
      (o) => o.quality === imageQuality && o.size === imageSize,
    ) ?? imageOptions[0];

  const selectedModelLabel = isImageMode
    ? "Image · gpt-image-1"
    : (studioModels.find((m) => m.id === selectedModel)?.label ??
      selectedModel);

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
        setSelectedModel(STUDIO_IMAGE_MODEL_ID);
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
                  "Here’s a print concept from your prompt.",
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || !activeId || chatSending || generating) return;

    setChatInput("");
    setChatSending(true);
    setModelPickerOpen(false);

    const optimisticAt = new Date().toISOString();
    setChat((current) => [
      ...current,
      { role: "user", text, at: optimisticAt },
    ]);

    try {
      const { chat: nextChat, generateJobId } = await sendChat(activeId, text, {
        ...(isImageMode ? {} : { model: selectedModel }),
        generateImage: isImageMode,
        ...(isImageMode
          ? { quality: imageQuality, size: imageSize }
          : {}),
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

      {/* Left chat list */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[18.5rem] flex-col border-r border-[#f3f0e8]/10 bg-[#0c0e0c] transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#f3f0e8]/10 px-3 py-3">
          <BrandLogo href="/dashboard" variant="onDark" size="sm" />
          <button
            type="button"
            className="grid size-9 place-items-center text-[#c8c4b8] md:hidden"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
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
              No chats yet. Start one to talk through a tee idea.
            </p>
          ) : (
            sortedDesigns.map((design) => {
              const active = design.id === activeId;
              return (
                <Link
                  key={design.id}
                  href={`/dashboard/studio/${design.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 transition",
                    active
                      ? "bg-[#d6ff3c]/12 text-[#f3f0e8]"
                      : "text-[#c8c4b8] hover:bg-[#f3f0e8]/6 hover:text-[#f3f0e8]",
                  )}
                >
                  <p className="truncate text-sm font-medium text-[#f3f0e8]">
                    {design.title || "Untitled chat"}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-[#8a867c]">
                    {chatPreview(design)}
                  </p>
                </Link>
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
              Talk through ideas, then generate a print concept.
            </p>
          </div>
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
                Start a chat to brainstorm tee concepts with your agent. Switch
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
                Ask for directions, iterate on copy, or generate a print image.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-5">
              {chat.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={`${message.at}-${index}`}
                    className={cn(
                      "flex",
                      isUser ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[min(100%,34rem)] px-4 py-3 text-sm leading-relaxed",
                        isUser
                          ? "bg-[#d6ff3c] text-[#070807]"
                          : "border border-[#f3f0e8]/12 bg-[#0c0e0c] text-[#f3f0e8]",
                      )}
                    >
                      {message.text ? <p className="whitespace-pre-wrap">{message.text}</p> : null}
                      {message.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={message.imageUrl}
                          alt="Generated print concept"
                          className={cn(
                            "mt-3 max-h-80 w-full object-contain",
                            message.text ? "" : "mt-0",
                          )}
                        />
                      ) : null}
                      <p
                        className={cn(
                          "mt-2 text-[0.65rem]",
                          isUser ? "text-[#070807]/60" : "text-[#8a867c]",
                        )}
                      >
                        {formatChatTime(message.at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {busy ? (
                <p className="text-sm text-[#c8c4b8]">
                  {generating ? "Generating image…" : "Thinking…"}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {activeId ? (
          <div className="shrink-0 border-t border-[#f3f0e8]/10 px-3 py-3 md:px-8 md:py-4">
            <form
              onSubmit={(e) => void onSubmit(e)}
              className="mx-auto max-w-2xl"
            >
              <div className="relative mb-2">
                <button
                  type="button"
                  onClick={() => setModelPickerOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 border border-[#f3f0e8]/15 bg-[#0c0e0c] px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[#c8c4b8] transition hover:border-[#d6ff3c] hover:text-[#d6ff3c]"
                >
                  {isImageMode ? (
                    <ImagePlus size={13} strokeWidth={2.25} />
                  ) : (
                    <Sparkles size={13} strokeWidth={2.25} />
                  )}
                  {selectedModelLabel}
                  <ChevronDown size={13} />
                </button>

                {modelPickerOpen ? (
                  <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-20 w-[min(100vw-2rem,20rem)] border border-[#f3f0e8]/15 bg-[#0c0e0c] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
                    <p className="px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-[#8a867c]">
                      Generate
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModel(STUDIO_IMAGE_MODEL_ID);
                        setModelPickerOpen(false);
                      }}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-2 py-2 text-left text-sm transition hover:bg-[#f3f0e8]/6",
                        isImageMode ? "text-[#d6ff3c]" : "text-[#f3f0e8]",
                      )}
                    >
                      <span className="font-medium">Image · gpt-image-1</span>
                      <span className="text-xs text-[#8a867c]">
                        Generate a print concept from your prompt
                      </span>
                    </button>

                    {isImageMode ? (
                      <div className="mt-1 space-y-1 border-t border-[#f3f0e8]/10 pt-2">
                        {imageOptions.map((option) => {
                          const selected =
                            option.quality === imageQuality &&
                            option.size === imageSize;
                          return (
                            <button
                              key={`${option.quality}-${option.size}`}
                              type="button"
                              onClick={() => {
                                setImageQuality(option.quality);
                                setImageSize(option.size);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between px-2 py-1.5 text-left text-xs transition hover:bg-[#f3f0e8]/6",
                                selected ? "text-[#d6ff3c]" : "text-[#c8c4b8]",
                              )}
                            >
                              <span>{option.label}</span>
                              <span>${option.priceUsd.toFixed(3)}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <p className="mt-2 px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-[#8a867c]">
                      Chat models
                    </p>
                    {studioModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model.id);
                          setModelPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 px-2 py-2 text-left text-sm transition hover:bg-[#f3f0e8]/6",
                          selectedModel === model.id
                            ? "text-[#d6ff3c]"
                            : "text-[#f3f0e8]",
                        )}
                      >
                        <span className="font-medium">{model.label}</span>
                        <span className="text-xs text-[#8a867c]">
                          {model.description}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex items-end gap-2 border border-[#f3f0e8]/15 bg-[#0c0e0c] p-2">
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void onSubmit(e);
                    }
                  }}
                  rows={1}
                  placeholder={
                    isImageMode
                      ? "Describe the print to generate…"
                      : "Message the studio agent…"
                  }
                  disabled={busy}
                  className="min-h-[2.75rem] max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#f3f0e8] outline-none placeholder:text-[#8a867c] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={busy || !chatInput.trim()}
                  className="grid size-10 shrink-0 place-items-center bg-[#d6ff3c] text-[#070807] transition hover:bg-[#e2ff6a] disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send size={16} strokeWidth={2.25} />
                </button>
              </div>
              {isImageMode && selectedImageOption ? (
                <p className="mt-2 text-[0.7rem] text-[#8a867c]">
                  Image mode · {selectedImageOption.label} · $
                  {selectedImageOption.priceUsd.toFixed(3)}
                </p>
              ) : (
                <p className="mt-2 text-[0.7rem] text-[#8a867c]">
                  Enter to send · Shift+Enter for a new line
                </p>
              )}
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
