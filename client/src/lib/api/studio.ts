import { api } from "@/lib/api/client";
import type { DesignChatMessage } from "@/lib/api/designs";
import type { PatternPanel } from "@/lib/dashboard/types";

export type ChatHistoryResponse = {
  chat: DesignChatMessage[];
};

export type SendChatResponse = {
  reply: DesignChatMessage;
  chat: DesignChatMessage[];
};

export type GenerateJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type GenerateJob = {
  id: string;
  designId: string;
  panel: PatternPanel;
  status: GenerateJobStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
};

export type GenerateJobResponse = {
  jobId: string;
};

export type GetGenerateJobResponse = {
  job: GenerateJob;
};

export function getChatHistory(designId: string) {
  return api.get<ChatHistoryResponse>(`/designs/${designId}/chat`);
}

export function sendChat(designId: string, message: string) {
  return api.post<SendChatResponse>(`/designs/${designId}/chat`, {
    text: message,
  });
}

export function startGenerate(designId: string, panel?: PatternPanel) {
  const body = panel ? { panel } : {};
  return api.post<GenerateJobResponse>(`/designs/${designId}/generate`, body);
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
  const intervalMs = options?.intervalMs ?? 500;
  const timeoutMs = options?.timeoutMs ?? 60_000;
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
