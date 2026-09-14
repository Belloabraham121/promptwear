import { api } from "@/lib/api/client";
import type { DesignChatMessage } from "@/lib/api/designs";
import type { PatternPanel } from "@/lib/dashboard/types";

export type ChatHistoryResponse = {
  chat: DesignChatMessage[];
};

export type SendChatResponse = {
  reply: DesignChatMessage;
  chat: DesignChatMessage[];
  model: string;
  generateJobId?: string;
};

export type StudioAiModelFamily = "chat" | "reasoning";

export type StudioAiModel = {
  id: string;
  label: string;
  description: string;
  family: StudioAiModelFamily;
  group: "Latest" | "GPT-4" | "Reasoning";
};

/** Composer mode for print generation — not a chat-completions model. */
export const STUDIO_IMAGE_MODEL_ID = "gpt-image-1";

export type StudioModelsResponse = {
  models: StudioAiModel[];
  defaultModel: string;
  openaiConfigured: boolean;
};

export type ImageQuality = "low" | "medium" | "high";
export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";

export type StudioImageOption = {
  quality: ImageQuality;
  size: ImageSize;
  priceUsd: number;
  label: string;
};

export type StudioImageOptionsResponse = {
  model: string;
  options: StudioImageOption[];
  defaultQuality: ImageQuality;
  defaultSize: ImageSize;
  openaiConfigured: boolean;
};

export type GenerateJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type GenerateJobResult = {
  assetId: string;
  imageUrl: string;
  model: string;
  quality: ImageQuality;
  size: ImageSize;
  priceUsd: number;
};

export type GenerateJob = {
  id: string;
  designId: string;
  panel: PatternPanel;
  quality: ImageQuality;
  size: ImageSize;
  status: GenerateJobStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
  result?: GenerateJobResult;
};

export type GenerateJobResponse = {
  jobId: string;
};

export type GetGenerateJobResponse = {
  job: GenerateJob;
};

export function getStudioModels() {
  return api.get<StudioModelsResponse>("/studio/models");
}

export function getStudioImageOptions() {
  return api.get<StudioImageOptionsResponse>("/studio/image-options");
}

export function getChatHistory(designId: string) {
  return api.get<ChatHistoryResponse>(`/designs/${designId}/chat`);
}

export function sendChat(
  designId: string,
  message: string,
  options?: {
    model?: string;
    generateImage?: boolean;
    quality?: ImageQuality;
    size?: ImageSize;
    imageAssetIds?: string[];
  },
) {
  return api.post<SendChatResponse>(`/designs/${designId}/chat`, {
    text: message,
    ...(options?.model ? { model: options.model } : {}),
    ...(options?.generateImage ? { generateImage: true } : {}),
    ...(options?.quality ? { quality: options.quality } : {}),
    ...(options?.size ? { size: options.size } : {}),
    ...(options?.imageAssetIds?.length
      ? { imageAssetIds: options.imageAssetIds }
      : {}),
  });
}

export function startGenerate(
  designId: string,
  options?: {
    panel?: PatternPanel;
    quality?: ImageQuality;
    size?: ImageSize;
  },
) {
  return api.post<GenerateJobResponse>(`/designs/${designId}/generate`, {
    ...(options?.panel ? { panel: options.panel } : {}),
    ...(options?.quality ? { quality: options.quality } : {}),
    ...(options?.size ? { size: options.size } : {}),
  });
}

export function getGenerateJob(designId: string, jobId: string) {
  return api.get<GetGenerateJobResponse>(
    `/designs/${designId}/generate/${jobId}`,
  );
}

export type PollGenerateJobOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (job: GenerateJob) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll a generate job until it completes, fails, or times out. */
export async function pollGenerateJob(
  designId: string,
  jobId: string,
  options?: PollGenerateJobOptions,
): Promise<GenerateJob> {
  const intervalMs = options?.intervalMs ?? 1_000;
  const timeoutMs = options?.timeoutMs ?? 180_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { job } = await getGenerateJob(designId, jobId);
    options?.onProgress?.(job);

    if (job.status === "completed" || job.status === "failed") {
      return job;
    }

    await sleep(intervalMs);
  }

  throw new Error("Generation timed out. Try again in a moment.");
}
