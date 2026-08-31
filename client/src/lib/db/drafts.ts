"use client";

import type { PanelJson, PatternPanel } from "@/lib/dashboard/types";
import { getDb } from "@/lib/db/client";
import type { DesignDraft } from "@/lib/db/schema";

export type { DesignDraft };

export async function getDraft(
  designId: string,
  ownerId: string,
): Promise<DesignDraft | undefined> {
  const db = await getDb();
  const draft = await db.get("drafts", designId);
  if (!draft || draft.ownerId !== ownerId) return undefined;
  return draft;
}

export async function putDraft(draft: DesignDraft): Promise<void> {
  const db = await getDb();
  await db.put("drafts", draft, draft.designId);
}

export async function clearDraft(designId: string): Promise<void> {
  const db = await getDb();
  await db.delete("drafts", designId);
}

export function makeDraft(
  designId: string,
  ownerId: string,
  panels: Record<PatternPanel, PanelJson>,
): DesignDraft {
  return {
    designId,
    ownerId,
    panels,
    updatedAt: new Date().toISOString(),
    dirty: true,
  };
}
