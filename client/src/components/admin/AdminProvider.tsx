"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  cancelAdminOrder,
  createCoupon,
  createDiscount,
  createPromotion,
  createVendor,
  getAdminCatalog,
  getProfitSettings,
  listAdminOrders,
  listVendors,
  refundAdminOrder,
  removeCoupon,
  removeVendor,
  updateAdminOrderStatus,
  updateCatalogItem,
  updateCoupon,
  updateDiscount,
  updatePromotion,
  updateProfitSettings,
  updateVendor,
} from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AdminCatalog,
  Coupon,
  Discount,
  ProfitSettings,
  Promotion,
  Vendor,
} from "@/lib/admin/types";
import type { Order, OrderStatus } from "@/lib/dashboard/types";
import { useAuth } from "@/providers/AuthProvider";

type AdminContextValue = {
  ready: boolean;
  isFetching: boolean;
  error: Error | null;
  catalog: AdminCatalog;
  vendors: Vendor[];
  profit: ProfitSettings;
  orders: Order[];
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
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  refundOrder: (id: string) => Promise<void>;
};

const EMPTY_CATALOG: AdminCatalog = {
  materials: [],
  garments: [],
  colors: [],
  sizes: [],
};

const EMPTY_PROFIT: ProfitSettings = {
  defaultMarginPct: 0,
  rushMarginPct: 0,
  minMarginPct: 15,
  maxMarginPct: 45,
  selectionStrategy: "lowest_cost",
  excludedVendorIds: [],
  overrideVendorId: null,
  promotions: [],
  discounts: [],
  coupons: [],
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const isAdmin = session?.role === "admin";

  const catalogQuery = useQuery({
    queryKey: queryKeys.admin.catalog,
    queryFn: getAdminCatalog,
    enabled: isAdmin,
  });

  const vendorsQuery = useQuery({
    queryKey: queryKeys.admin.vendors,
    queryFn: listVendors,
    enabled: isAdmin,
  });

  const profitQuery = useQuery({
    queryKey: queryKeys.admin.profit,
    queryFn: getProfitSettings,
    enabled: isAdmin,
  });

  const ordersQuery = useQuery({
    queryKey: queryKeys.admin.orders,
    queryFn: () => listAdminOrders({ limit: 100 }),
    enabled: isAdmin,
  });

  const ready =
    catalogQuery.isSuccess &&
    vendorsQuery.isSuccess &&
    profitQuery.isSuccess &&
    ordersQuery.isSuccess;

  const error =
    (catalogQuery.error ??
      vendorsQuery.error ??
      profitQuery.error ??
      ordersQuery.error) as Error | null;

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.catalog }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.vendors }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders }),
    ]);
  }, [queryClient]);

  const catalogMutation = useMutation({
    mutationFn: ({
      key,
      id,
      patch,
    }: {
      key: keyof AdminCatalog;
      id: string;
      patch: Partial<AdminCatalog[keyof AdminCatalog][number]>;
    }) => updateCatalogItem(key, id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.catalog });
    },
  });

  const vendorCreateMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.vendors });
    },
  });

  const vendorUpdateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Vendor> }) =>
      updateVendor(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.vendors });
    },
  });

  const vendorRemoveMutation = useMutation({
    mutationFn: removeVendor,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.vendors });
    },
  });

  const profitMutation = useMutation({
    mutationFn: updateProfitSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit });
    },
  });

  const promotionCreateMutation = useMutation({
    mutationFn: createPromotion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit });
    },
  });

  const promotionUpdateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Promotion> }) =>
      updatePromotion(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit });
    },
  });

  const discountCreateMutation = useMutation({
    mutationFn: createDiscount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit });
    },
  });

  const discountUpdateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Discount> }) =>
      updateDiscount(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit });
    },
  });

  const couponCreateMutation = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit });
    },
  });

  const couponUpdateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Coupon> }) =>
      updateCoupon(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit });
    },
  });

  const couponRemoveMutation = useMutation({
    mutationFn: removeCoupon,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profit });
    },
  });

  const orderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateAdminOrderStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders });
    },
  });

  const orderCancelMutation = useMutation({
    mutationFn: cancelAdminOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders });
    },
  });

  const orderRefundMutation = useMutation({
    mutationFn: refundAdminOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders });
    },
  });

  const profit = profitQuery.data ?? EMPTY_PROFIT;
  const vendors = vendorsQuery.data ?? [];

  const updateCatalogItemFn = useCallback(
    async <K extends keyof AdminCatalog>(
      key: K,
      id: string,
      patch: Partial<AdminCatalog[K][number]>,
    ) => {
      await catalogMutation.mutateAsync({ key, id, patch });
    },
    [catalogMutation],
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
    }) => vendorCreateMutation.mutateAsync(input),
    [vendorCreateMutation],
  );

  const updateVendorFn = useCallback(
    async (id: string, patch: Partial<Vendor>) => {
      await vendorUpdateMutation.mutateAsync({ id, patch });
    },
    [vendorUpdateMutation],
  );

  const removeVendorFn = useCallback(
    async (id: string) => {
      await vendorRemoveMutation.mutateAsync(id);
    },
    [vendorRemoveMutation],
  );

  const updateProfitFn = useCallback(
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
      await profitMutation.mutateAsync(patch);
    },
    [profitMutation],
  );

  const togglePromotion = useCallback(
    async (id: string) => {
      const promo = profit.promotions.find((p) => p.id === id);
      if (!promo) return;
      await promotionUpdateMutation.mutateAsync({
        id,
        patch: { active: !promo.active },
      });
    },
    [profit.promotions, promotionUpdateMutation],
  );

  const addPromotion = useCallback(
    async (input: { name: string; description: string }) => {
      await promotionCreateMutation.mutateAsync(input);
    },
    [promotionCreateMutation],
  );

  const toggleDiscount = useCallback(
    async (id: string) => {
      const discount = profit.discounts.find((d) => d.id === id);
      if (!discount) return;
      await discountUpdateMutation.mutateAsync({
        id,
        patch: { active: !discount.active },
      });
    },
    [profit.discounts, discountUpdateMutation],
  );

  const addDiscount = useCallback(
    async (input: {
      name: string;
      type: Discount["type"];
      value: number;
      minQty: number;
    }) => {
      await discountCreateMutation.mutateAsync(input);
    },
    [discountCreateMutation],
  );

  const toggleCoupon = useCallback(
    async (id: string) => {
      const coupon = profit.coupons.find((c) => c.id === id);
      if (!coupon) return;
      await couponUpdateMutation.mutateAsync({
        id,
        patch: { active: !coupon.active },
      });
    },
    [profit.coupons, couponUpdateMutation],
  );

  const addCouponFn = useCallback(
    async (input: {
      code: string;
      type: Coupon["type"];
      value: number;
    }) => {
      await couponCreateMutation.mutateAsync(input);
    },
    [couponCreateMutation],
  );

  const removeCouponFn = useCallback(
    async (id: string) => {
      await couponRemoveMutation.mutateAsync(id);
    },
    [couponRemoveMutation],
  );

  const updateOrderStatusFn = useCallback(
    async (id: string, status: OrderStatus) => {
      await orderStatusMutation.mutateAsync({ id, status });
    },
    [orderStatusMutation],
  );

  const cancelOrderFn = useCallback(
    async (id: string) => {
      await orderCancelMutation.mutateAsync(id);
    },
    [orderCancelMutation],
  );

  const refundOrderFn = useCallback(
    async (id: string) => {
      await orderRefundMutation.mutateAsync(id);
    },
    [orderRefundMutation],
  );

  const value = useMemo<AdminContextValue>(
    () => ({
      ready,
      isFetching:
        catalogQuery.isFetching ||
        vendorsQuery.isFetching ||
        profitQuery.isFetching ||
        ordersQuery.isFetching,
      error,
      catalog: catalogQuery.data ?? EMPTY_CATALOG,
      vendors,
      profit,
      orders: ordersQuery.data?.items ?? [],
      refresh,
      updateCatalogItem: updateCatalogItemFn,
      addVendor,
      updateVendor: updateVendorFn,
      removeVendor: removeVendorFn,
      updateProfit: updateProfitFn,
      togglePromotion,
      addPromotion,
      toggleDiscount,
      addDiscount,
      toggleCoupon,
      addCoupon: addCouponFn,
      removeCoupon: removeCouponFn,
      updateOrderStatus: updateOrderStatusFn,
      cancelOrder: cancelOrderFn,
      refundOrder: refundOrderFn,
    }),
    [
      ready,
      catalogQuery.isFetching,
      catalogQuery.data,
      vendorsQuery.isFetching,
      profitQuery.isFetching,
      ordersQuery.isFetching,
      ordersQuery.data,
      error,
      vendors,
      profit,
      refresh,
      updateCatalogItemFn,
      addVendor,
      updateVendorFn,
      removeVendorFn,
      updateProfitFn,
      togglePromotion,
      addPromotion,
      toggleDiscount,
      addDiscount,
      toggleCoupon,
      addCouponFn,
      removeCouponFn,
      updateOrderStatusFn,
      cancelOrderFn,
      refundOrderFn,
    ],
  );

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
