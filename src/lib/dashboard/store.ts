"use client";

import { quoteOrder, quoteSmartOrder, isSmartQuote } from "@/lib/dashboard/pricing";
import type { SmartQuote } from "@/lib/pricing/engine";
import type {
  DashboardUser,
  Design,
  DesignMethod,
  Order,
  OrderCheckout,
  OrderLine,
  OrderPricingSnapshot,
  StudioBackground,
} from "@/lib/dashboard/types";
import {
  EMPTY_PANELS,
  normalizeOrderStatus,
} from "@/lib/dashboard/types";
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

export type PlaceOrderOptions = {
  note?: string;
  checkout?: OrderCheckout;
  quote?: SmartQuote;
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
    garmentId:
      raw.garmentId === "oversized" || raw.garmentId === "classic"
        ? raw.garmentId
        : "classic",
    activePanel: raw.activePanel ?? "front",
    panels: { ...EMPTY_PANELS(), ...(raw.panels ?? {}) },
    thumbnailAssetId: raw.thumbnailAssetId,
    chat: raw.chat ?? [],
    createdAt: raw.createdAt ?? ts,
    updatedAt: raw.updatedAt ?? ts,
  };
}

function normalizeOrder(raw: Order): Order {
  const status = normalizeOrderStatus(raw.status);
  const history =
    raw.statusHistory && raw.statusHistory.length > 0
      ? raw.statusHistory.map((e) => ({
          ...e,
          status: normalizeOrderStatus(e.status),
        }))
      : [{ status, at: raw.updatedAt ?? raw.createdAt }];
  return { ...raw, status, statusHistory: history };
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
  const created = daysAgoIso(3);
  return [
    {
      id: "ord_demo01",
      status: "printing",
      createdAt: created,
      updatedAt: daysAgoIso(1),
      line,
      subtotal: q.subtotal,
      delivery: q.delivery,
      total: q.total,
      note: "Crew drop for campus launch.",
      checkout: {
        contact: {
          fullName: "Guest creator",
          email: "guest@promptwear.ng",
          phone: "+234 801 000 0000",
        },
        address: {
          line1: "12 Admiralty Way",
          city: "Lagos",
          state: "Lagos",
          country: "NG",
        },
        paymentMethod: "card",
      },
      pricing: {
        vendorId: "ven_lagos_press",
        vendorName: "Lagos Press Co.",
        strategy: "lowest_cost",
        fulfillmentCost: Math.round(q.total * 0.78),
        marginPct: 28,
        marginAmount: Math.round(q.total * 0.22),
        productionDays: 3,
        deliveryDays: 6,
        overridden: false,
      },
      statusHistory: [
        { status: "order_received", at: created },
        { status: "design_confirmed", at: daysAgoIso(2) },
        { status: "production_assigned", at: daysAgoIso(1) },
        { status: "printing", at: daysAgoIso(1) },
      ],
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
        if (o?.id) await putOrder(normalizeOrder(o));
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

  // Normalize legacy statuses in place
  const normalized = orders.map(normalizeOrder);
  for (let i = 0; i < orders.length; i++) {
    if (
      orders[i].status !== normalized[i].status ||
      !orders[i].statusHistory
    ) {
      await putOrder(normalized[i]);
    }
  }

  return { user, designs, orders: normalized };
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
  options?: PlaceOrderOptions,
): Order {
  const ts = new Date().toISOString();
  const smart = options?.quote;
  const fallback = quoteOrder(line);
  const subtotal = smart?.subtotal ?? fallback.subtotal;
  const delivery = smart?.delivery ?? fallback.delivery;
  const total = smart?.total ?? fallback.total;

  let pricing: OrderPricingSnapshot | undefined;
  if (smart && isSmartQuote(smart) && smart.vendor) {
    pricing = {
      vendorId: smart.vendor.vendorId,
      vendorName: smart.vendor.vendorName,
      strategy: smart.strategy,
      fulfillmentCost: smart.fulfillmentCost,
      marginPct: smart.marginPct,
      marginAmount: smart.marginAmount,
      productionDays: smart.productionDays,
      deliveryDays: smart.deliveryDays,
      overridden: smart.overridden,
    };
  }

  const hasCheckout = Boolean(options?.checkout);
  const status = hasCheckout ? "order_received" : "quoted";

  return {
    id: uid("ord"),
    status,
    createdAt: ts,
    updatedAt: ts,
    line,
    subtotal,
    delivery,
    total,
    note: options?.note,
    checkout: options?.checkout,
    pricing,
    statusHistory: [{ status, at: ts }],
  };
}

/** Re-export for callers that want a one-shot smart quote helper. */
export { quoteSmartOrder };
