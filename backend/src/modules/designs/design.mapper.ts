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

  return value.filter(
    (entry): entry is DesignChatMessage =>
      typeof entry === 'object' &&
      entry !== null &&
      'role' in entry &&
      'text' in entry &&
      'at' in entry,
  );
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
