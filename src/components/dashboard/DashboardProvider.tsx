"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createDesign,
  createOrderFromLine,
  loadState,
  type DashboardState,
} from "@/lib/dashboard/store";
import type {
  Design,
  DesignMethod,
  Order,
  OrderLine,
  OrderStatus,
  StudioBackground,
} from "@/lib/dashboard/types";
import {
  deleteDesign as dbDeleteDesign,
  getAsset,
  getDesign,
  putAsset,
  putDesign,
  putOrder,
  putUser,
  uid,
} from "@/lib/db/client";
import type { AssetRecord } from "@/lib/db/schema";

type DashboardContextValue = {
  ready: boolean;
  user: DashboardState["user"];
  designs: Design[];
  orders: Order[];
  addDesign: (input?: {
    title?: string;
    prompt?: string;
    method?: DesignMethod;
    color?: string;
    background?: StudioBackground;
  }) => Promise<Design>;
  updateDesign: (id: string, patch: Partial<Design>) => Promise<Design | null>;
  removeDesign: (id: string) => Promise<void>;
  placeOrder: (line: OrderLine, note?: string) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  setUser: (user: DashboardState["user"]) => Promise<void>;
  saveAsset: (input: {
    blob: Blob;
    mime: string;
    name: string;
    designId?: string;
  }) => Promise<AssetRecord>;
  loadAsset: (id: string) => Promise<AssetRecord | undefined>;
  refresh: () => Promise<void>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DashboardState | null>(null);

  const refresh = useCallback(async () => {
    setState(await loadState());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addDesign = useCallback(
    async (input?: {
      title?: string;
      prompt?: string;
      method?: DesignMethod;
      color?: string;
      background?: StudioBackground;
    }) => {
      const design = createDesign(input ?? {});
      await putDesign(design);
      setState((prev) =>
        prev ? { ...prev, designs: [design, ...prev.designs] } : prev,
      );
      return design;
    },
    [],
  );

  const updateDesign = useCallback(
    async (id: string, patch: Partial<Design>) => {
      const current = await getDesign(id);
      if (!current) return null;
      const updated: Design = {
        ...current,
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
      };
      await putDesign(updated);
      setState((prev) =>
        prev
          ? {
              ...prev,
              designs: prev.designs.map((d) => (d.id === id ? updated : d)),
            }
          : prev,
      );
      return updated;
    },
    [],
  );

  const removeDesign = useCallback(async (id: string) => {
    await dbDeleteDesign(id);
    setState((prev) =>
      prev
        ? { ...prev, designs: prev.designs.filter((d) => d.id !== id) }
        : prev,
    );
  }, []);

  const placeOrder = useCallback(async (line: OrderLine, note?: string) => {
    const order = createOrderFromLine(line, note);
    await putOrder(order);
    const design = await getDesign(line.designId);
    if (design && design.status !== "ordered") {
      await putDesign({
        ...design,
        status: "ordered",
        updatedAt: new Date().toISOString(),
      });
    }
    setState(await loadState());
    return order;
  }, []);

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const prev = state;
      const current = prev?.orders.find((o) => o.id === id);
      if (!current) return;
      const updated: Order = {
        ...current,
        status,
        updatedAt: new Date().toISOString(),
      };
      await putOrder(updated);
      setState((s) =>
        s
          ? {
              ...s,
              orders: s.orders.map((o) => (o.id === id ? updated : o)),
            }
          : s,
      );
    },
    [state],
  );

  const setUser = useCallback(async (user: DashboardState["user"]) => {
    await putUser(user);
    setState((prev) => (prev ? { ...prev, user } : prev));
  }, []);

  const saveAsset = useCallback(
    async (input: {
      blob: Blob;
      mime: string;
      name: string;
      designId?: string;
    }) => {
      const asset: AssetRecord = {
        id: uid("asset"),
        designId: input.designId,
        name: input.name,
        mime: input.mime,
        blob: input.blob,
        createdAt: new Date().toISOString(),
      };
      await putAsset(asset);
      return asset;
    },
    [],
  );

  const loadAsset = useCallback(async (id: string) => getAsset(id), []);

  const value = useMemo<DashboardContextValue>(() => {
    const empty = state ?? {
      user: { name: "", email: "", guest: true },
      designs: [],
      orders: [],
    };
    return {
      ready: Boolean(state),
      user: empty.user,
      designs: empty.designs,
      orders: empty.orders,
      addDesign,
      updateDesign,
      removeDesign,
      placeOrder,
      updateOrderStatus,
      setUser,
      saveAsset,
      loadAsset,
      refresh,
    };
  }, [
    state,
    addDesign,
    updateDesign,
    removeDesign,
    placeOrder,
    updateOrderStatus,
    setUser,
    saveAsset,
    loadAsset,
    refresh,
  ]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return ctx;
}
