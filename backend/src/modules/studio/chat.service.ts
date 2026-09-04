import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { normalizeChat } from '../designs/design.mapper';
import {
  DesignChatMessage,
  DesignMethod,
  PatternPanel,
} from '../designs/design.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_STUDIO_AI_MODEL,
  resolveStudioAiModel,
  STUDIO_AI_MODELS,
  StudioAiModel,
} from './openai-models';
import {
  buildStudioUserPrompt,
  STUDIO_SYSTEM_PROMPT,
} from './prompt-safety';
import { PANEL_LABELS } from './studio.constants';
import { GenerateService } from './generate.service';
import type { ImageQuality, ImageSize } from './openai-image';

export type ChatHistoryResponse = {
  chat: DesignChatMessage[];
};

export type SendChatResponse = {
  reply: DesignChatMessage;
  chat: DesignChatMessage[];
  model: string;
  /** Present when the message also kicked off gpt-image-1. */
  generateJobId?: string;
};

export type StudioModelsResponse = {
  models: StudioAiModel[];
  defaultModel: string;
  openaiConfigured: boolean;
};

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: string; type?: string };
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly generateService: GenerateService,
  ) {}

  listModels(): StudioModelsResponse {
    return {
      models: [...STUDIO_AI_MODELS],
      defaultModel: DEFAULT_STUDIO_AI_MODEL,
      openaiConfigured: Boolean(this.configService.get<string>('openai.apiKey')),
    };
  }

  async getHistory(
    userId: string,
    designId: string,
  ): Promise<ChatHistoryResponse> {
    const design = await this.findOwnedDesign(userId, designId);
    return { chat: normalizeChat(design.chat) };
  }

  async sendMessage(
    userId: string,
    designId: string,
    text: string,
    modelId?: string,
    options?: {
      generateImage?: boolean;
      quality?: ImageQuality;
      size?: ImageSize;
    },
  ): Promise<SendChatResponse> {
    const design = await this.findOwnedDesign(userId, designId);
    const model = resolveStudioAiModel(modelId);
    const trimmed = text.trim();
    const at = new Date().toISOString();
    const userMsg: DesignChatMessage = { role: 'user', text: trimmed, at };
    const existingChat = normalizeChat(design.chat);
    const shouldGenerate = Boolean(options?.generateImage);

    const replyText = await this.buildAssistantReply(
      trimmed,
      design.activePanel as PatternPanel,
      design.prompt,
      existingChat,
      model,
      shouldGenerate,
    );
    const reply: DesignChatMessage = {
      role: 'assistant',
      text: replyText,
      at: new Date().toISOString(),
    };

    const chat = [...existingChat, userMsg, reply];
    const prompt = trimmed;
    const method: DesignMethod =
      design.method === 'draw' ? 'hybrid' : design.method;

    await this.prisma.design.update({
      where: { id: designId },
      data: {
        chat: chat as unknown as Prisma.InputJsonValue,
        prompt,
        method,
      },
    });

    let generateJobId: string | undefined;
    if (shouldGenerate) {
      try {
        const { jobId } = await this.generateService.enqueue(
          userId,
          designId,
          design.activePanel as PatternPanel,
          options?.quality,
          options?.size,
        );
        generateJobId = jobId;
      } catch (error) {
        this.logger.warn(
          `Chat-triggered generate failed: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
        // Keep the chat reply; surface generate failure via missing job id.
      }
    }

    return { reply, chat, model: model.id, generateJobId };
  }

  private async findOwnedDesign(userId: string, designId: string) {
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

    return design;
  }

  private async buildAssistantReply(
    text: string,
    activePanel: PatternPanel,
    existingPrompt: string,
    history: DesignChatMessage[],
    model: StudioAiModel,
    willGenerateImage: boolean,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (!apiKey) {
      return this.templateReply(text, activePanel, willGenerateImage);
    }

    return this.fetchOpenAiReply(
      apiKey,
      text,
      activePanel,
      existingPrompt,
      history,
      model,
      willGenerateImage,
    );
  }

  private templateReply(
    text: string,
    activePanel: PatternPanel,
    willGenerateImage: boolean,
  ): string {
    const brief = text.length > 80 ? `${text.slice(0, 80)}…` : text;
    const panelLabel = PANEL_LABELS[activePanel].toLowerCase();
    if (willGenerateImage) {
      return `Using "${brief}" as the ${panelLabel} print brief — generating with gpt-image-1 onto the tee. (Live chat needs OPENAI_API_KEY; image gen uses the same key.)`;
    }
    return `Got it — I'll treat "${brief}" as the brief for the ${panelLabel}. Sketch or upload on the pattern, and it maps to the tee. (Add OPENAI_API_KEY to enable live AI.)`;
  }

  private async fetchOpenAiReply(
    apiKey: string,
    text: string,
    activePanel: PatternPanel,
    existingPrompt: string,
    history: DesignChatMessage[],
    model: StudioAiModel,
    willGenerateImage: boolean,
  ): Promise<string> {
    const messages = this.buildMessages(
      activePanel,
      text,
      existingPrompt,
      history,
      model,
      willGenerateImage,
    );

    const body = this.buildRequestBody(model, messages);

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      this.logger.warn(
        `OpenAI network error for ${model.id}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw new AppException(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Could not reach OpenAI. Try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const payload = (await response.json().catch(() => ({}))) as OpenAiChatResponse;

    if (!response.ok) {
      const detail =
        payload.error?.message?.trim() ||
        `OpenAI request failed (${response.status})`;
      this.logger.warn(`OpenAI error for ${model.id}: ${detail}`);
      throw new AppException(
        ErrorCodes.SERVICE_UNAVAILABLE,
        this.mapOpenAiError(detail, model.id),
        HttpStatus.BAD_GATEWAY,
      );
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AppException(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'OpenAI returned an empty reply. Try another model.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return content;
  }

  private buildMessages(
    activePanel: PatternPanel,
    text: string,
    existingPrompt: string,
    history: DesignChatMessage[],
    model: StudioAiModel,
    willGenerateImage: boolean,
  ): Array<{ role: 'system' | 'developer' | 'user' | 'assistant'; content: string }> {
    const systemRole = model.family === 'reasoning' ? 'developer' : 'system';
    const recent = history.slice(-6).map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.text,
    }));

    const generateNote = willGenerateImage
      ? '\nThe studio will immediately generate a gpt-image-1 print from this message onto the active panel. Confirm briefly that you are generating the print; do not say the user must click Generate.'
      : '';

    return [
      {
        role: systemRole,
        content: STUDIO_SYSTEM_PROMPT + generateNote,
      },
      ...recent,
      {
        role: 'user',
        content: buildStudioUserPrompt(
          PANEL_LABELS[activePanel],
          text,
          existingPrompt || undefined,
        ),
      },
    ];
  }

  private buildRequestBody(
    model: StudioAiModel,
    messages: Array<{ role: string; content: string }>,
  ): Record<string, unknown> {
    if (model.family === 'reasoning') {
      return {
        model: model.id,
        messages,
        max_completion_tokens: 1_200,
      };
    }

    return {
      model: model.id,
      messages,
      max_tokens: 400,
      temperature: 0.7,
    };
  }

  private mapOpenAiError(detail: string, modelId: string): string {
    const lower = detail.toLowerCase();
    if (lower.includes('does not have access') || lower.includes('model_not_found')) {
      return `Model "${modelId}" is not available on your OpenAI account. Pick another model.`;
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
    return `AI reply failed: ${detail}`;
  }
}
