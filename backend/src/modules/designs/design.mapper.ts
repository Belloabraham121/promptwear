import { Design, Prisma } from '@prisma/client';
import {
  DesignChatMessage,
  DesignResponse,
  EMPTY_PANELS,
  PATTERN_PANELS,
  PanelJson,
  PatternPanel,
} from './design.types';

function normalizePanels(value: Prisma.JsonValue): Record<PatternPanel, PanelJson> {
  const panels = EMPTY_PANELS();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return panels;
  }

  for (const panel of PATTERN_PANELS) {
    const panelValue = (value as Record<string, unknown>)[panel];
    if (panelValue === null || panelValue === undefined) {
      panels[panel] = null;
    } else if (typeof panelValue === 'object' && !Array.isArray(panelValue)) {
      panels[panel] = panelValue as Record<string, unknown>;
    }
  }

  return panels;
}

export function normalizeChat(value: Prisma.JsonValue): DesignChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const messages: DesignChatMessage[] = [];
  for (const entry of value) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('role' in entry) ||
      !('text' in entry) ||
      !('at' in entry)
    ) {
      continue;
    }

    const role = (entry as { role: unknown }).role;
    const text = (entry as { text: unknown }).text;
    const at = (entry as { at: unknown }).at;
    if (
      (role !== 'user' && role !== 'assistant') ||
      typeof text !== 'string' ||
      typeof at !== 'string'
    ) {
      continue;
    }

    const imageUrl = (entry as { imageUrl?: unknown }).imageUrl;
    const imageAssetId = (entry as { imageAssetId?: unknown }).imageAssetId;
    const rawAttachments = (entry as { attachments?: unknown }).attachments;
    const attachments = Array.isArray(rawAttachments)
      ? rawAttachments
          .filter(
            (a): a is { assetId: string } =>
              typeof a === 'object' &&
              a !== null &&
              typeof (a as { assetId?: unknown }).assetId === 'string',
          )
          .slice(0, 3)
          .map((a) => {
            const rec = a as { assetId: string; url?: unknown; mime?: unknown };
            return {
              assetId: rec.assetId,
              ...(typeof rec.url === 'string' && rec.url ? { url: rec.url } : {}),
              ...(typeof rec.mime === 'string' && rec.mime ? { mime: rec.mime } : {}),
            };
          })
      : undefined;
    messages.push({
      role,
      text,
      at,
      ...(typeof imageUrl === 'string' && imageUrl ? { imageUrl } : {}),
      ...(typeof imageAssetId === 'string' && imageAssetId
        ? { imageAssetId }
        : {}),
      ...(attachments?.length ? { attachments } : {}),
    });
  }

  return messages;
}

export function toDesignResponse(design: Design): DesignResponse {
  return {
    id: design.id,
    title: design.title,
    prompt: design.prompt,
    method: design.method,
    color: design.color,
    background: design.background,
    status: design.status,
    garmentId: design.garmentId,
    activePanel: design.activePanel,
    panels: normalizePanels(design.panels),
    thumbnailAssetId: design.thumbnailAssetId ?? undefined,
    chat: normalizeChat(design.chat),
    createdAt: design.createdAt.toISOString(),
    updatedAt: design.updatedAt.toISOString(),
  };
}
