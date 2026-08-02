"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { DashboardUser, Design, Order } from "@/lib/dashboard/types";
import {
  DB_NAME,
  DB_VERSION,
  type AssetRecord,
  type PromptwearDB,
} from "@/lib/db/schema";

let dbPromise: Promise<IDBPDatabase<PromptwearDB>> | null = null;

export function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<PromptwearDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
        if (!db.objectStoreNames.contains("user")) {
          db.createObjectStore("user");
        }
        if (!db.objectStoreNames.contains("designs")) {
          const designs = db.createObjectStore("designs", { keyPath: "id" });
          designs.createIndex("by-updated", "updatedAt");
          designs.createIndex("by-status", "status");
        }
        if (!db.objectStoreNames.contains("orders")) {
          const orders = db.createObjectStore("orders", { keyPath: "id" });
          orders.createIndex("by-updated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("assets")) {
          const assets = db.createObjectStore("assets", { keyPath: "id" });
          assets.createIndex("by-design", "designId");
        }
      },
    });
  }
  return dbPromise;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get("meta", key)) as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  const db = await getDb();
  await db.put("meta", value, key);
}

export async function getUser(): Promise<DashboardUser | undefined> {
  const db = await getDb();
  return db.get("user", "current");
}

export async function putUser(user: DashboardUser) {
  const db = await getDb();
  await db.put("user", user, "current");
}

export async function listDesigns(): Promise<Design[]> {
  const db = await getDb();
  const all = await db.getAll("designs");
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDesign(id: string): Promise<Design | undefined> {
  const db = await getDb();
  return db.get("designs", id);
}

export async function putDesign(design: Design) {
  const db = await getDb();
  await db.put("designs", design);
}

export async function deleteDesign(id: string) {
  const db = await getDb();
  const assets = await db.getAllFromIndex("assets", "by-design", id);
  const tx = db.transaction(["designs", "assets"], "readwrite");
  await tx.objectStore("designs").delete(id);
  await Promise.all(assets.map((a) => tx.objectStore("assets").delete(a.id)));
  await tx.done;
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

export async function putAsset(asset: AssetRecord) {
  const db = await getDb();
  await db.put("assets", asset);
}

export async function getAsset(id: string): Promise<AssetRecord | undefined> {
  const db = await getDb();
  return db.get("assets", id);
}

export async function deleteAsset(id: string) {
  const db = await getDb();
  await db.delete("assets", id);
}

export async function listAssetsByDesign(
  designId: string,
): Promise<AssetRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex("assets", "by-design", designId);
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
