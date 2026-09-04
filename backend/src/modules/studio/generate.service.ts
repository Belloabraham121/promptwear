import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { StorageService } from '../assets/storage.service';
import { normalizeChat } from '../designs/design.mapper';
import { PatternPanel } from '../designs/design.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  findImageOption,
  ImageQuality,
  ImageSize,
  resolveImageQuality,
  resolveImageSize,
  STUDIO_IMAGE_MODEL,
  STUDIO_IMAGE_OPTIONS,
  StudioImageOption,
} from './openai-image';
import { PANEL_LABELS } from './studio.constants';

export type GenerateJobResponse = {
  jobId: string;
};

export type GenerateJobResult = {
  assetId: string;
  imageUrl: string;
  model: string;
  quality: ImageQuality;
  size: ImageSize;
  priceUsd: number;
};

type GenerateJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type GenerateJob = {
  id: string;
  designId: string;
  userId: string;
  panel: PatternPanel;
  quality: ImageQuality;
  size: ImageSize;
  status: GenerateJobStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
  result?: GenerateJobResult;
};

type OpenAiImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

const MAX_PENDING_JOBS_PER_USER = 3;
const JOB_RETENTION_MS = 60 * 60 * 1_000;
const JOB_TIMEOUT_MS = 3 * 60 * 1_000;
const DOWNLOAD_TTL_SECONDS = 3_600;
const OPENAI_IMAGE_TIMEOUT_MS = 120_000;

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);
  private readonly jobs = new Map<string, GenerateJob>();
  private readonly jobTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  listImageOptions(): {
    model: string;
    options: StudioImageOption[];
    defaultQuality: ImageQuality;
    defaultSize: ImageSize;
    openaiConfigured: boolean;
  } {
    return {
      model: STUDIO_IMAGE_MODEL,
      options: [...STUDIO_IMAGE_OPTIONS],
      defaultQuality: 'medium',
      defaultSize: '1024x1024',
      openaiConfigured: Boolean(this.configService.get<string>('openai.apiKey')),
    };
  }

  async enqueue(
    userId: string,
    designId: string,
    panel?: PatternPanel,
    qualityRaw?: string,
    sizeRaw?: string,
  ): Promise<GenerateJobResponse> {
    const design = await this.prisma.design.findFirst({
      where: { id: designId, userId },
    });

    if (!design) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Design not found',
        HttpStatus.NOT_FOUND,
      );
    }

    this.failStuckJobs(userId);

    if (this.countActiveJobs(userId) >= MAX_PENDING_JOBS_PER_USER) {
      throw new AppException(
        ErrorCodes.RATE_LIMIT,
        'Too many active generation jobs. Wait for the current print to finish.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.pruneExpiredJobs();

    const quality = resolveImageQuality(qualityRaw);
    const size = resolveImageSize(sizeRaw);
    const targetPanel = (panel ?? design.activePanel) as PatternPanel;
    const jobId = randomUUID();
    const job: GenerateJob = {
      id: jobId,
      designId,
      userId,
      panel: targetPanel,
      quality,
      size,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    setTimeout(() => {
      void this.processJob(jobId);
    }, 250);

    return { jobId };
  }

  getJob(
    userId: string,
    designId: string,
    jobId: string,
  ): GenerateJob | null {
    const job = this.jobs.get(jobId);
    if (!job || job.userId !== userId || job.designId !== designId) {
      return null;
    }
    return job;
  }

  private failStuckJobs(userId: string): void {
    const cutoff = Date.now() - JOB_TIMEOUT_MS;
    for (const job of this.jobs.values()) {
      if (
        job.userId === userId &&
        (job.status === 'queued' || job.status === 'processing') &&
        new Date(job.createdAt).getTime() < cutoff
      ) {
        job.status = 'failed';
        job.error = 'Generation timed out. Try again.';
        job.completedAt = new Date().toISOString();
        this.scheduleJobRemoval(job.id);
      }
    }
  }

  private countActiveJobs(userId: string): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (
        job.userId === userId &&
        (job.status === 'queued' || job.status === 'processing')
      ) {
        count += 1;
      }
    }
    return count;
  }

  private pruneExpiredJobs(): void {
    const cutoff = Date.now() - JOB_RETENTION_MS;
    for (const [jobId, job] of this.jobs.entries()) {
      const finishedAt = job.completedAt ?? job.createdAt;
      if (new Date(finishedAt).getTime() < cutoff) {
        this.removeJob(jobId);
      }
    }
  }

  private scheduleJobRemoval(jobId: string): void {
    const existing = this.jobTimers.get(jobId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.removeJob(jobId);
    }, JOB_RETENTION_MS);
    this.jobTimers.set(jobId, timer);
  }

  private removeJob(jobId: string): void {
    this.jobs.delete(jobId);
    const timer = this.jobTimers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.jobTimers.delete(jobId);
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'processing';

    try {
      const apiKey = this.configService.get<string>('openai.apiKey');
      if (!apiKey) {
        throw new Error(
          'OpenAI is not configured. Set OPENAI_API_KEY in backend/.env to generate print art.',
        );
      }

      const design = await this.prisma.design.findFirst({
        where: { id: job.designId, userId: job.userId },
      });

      if (!design) {
        throw new Error('Design not found');
      }

      const prompt = this.buildImagePrompt(
        design.prompt,
        normalizeChat(design.chat),
        job.panel,
      );

      const option = findImageOption(job.quality, job.size);
      const imageBytes = await this.fetchGptImage(
        apiKey,
        prompt,
        job.quality,
        job.size,
      );

      const asset = await this.prisma.asset.create({
        data: {
          userId: job.userId,
          designId: job.designId,
          name: `gpt-image-${job.panel}-${job.quality}.png`,
          mime: 'image/png',
          storageKey: 'pending',
          sizeBytes: imageBytes.length,
        },
      });

      const storageKey = this.storageService.buildStorageKey(
        job.userId,
        asset.id,
        asset.name,
      );

      await this.storageService.putObject(storageKey, imageBytes, 'image/png');

      await this.prisma.asset.update({
        where: { id: asset.id },
        data: { storageKey, sizeBytes: imageBytes.length },
      });

      const imageUrl = await this.storageService.createPresignedDownloadUrl(
        storageKey,
        DOWNLOAD_TTL_SECONDS,
      );

      job.result = {
        assetId: asset.id,
        imageUrl,
        model: STUDIO_IMAGE_MODEL,
        quality: job.quality,
        size: job.size,
        priceUsd: option.priceUsd,
      };
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Generation failed';
      job.completedAt = new Date().toISOString();
      this.logger.warn(`Generate job ${jobId} failed: ${job.error}`);
    } finally {
      this.scheduleJobRemoval(jobId);
    }
  }

  private buildImagePrompt(
    designPrompt: string,
    chat: Array<{ role: string; text: string }>,
    panel: PatternPanel,
  ): string {
    const panelLabel = PANEL_LABELS[panel];
    const lastUser = [...chat].reverse().find((m) => m.role === 'user')?.text;
    const brief = (lastUser || designPrompt || 'abstract graphic tee print').trim();

    return [
      `Create a print-ready graphic for the ${panelLabel} of a t-shirt.`,
      'Flat artwork only — no mockup, no worn shirt, no hanger, no model.',
      'Centered composition that works as a textile print on fabric.',
      'Clean edges, high contrast, suitable for DTG/DTF printing.',
      `Design brief: ${brief.slice(0, 1_200)}`,
    ].join(' ');
  }

  private async fetchGptImage(
    apiKey: string,
    prompt: string,
    quality: ImageQuality,
    size: ImageSize,
  ): Promise<Buffer> {
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: STUDIO_IMAGE_MODEL,
          prompt,
          quality,
          size,
          n: 1,
          output_format: 'png',
        }),
        signal: AbortSignal.timeout(OPENAI_IMAGE_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(
        `OpenAI images network error: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        throw new Error('OpenAI image generation timed out. Try again.');
      }
      throw new Error('Could not reach OpenAI image API. Try again shortly.');
    }

    const payload = (await response.json().catch(() => ({}))) as OpenAiImageResponse;

    if (!response.ok) {
      const detail =
        payload.error?.message?.trim() ||
        `OpenAI image request failed (${response.status})`;
      this.logger.warn(`OpenAI images error: ${detail}`);
      throw new Error(this.mapOpenAiError(detail));
    }

    const b64 = payload.data?.[0]?.b64_json;
    if (b64) {
      return Buffer.from(b64, 'base64');
    }

    const url = payload.data?.[0]?.url;
    if (url) {
      const imageResponse = await fetch(url, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!imageResponse.ok) {
        throw new Error('Failed to download generated image from OpenAI.');
      }
      return Buffer.from(await imageResponse.arrayBuffer());
    }

    throw new Error('OpenAI returned no image data.');
  }

  private mapOpenAiError(detail: string): string {
    const lower = detail.toLowerCase();
    if (lower.includes('does not have access') || lower.includes('model_not_found')) {
      return 'gpt-image-1 is not available on your OpenAI account.';
    }
    if (lower.includes('insufficient_quota') || lower.includes('billing')) {
      return 'OpenAI quota exceeded. Check billing on your OpenAI account.';
    }
    if (lower.includes('invalid_api_key') || lower.includes('incorrect api key')) {
      return 'OpenAI API key is invalid. Check OPENAI_API_KEY in backend/.env.';
    }
    if (lower.includes('rate limit')) {
      return 'OpenAI rate limit hit. Wait a moment and try again.';
    }
    return `Image generation failed: ${detail}`;
  }
}
