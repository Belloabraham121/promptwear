"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { Order } from "@/lib/dashboard/types";
import { DB_NAME, DB_VERSION, type PromptwearDB } from "@/lib/db/schema";

let dbPromise: Promise<IDBPDatabase<PromptwearDB>> | null = null;

export function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<PromptwearDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains("drafts")) {
          db.createObjectStore("drafts");
        }
        if (!db.objectStoreNames.contains("orders")) {
          const orders = db.createObjectStore("orders", { keyPath: "id" });
          orders.createIndex("by-updated", "updatedAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function listOrders(): Promise<Order[]> {
  const db = await getDb();
  const all = await db.getAll("orders");
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function putOrder(order: Order) {
  const db = await getDb();
  await db.put("orders", order);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get("meta", key)) as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  const db = await getDb();
  await db.put("meta", value, key);
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
