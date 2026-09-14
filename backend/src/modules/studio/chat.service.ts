import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { normalizeChat } from '../designs/design.mapper';
import {
  ChatAttachment,
  DesignChatMessage,
  DesignMethod,
  PatternPanel,
} from '../designs/design.types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../assets/storage.service';
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

type RefImage = {
  assetId: string;
  mime: string;
  dataUrl: string;
};

type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type ChatContentMessage = {
  role: 'system' | 'developer' | 'user' | 'assistant';
  content: string | ChatContentPart[];
};

/** Models without vision input — refs are text-noted, never sent as images. */
const TEXT_ONLY_MODELS = new Set(['o3-mini']);
const MAX_REF_IMAGES = 3;
const MAX_REF_BYTES = 10 * 1024 * 1024;
const ALLOWED_REF_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly generateService: GenerateService,
    private readonly storageService: StorageService,
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
    const chat = normalizeChat(design.chat);
    return { chat: await this.withAttachmentUrls(userId, chat) };
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
      imageAssetIds?: string[];
    },
  ): Promise<SendChatResponse> {
    const design = await this.findOwnedDesign(userId, designId);
    const model = resolveStudioAiModel(modelId);
    const trimmed = text.trim();
    if (!trimmed) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        'Message text is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const at = new Date().toISOString();
    const refs = await this.loadReferenceImages(
      userId,
      options?.imageAssetIds,
    );
    const attachments: ChatAttachment[] = refs.map((r) => ({
      assetId: r.assetId,
      mime: r.mime,
    }));
    const userMsg: DesignChatMessage = {
      role: 'user',
      text: trimmed,
      at,
      ...(attachments.length ? { attachments } : {}),
    };
    const existingChat = normalizeChat(design.chat);
    const shouldGenerate = Boolean(options?.generateImage);

    // Option C: image mode — chat model acts as prompt enhancer only.
    // Its text is never shown; it is forwarded straight to gpt-image-1
    // so the thread stays uniform (single image message, no text-then-image).
    if (shouldGenerate) {
      const panel = design.activePanel as PatternPanel;
      const enhanced = await this.enhanceImagePrompt(
        trimmed,
        panel,
        design.prompt,
        existingChat,
        model,
        refs,
      );
      const reply: DesignChatMessage = {
        role: 'assistant',
        text: '',
        at: new Date().toISOString(),
      };
      const chat = [...existingChat, userMsg, reply];
      await this.prisma.design.update({
        where: { id: designId },
        data: {
          chat: this.stripAttachmentUrls(chat) as unknown as Prisma.InputJsonValue,
          prompt: trimmed,
          method: design.method === 'draw' ? 'hybrid' : design.method,
        },
      });

      let generateJobId: string | undefined;
      try {
        const { jobId } = await this.generateService.enqueue(
          userId,
          designId,
          panel,
          options?.quality,
          options?.size,
          enhanced,
        );
        generateJobId = jobId;
      } catch (error) {
        this.logger.warn(
          `Chat-triggered generate failed: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
      return {
        reply,
        chat: await this.withAttachmentUrls(userId, chat),
        model: model.id,
        generateJobId,
      };
    }

    const replyText = await this.buildAssistantReply(
      trimmed,
      design.activePanel as PatternPanel,
      design.prompt,
      existingChat,
      model,
      false,
      refs,
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
        chat: this.stripAttachmentUrls(chat) as unknown as Prisma.InputJsonValue,
        prompt,
        method,
      },
    });

    return {
      reply,
      chat: await this.withAttachmentUrls(userId, chat),
      model: model.id,
    };
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

  /** Validate ownership + mime + size, then load bytes as data URLs for OpenAI. */
  private async loadReferenceImages(
    userId: string,
    assetIds?: string[],
  ): Promise<RefImage[]> {
    if (!assetIds?.length) return [];
    const ids = [...new Set(assetIds)].slice(0, MAX_REF_IMAGES);
    const refs: RefImage[] = [];
    for (const assetId of ids) {
      const asset = await this.prisma.asset.findFirst({
        where: { id: assetId, userId },
      });
      if (!asset) {
        throw new AppException(
          ErrorCodes.NOT_FOUND,
          `Reference image not found: ${assetId}`,
          HttpStatus.NOT_FOUND,
        );
      }
      if (!ALLOWED_REF_MIMES.has(asset.mime)) {
        throw new AppException(
          ErrorCodes.VALIDATION_ERROR,
          `Unsupported reference type "${asset.mime}". Use JPEG, PNG, or WebP.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (asset.sizeBytes && asset.sizeBytes > MAX_REF_BYTES) {
        throw new AppException(
          ErrorCodes.VALIDATION_ERROR,
          `Reference image "${asset.name}" exceeds 10MB.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const { bytes, contentType } = await this.storageService.getObjectBytes(
        asset.storageKey,
      );
      if (bytes.length > MAX_REF_BYTES) {
        throw new AppException(
          ErrorCodes.VALIDATION_ERROR,
          `Reference image "${asset.name}" exceeds 10MB.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const mime = contentType || asset.mime;
      refs.push({
        assetId: asset.id,
        mime,
        dataUrl: `data:${mime};base64,${bytes.toString('base64')}`,
      });
    }
    return refs;
  }

  /** Persisted chat stores assetIds only — resolve fresh presigned URLs per read. */
  private async withAttachmentUrls(
    userId: string,
    chat: DesignChatMessage[],
  ): Promise<DesignChatMessage[]> {
    return Promise.all(
      chat.map(async (message) => {
        if (!message.attachments?.length) return message;
        const attachments = await Promise.all(
          message.attachments.map(async (a) => {
            try {
              const asset = await this.prisma.asset.findFirst({
                where: { id: a.assetId, userId },
              });
              if (!asset) return a;
              const url =
                await this.storageService.createPresignedDownloadUrl(
                  asset.storageKey,
                );
              return { ...a, url, mime: asset.mime };
            } catch {
              return a;
            }
          }),
        );
        return { ...message, attachments };
      }),
    );
  }

  private stripAttachmentUrls(
    chat: DesignChatMessage[],
  ): DesignChatMessage[] {
    return chat.map((message) =>
      message.attachments?.length
        ? {
            ...message,
            attachments: message.attachments.map((a) => ({
              assetId: a.assetId,
              ...(a.mime ? { mime: a.mime } : {}),
            })),
          }
        : message,
    );
  }

  private visionSupported(model: StudioAiModel): boolean {
    return !TEXT_ONLY_MODELS.has(model.id);
  }

  private async enhanceImagePrompt(
    text: string,
    activePanel: PatternPanel,
    existingPrompt: string,
    history: DesignChatMessage[],
    model: StudioAiModel,
    refs: RefImage[] = [],
  ): Promise<string> {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (!apiKey) return text;
    const panelLabel = PANEL_LABELS[activePanel] ?? activePanel;
    const recent = history
      .slice(-4)
      .map((m) => `${m.role}: ${m.text}`.slice(0, 500))
      .join('\n');
    const systemRole = model.family === 'reasoning' ? 'developer' : 'system';
    const userContent: string | ChatContentPart[] =
      this.visionSupported(model) && refs.length
        ? [
            {
              type: 'text',
              text: `Panel: ${panelLabel}\nPrior brief: ${(existingPrompt || '').slice(0, 500)}\nRecent:\n${recent}\nNew brief: ${text.slice(0, 1500)}\nUse the attached reference image(s) for style/composition.`,
            },
            ...refs.map((r): ChatContentPart => ({
              type: 'image_url',
              image_url: { url: r.dataUrl },
            })),
          ]
        : `Panel: ${panelLabel}\nPrior brief: ${(existingPrompt || '').slice(0, 500)}\nRecent:\n${recent}\nNew brief: ${text.slice(0, 1500)}`;
    const messages: ChatContentMessage[] = [
      {
        role: systemRole,
        content:
          'You turn custom apparel & merch design requests (tees, hoodies, tote bags, joggers, caps, etc.) into image prompts for gpt-image-1. Preserve the user\'s requested garment, style (photorealistic, 3D render, flat vector, distressed, embroidery look, etc.), subject, composition, colors, textures, and scene — including mockups (garment worn by a person, studio shot, hanger, flat-lay) when asked. Only default to a centered print graphic when they specify no garment or style. If reference images are attached, borrow their style/composition. Output ONE image prompt only, under 250 words. No commentary, no quotes.',
      },
      { role: 'user', content: userContent },
    ];
    const body =
      model.family === 'reasoning'
        ? { model: model.id, messages, max_completion_tokens: 600 }
        : { model: model.id, messages, max_tokens: 400, temperature: 0.7 };
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => ({}))) as OpenAiChatResponse;
      const content = payload.choices?.[0]?.message?.content?.trim();
      return content || text;
    } catch (error) {
      this.logger.warn(
        `Prompt-enhance failed for ${model.id}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return text;
    }
  }

  private async buildAssistantReply(
    text: string,
    activePanel: PatternPanel,
    existingPrompt: string,
    history: DesignChatMessage[],
    model: StudioAiModel,
    willGenerateImage: boolean,
    refs: RefImage[] = [],
  ): Promise<string> {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (!apiKey) {
      return this.templateReply(text, activePanel, willGenerateImage, refs.length);
    }

    return this.fetchOpenAiReply(
      apiKey,
      text,
      activePanel,
      existingPrompt,
      history,
      model,
      willGenerateImage,
      refs,
    );
  }

  private templateReply(
    text: string,
    activePanel: PatternPanel,
    willGenerateImage: boolean,
    refCount = 0,
  ): string {
    const brief = text.length > 80 ? `${text.slice(0, 80)}…` : text;
    const panelLabel = PANEL_LABELS[activePanel].toLowerCase();
    const refNote =
      refCount > 0
        ? ` (${refCount} reference image${refCount > 1 ? 's' : ''} attached)`
        : '';
    if (willGenerateImage) {
      return `Using "${brief}" as the ${panelLabel} design brief${refNote} — generating with gpt-image-1 onto the piece. (Live chat needs OPENAI_API_KEY; image gen uses the same key.)`;
    }
    return `Got it — I'll treat "${brief}" as the brief for the ${panelLabel}${refNote}. Sketch or upload on the pattern, and it maps to the piece. (Add OPENAI_API_KEY to enable live AI.)`;
  }

  private async fetchOpenAiReply(
    apiKey: string,
    text: string,
    activePanel: PatternPanel,
    existingPrompt: string,
    history: DesignChatMessage[],
    model: StudioAiModel,
    willGenerateImage: boolean,
    refs: RefImage[] = [],
  ): Promise<string> {
    const messages = this.buildMessages(
      activePanel,
      text,
      existingPrompt,
      history,
      model,
      willGenerateImage,
      refs,
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
    refs: RefImage[] = [],
  ): ChatContentMessage[] {
    const systemRole = model.family === 'reasoning' ? 'developer' : 'system';
    const recent = history.slice(-6).map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.text,
    }));

    const generateNote = willGenerateImage
      ? '\nThe studio will immediately generate a gpt-image-1 print from this message onto the active panel. Confirm briefly that you are generating the print; do not say the user must click Generate.'
      : '';

    const canSee = this.visionSupported(model) && refs.length > 0;
    const blindNote =
      !this.visionSupported(model) && refs.length > 0
        ? `\nNote: the user attached ${refs.length} reference image(s), but model "${model.id}" cannot view images — answer from the text brief only.`
        : '';
    const promptText =
      buildStudioUserPrompt(
        PANEL_LABELS[activePanel],
        text,
        existingPrompt || undefined,
      ) + blindNote;
    const userContent: string | ChatContentPart[] = canSee
      ? [
          { type: 'text', text: `${promptText}\nUse the attached reference image(s) for style/composition.` },
          ...refs.map((r): ChatContentPart => ({
            type: 'image_url',
            image_url: { url: r.dataUrl },
          })),
        ]
      : promptText;

    return [
      {
        role: systemRole,
        content: STUDIO_SYSTEM_PROMPT + generateNote,
      },
      ...recent,
      { role: 'user', content: userContent },
    ];
  }

  private buildRequestBody(
    model: StudioAiModel,
    messages: ChatContentMessage[],
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
