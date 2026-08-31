import { HttpStatus, Injectable } from '@nestjs/common';
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
  buildStudioUserPrompt,
  STUDIO_SYSTEM_PROMPT,
} from './prompt-safety';
import { PANEL_LABELS } from './studio.constants';

export type ChatHistoryResponse = {
  chat: DesignChatMessage[];
};

export type SendChatResponse = {
  reply: DesignChatMessage;
  chat: DesignChatMessage[];
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

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
  ): Promise<SendChatResponse> {
    const design = await this.findOwnedDesign(userId, designId);
    const trimmed = text.trim();
    const at = new Date().toISOString();
    const userMsg: DesignChatMessage = { role: 'user', text: trimmed, at };
    const existingChat = normalizeChat(design.chat);

    const replyText = await this.buildAssistantReply(
      trimmed,
      design.activePanel as PatternPanel,
      design.prompt,
    );
    const reply: DesignChatMessage = {
      role: 'assistant',
      text: replyText,
      at: new Date().toISOString(),
    };

    const chat = [...existingChat, userMsg, reply];
    const prompt = design.prompt ? design.prompt : trimmed;
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

    return { reply, chat };
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
  ): Promise<string> {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (apiKey) {
      const aiReply = await this.fetchOpenAiReply(
        apiKey,
        text,
        activePanel,
        existingPrompt,
      );
      if (aiReply) {
        return aiReply;
      }
    }

    return this.templateReply(text, activePanel);
  }

  private templateReply(text: string, activePanel: PatternPanel): string {
    const brief =
      text.length > 80 ? `${text.slice(0, 80)}…` : text;
    const panelLabel = PANEL_LABELS[activePanel].toLowerCase();
    return `Got it — I'll treat "${brief}" as the brief for the ${panelLabel}. Sketch or upload on the pattern, and it maps to the tee.`;
  }

  private async fetchOpenAiReply(
    apiKey: string,
    text: string,
    activePanel: PatternPanel,
    existingPrompt: string,
  ): Promise<string | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: STUDIO_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: buildStudioUserPrompt(
                PANEL_LABELS[activePanel],
                text,
                existingPrompt || undefined,
              ),
            },
          ],
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content?.trim();
      return content || null;
    } catch {
      return null;
    }
  }
}
