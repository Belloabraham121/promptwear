import type { DBSchema } from "idb";
import type {
  DashboardUser,
  Design,
  Order,
} from "@/lib/dashboard/types";

export type AssetRecord = {
  id: string;
  designId?: string;
  name: string;
  mime: string;
  blob: Blob;
  createdAt: string;
};

export interface PromptwearDB extends DBSchema {
  meta: {
    key: string;
    value: unknown;
  };
  user: {
    key: string;
    value: DashboardUser;
  };
  designs: {
    key: string;
    value: Design;
    indexes: { "by-updated": string; "by-status": string };
  };
  orders: {
    key: string;
    value: Order;
    indexes: { "by-updated": string };
  };
  assets: {
    key: string;
    value: AssetRecord;
    indexes: { "by-design": string };
  };
}

/** Browser IndexedDB name — DevTools shows this as index.db */
export const DB_NAME = "index.db";
export const DB_VERSION = 1;
