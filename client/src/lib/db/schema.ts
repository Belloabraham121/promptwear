import type { DBSchema } from "idb";
import type { Order, PanelJson, PatternPanel } from "@/lib/dashboard/types";

/** Local studio draft cache — panels only, synced to API on save. */
export type DesignDraft = {
  designId: string;
  /** Session user id — prevents cross-account draft restore on shared devices. */
  ownerId: string;
  panels: Record<PatternPanel, PanelJson>;
  updatedAt: string;
  dirty: boolean;
};

export interface PromptwearDB extends DBSchema {
  meta: {
    key: string;
    value: unknown;
  };
  drafts: {
    key: string;
    value: DesignDraft;
  };
  /** Kept temporarily until orders fully migrate to API-only reads. */
  orders: {
    key: string;
    value: Order;
    indexes: { "by-updated": string };
  };
}

/** Browser IndexedDB name — DevTools shows this as index.db */
export const DB_NAME = "index.db";
export const DB_VERSION = 2;
