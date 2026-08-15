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
  createCoupon,
  createDiscount,
  createPromotion,
  createVendor,
  loadAdminState,
  patchCatalogItem,
  saveAdminState,
} from "@/lib/admin/persist";
import type {
  AdminCatalog,
  AdminState,
  Coupon,
  Discount,
  ProfitSettings,
  Promotion,
  Vendor,
} from "@/lib/admin/types";

type AdminContextValue = {
  ready: boolean;
  catalog: AdminCatalog;
  vendors: Vendor[];
  profit: ProfitSettings;
  refresh: () => Promise<void>;
  updateCatalogItem: <K extends keyof AdminCatalog>(
    key: K,
    id: string,
    patch: Partial<AdminCatalog[K][number]>,
  ) => Promise<void>;
  addVendor: (input: {
    name: string;
    location: string;
    qualityRating?: number;
    capacityPerWeek?: number;
    priceIndex?: number;
    onTimeRate?: number;
    notes?: string;
  }) => Promise<Vendor>;
  updateVendor: (id: string, patch: Partial<Vendor>) => Promise<void>;
  removeVendor: (id: string) => Promise<void>;
  updateProfit: (
    patch: Partial<
      Pick<
        ProfitSettings,
        | "defaultMarginPct"
        | "rushMarginPct"
        | "minMarginPct"
        | "maxMarginPct"
        | "selectionStrategy"
        | "excludedVendorIds"
        | "overrideVendorId"
      >
    >,
  ) => Promise<void>;
  togglePromotion: (id: string) => Promise<void>;
  addPromotion: (input: { name: string; description: string }) => Promise<void>;
  toggleDiscount: (id: string) => Promise<void>;
  addDiscount: (input: {
    name: string;
    type: Discount["type"];
    value: number;
    minQty: number;
  }) => Promise<void>;
  toggleCoupon: (id: string) => Promise<void>;
  addCoupon: (input: {
    code: string;
    type: Coupon["type"];
    value: number;
  }) => Promise<void>;
  removeCoupon: (id: string) => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

async function persist(next: AdminState) {
  await saveAdminState(next);
  return next;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminState | null>(null);

  const refresh = useCallback(async () => {
    setState(await loadAdminState());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const commit = useCallback(async (updater: (prev: AdminState) => AdminState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      void persist(next);
      return next;
    });
  }, []);

  const updateCatalogItem = useCallback(
    async <K extends keyof AdminCatalog>(
      key: K,
      id: string,
      patch: Partial<AdminCatalog[K][number]>,
    ) => {
      await commit((prev) => ({
        ...prev,
        catalog: patchCatalogItem(prev.catalog, key, id, patch),
      }));
    },
    [commit],
  );

  const addVendor = useCallback(
    async (input: {
      name: string;
      location: string;
      qualityRating?: number;
      capacityPerWeek?: number;
      priceIndex?: number;
      onTimeRate?: number;
      notes?: string;
    }) => {
      const vendor = createVendor(input);
      await commit((prev) => ({
        ...prev,
        vendors: [vendor, ...prev.vendors],
      }));
      return vendor;
    },
    [commit],
  );

  const updateVendor = useCallback(
    async (id: string, patch: Partial<Vendor>) => {
      await commit((prev) => ({
        ...prev,
        vendors: prev.vendors.map((v) =>
          v.id === id ? { ...v, ...patch } : v,
        ),
      }));
    },
    [commit],
  );

  const removeVendor = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        vendors: prev.vendors.filter((v) => v.id !== id),
      }));
    },
    [commit],
  );

  const updateProfit = useCallback(
    async (
      patch: Partial<
        Pick<
          ProfitSettings,
          | "defaultMarginPct"
          | "rushMarginPct"
          | "minMarginPct"
          | "maxMarginPct"
          | "selectionStrategy"
          | "excludedVendorIds"
          | "overrideVendorId"
        >
      >,
    ) => {
      await commit((prev) => ({
        ...prev,
        profit: { ...prev.profit, ...patch },
      }));
    },
    [commit],
  );

  const togglePromotion = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        profit: {
          ...prev.profit,
          promotions: prev.profit.promotions.map((p) =>
            p.id === id ? { ...p, active: !p.active } : p,
          ),
        },
      }));
    },
    [commit],
  );

  const addPromotion = useCallback(
    async (input: { name: string; description: string }) => {
      const promo = createPromotion(input);
      await commit((prev) => ({
        ...prev,
        profit: {
          ...prev.profit,
          promotions: [promo, ...prev.profit.promotions],
        },
      }));
    },
    [commit],
  );

  const toggleDiscount = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        profit: {
          ...prev.profit,
          discounts: prev.profit.discounts.map((d) =>
            d.id === id ? { ...d, active: !d.active } : d,
          ),
        },
      }));
    },
    [commit],
  );

  const addDiscount = useCallback(
    async (input: {
      name: string;
      type: Discount["type"];
      value: number;
      minQty: number;
    }) => {
      const discount = createDiscount(input);
      await commit((prev) => ({
        ...prev,
        profit: {
          ...prev.profit,
          discounts: [discount, ...prev.profit.discounts],
        },
      }));
    },
    [commit],
  );

  const toggleCoupon = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        profit: {
          ...prev.profit,
          coupons: prev.profit.coupons.map((c) =>
            c.id === id ? { ...c, active: !c.active } : c,
          ),
        },
      }));
    },
    [commit],
  );

  const addCoupon = useCallback(
    async (input: {
      code: string;
      type: Coupon["type"];
      value: number;
    }) => {
      const coupon = createCoupon(input);
      await commit((prev) => ({
        ...prev,
        profit: {
          ...prev.profit,
          coupons: [coupon, ...prev.profit.coupons],
        },
      }));
    },
    [commit],
  );

  const removeCoupon = useCallback(
    async (id: string) => {
      await commit((prev) => ({
        ...prev,
        profit: {
          ...prev.profit,
          coupons: prev.profit.coupons.filter((c) => c.id !== id),
        },
      }));
    },
    [commit],
  );

  const value = useMemo<AdminContextValue>(() => {
    const empty = state ?? {
      catalog: { materials: [], garments: [], colors: [], sizes: [] },
      vendors: [],
      profit: {
        defaultMarginPct: 0,
        rushMarginPct: 0,
        minMarginPct: 15,
        maxMarginPct: 45,
        selectionStrategy: "lowest_cost" as const,
        excludedVendorIds: [] as string[],
        overrideVendorId: null as string | null,
        promotions: [] as Promotion[],
        discounts: [] as Discount[],
        coupons: [] as Coupon[],
      },
    };
    return {
      ready: Boolean(state),
      catalog: empty.catalog,
      vendors: empty.vendors,
      profit: empty.profit,
      refresh,
      updateCatalogItem,
      addVendor,
      updateVendor,
      removeVendor,
      updateProfit,
      togglePromotion,
      addPromotion,
      toggleDiscount,
      addDiscount,
      toggleCoupon,
      addCoupon,
      removeCoupon,
    };
  }, [
    state,
    refresh,
    updateCatalogItem,
    addVendor,
    updateVendor,
    removeVendor,
    updateProfit,
    togglePromotion,
    addPromotion,
    toggleDiscount,
    addDiscount,
    toggleCoupon,
    addCoupon,
    removeCoupon,
  ]);

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return ctx;
}
