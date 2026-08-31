import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { EMPTY_PANELS, PatternPanel } from '../designs/design.types';
import { PrismaService } from '../prisma/prisma.service';

export type GenerateJobResponse = {
  jobId: string;
};

type GenerateJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

type GenerateJob = {
  id: string;
  designId: string;
  userId: string;
  panel: PatternPanel;
  status: GenerateJobStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
};

const MAX_PENDING_JOBS_PER_USER = 5;
const JOB_RETENTION_MS = 60 * 60 * 1_000;

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);
  private readonly jobs = new Map<string, GenerateJob>();
  private readonly jobTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    userId: string,
    designId: string,
    panel?: PatternPanel,
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

    if (this.countActiveJobs(userId) >= MAX_PENDING_JOBS_PER_USER) {
      throw new AppException(
        ErrorCodes.RATE_LIMIT,
        'Too many active generation jobs. Try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.pruneExpiredJobs();

    const targetPanel = (panel ?? design.activePanel) as PatternPanel;
    const jobId = randomUUID();
    const job: GenerateJob = {
      id: jobId,
      designId,
      userId,
      panel: targetPanel,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    setTimeout(() => {
      void this.processJob(jobId);
    }, 750);

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
      const design = await this.prisma.design.findFirst({
        where: { id: job.designId, userId: job.userId },
      });

      if (!design) {
        throw new Error('Design not found');
      }

      const currentPanels =
        design.panels &&
        typeof design.panels === 'object' &&
        !Array.isArray(design.panels)
          ? (design.panels as Record<string, unknown>)
          : {};

      const panels = {
        ...EMPTY_PANELS(),
        ...currentPanels,
        [job.panel]: this.buildStubPanel(design.prompt, job.panel),
      };

      await this.prisma.design.update({
        where: { id: job.designId },
        data: {
          panels: panels as Prisma.InputJsonValue,
          status: design.status === 'ordered' ? 'ordered' : 'draft',
        },
      });

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

  private buildStubPanel(prompt: string, panel: PatternPanel): Record<string, unknown> {
    return {
      version: '6.0.0',
      objects: [],
      studioGenerated: true,
      generatedAt: new Date().toISOString(),
      panel,
      brief: prompt || 'Untitled design',
    };
  }
}
