"use client";

import { quoteOrder } from "@/lib/dashboard/pricing";
import type {
  DashboardUser,
  Design,
  DesignMethod,
  Order,
  OrderLine,
  StudioBackground,
} from "@/lib/dashboard/types";
import { EMPTY_PANELS } from "@/lib/dashboard/types";
import {
  getMeta,
  getUser,
  listDesigns,
  listOrders,
  putDesign,
  putOrder,
  putUser,
  setMeta,
  uid,
} from "@/lib/db/client";

const LEGACY_STORAGE_KEY = "promptwear.dashboard.v1";
const SEEDED_META = "seeded.v1";

export type DashboardState = {
  user: DashboardUser;
  designs: Design[];
  orders: Order[];
};

function daysAgoIso(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function normalizeDesign(raw: Partial<Design> & { id: string }): Design {
  const ts = new Date().toISOString();
  return {
    id: raw.id,
    title: raw.title ?? "Untitled design",
    prompt: raw.prompt ?? "",
    method: raw.method ?? "prompt",
    color: raw.color ?? "#d6ff3c",
    background: (raw.background as StudioBackground) ?? "ink",
    status: raw.status ?? "draft",
    activePanel: raw.activePanel ?? "front",
    panels: raw.panels ?? EMPTY_PANELS(),
    thumbnailAssetId: raw.thumbnailAssetId,
    chat: raw.chat ?? [],
    createdAt: raw.createdAt ?? ts,
    updatedAt: raw.updatedAt ?? ts,
  };
}

function seedDesigns(): Design[] {
  return [
    normalizeDesign({
      id: "des_chrome",
      title: "Chrome heart flame",
      prompt: "A chrome heart melting into blue flame, Y2K editorial.",
      method: "prompt",
      color: "#d6ff3c",
      status: "saved",
      createdAt: daysAgoIso(6),
      updatedAt: daysAgoIso(2),
    }),
    normalizeDesign({
      id: "des_hostel",
      title: "Hostel run 01",
      prompt: "Bold block type HOSTEL RUN over grain texture.",
      method: "hybrid",
      color: "#f3f0e8",
      status: "draft",
      createdAt: daysAgoIso(4),
      updatedAt: daysAgoIso(4),
    }),
  ];
}

function seedOrders(designs: Design[]): Order[] {
  const d = designs[0];
  const line: OrderLine = {
    designId: d.id,
    designTitle: d.title,
    color: d.color,
    quality: "premium",
    print: "dtf",
    sizes: { S: 2, M: 6, L: 4, XL: 2, XXL: 0 },
  };
  const q = quoteOrder(line);
  return [
    {
      id: "ord_demo01",
      status: "in_production",
      createdAt: daysAgoIso(3),
      updatedAt: daysAgoIso(1),
      line,
      subtotal: q.subtotal,
      delivery: q.delivery,
      total: q.total,
      note: "Crew drop for campus launch.",
    },
  ];
}

async function migrateLegacyLocalStorage() {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return false;
    const legacy = JSON.parse(raw) as {
      user?: DashboardUser;
      designs?: Partial<Design>[];
      orders?: Order[];
    };
    if (legacy.user) await putUser(legacy.user);
    if (Array.isArray(legacy.designs)) {
      for (const d of legacy.designs) {
        if (d?.id) await putDesign(normalizeDesign(d as Design));
      }
    }
    if (Array.isArray(legacy.orders)) {
      for (const o of legacy.orders) {
        if (o?.id) await putOrder(o);
      }
    }
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Load dashboard from IndexedDB; seed once; migrate old localStorage. */
export async function loadState(): Promise<DashboardState> {
  const migrated = await migrateLegacyLocalStorage();
  let user = await getUser();
  let designs = await listDesigns();
  let orders = await listOrders();
  const seeded = await getMeta<boolean>(SEEDED_META);

  if (!user) {
    user = {
      name: "Guest creator",
      email: "guest@promptwear.ng",
      guest: true,
    };
    await putUser(user);
  }

  if (!seeded && !migrated && designs.length === 0) {
    designs = seedDesigns();
    orders = seedOrders(designs);
    await Promise.all([
      ...designs.map((d) => putDesign(d)),
      ...orders.map((o) => putOrder(o)),
      putDesign({ ...designs[0], status: "ordered" }),
    ]);
    designs = await listDesigns();
    orders = await listOrders();
    await setMeta(SEEDED_META, true);
  } else if (!seeded) {
    await setMeta(SEEDED_META, true);
  }

  return { user, designs, orders };
}

export function createDesign(input: {
  title?: string;
  prompt?: string;
  method?: DesignMethod;
  color?: string;
  background?: StudioBackground;
}): Design {
  const ts = new Date().toISOString();
  return normalizeDesign({
    id: uid("des"),
    title: input.title?.trim() || "Untitled design",
    prompt: input.prompt?.trim() || "",
    method: input.method ?? "draw",
    color: input.color ?? "#1a1e19",
    background: input.background ?? "ink",
    status: "draft",
    createdAt: ts,
    updatedAt: ts,
  });
}

export function createOrderFromLine(
  line: OrderLine,
  note?: string,
): Order {
  const q = quoteOrder(line);
  const ts = new Date().toISOString();
  return {
    id: uid("ord"),
    status: "quoted",
    createdAt: ts,
    updatedAt: ts,
    line,
    subtotal: q.subtotal,
    delivery: q.delivery,
    total: q.total,
    note,
  };
}
