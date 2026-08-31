"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { uploadAsset } from "@/lib/api/assets";
import {
  createDesign as createDesignRequest,
  deleteDesign as deleteDesignRequest,
  listDesigns,
  updateDesign as updateDesignRequest,
  type CreateDesignInput,
  type UpdateDesignInput,
} from "@/lib/api/designs";
import {
  createOrder,
  listOrders,
  type CreateOrderInput,
} from "@/lib/api/orders";
import { queryKeys } from "@/lib/api/query-keys";
import type { SafeUser } from "@/lib/api/types";
import type {
  DashboardUser,
  Design,
  DesignMethod,
  Order,
  OrderStatus,
  StudioBackground,
} from "@/lib/dashboard/types";
import { normalizeOrderStatus } from "@/lib/dashboard/types";
import { useAuth } from "@/providers/AuthProvider";

export type SavedAssetResult = {
  id: string;
  url: string;
  mime: string;
  name: string;
};

type DashboardContextValue = {
  ready: boolean;
  user: DashboardUser;
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
  placeOrder: (input: CreateOrderInput) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  setUser: (user: DashboardUser) => Promise<void>;
  saveAsset: (input: {
    blob: Blob;
    mime: string;
    name: string;
    designId?: string;
  }) => Promise<SavedAssetResult>;
  loadAsset: (id: string) => Promise<{ url: string } | undefined>;
  refresh: () => Promise<void>;
};

type OrdersListCache = Awaited<ReturnType<typeof listOrders>>;

const DashboardContext = createContext<DashboardContextValue | null>(null);

function toDashboardUser(
  session: SafeUser | null | undefined,
  override: Partial<DashboardUser> = {},
): DashboardUser {
  if (!session) {
    return {
      name: override.name ?? "Guest",
      email: override.email ?? "",
      guest: override.guest ?? true,
      role: override.role ?? "customer",
    };
  }

  return {
    name: override.name ?? session.name,
    email: override.email ?? session.email,
    guest: override.guest ?? session.guest,
    role: session.role === "admin" ? "admin" : "customer",
  };
}

function toCreateInput(input: {
  title?: string;
  prompt?: string;
  method?: DesignMethod;
  color?: string;
  background?: StudioBackground;
}): CreateDesignInput {
  return {
    title: input.title?.trim() || "Untitled design",
    color: input.color ?? "#1a1e19",
    prompt: input.prompt?.trim() || "",
    method: input.method ?? "draw",
    background: input.background ?? "ink",
    status: "draft",
  };
}

function toUpdateInput(patch: Partial<Design>): UpdateDesignInput {
  const input: UpdateDesignInput = {};

  if (patch.title !== undefined) input.title = patch.title;
  if (patch.color !== undefined) input.color = patch.color;
  if (patch.prompt !== undefined) input.prompt = patch.prompt;
  if (patch.method !== undefined) input.method = patch.method;
  if (patch.background !== undefined) input.background = patch.background;
  if (patch.status !== undefined) input.status = patch.status;
  if (patch.garmentId !== undefined) input.garmentId = patch.garmentId;
  if (patch.activePanel !== undefined) input.activePanel = patch.activePanel;
  if (patch.panels !== undefined) input.panels = patch.panels;
  if (patch.chat !== undefined) input.chat = patch.chat;
  if (patch.thumbnailAssetId !== undefined) {
    input.thumbnailAssetId = patch.thumbnailAssetId;
  }

  return input;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { session, isLoading: authLoading } = useAuth();
  const [userOverride, setUserOverride] = useState<Partial<DashboardUser>>({});

  const designsQuery = useQuery({
    queryKey: queryKeys.designs.list(),
    queryFn: () => listDesigns(),
    enabled: session != null,
  });

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => listOrders(),
    enabled: session != null,
  });

  const createDesignMutation = useMutation({
    mutationFn: createDesignRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.designs.all });
    },
  });

  const updateDesignMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateDesignInput }) =>
      updateDesignRequest(id, patch),
    onSuccess: (design) => {
      queryClient.setQueryData(queryKeys.designs.detail(design.id), design);
      void queryClient.invalidateQueries({ queryKey: queryKeys.designs.all });
    },
  });

  const deleteDesignMutation = useMutation({
    mutationFn: deleteDesignRequest,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.designs.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.designs.all });
    },
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.designs.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
    ]);
  }, [queryClient]);

  const addDesign = useCallback(
    async (input?: {
      title?: string;
      prompt?: string;
      method?: DesignMethod;
      color?: string;
      background?: StudioBackground;
    }) => createDesignMutation.mutateAsync(toCreateInput(input ?? {})),
    [createDesignMutation],
  );

  const updateDesign = useCallback(
    async (id: string, patch: Partial<Design>) => {
      try {
        return await updateDesignMutation.mutateAsync({
          id,
          patch: toUpdateInput(patch),
        });
      } catch {
        return null;
      }
    },
    [updateDesignMutation],
  );

  const removeDesign = useCallback(
    async (id: string) => {
      await deleteDesignMutation.mutateAsync(id);
    },
    [deleteDesignMutation],
  );

  const placeOrder = useCallback(
    async (input: CreateOrderInput) => {
      const order = await createOrder(input, crypto.randomUUID());
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

      const design = designsQuery.data?.items.find((d) => d.id === input.designId);
      if (design && design.status !== "ordered") {
        await updateDesign(input.designId, { status: "ordered" });
      }

      return order;
    },
    [designsQuery.data?.items, queryClient, updateDesign],
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const current = ordersQuery.data?.items.find((o) => o.id === id);
      if (!current) return;

      const nextStatus = normalizeOrderStatus(status);
      const ts = new Date().toISOString();
      const history = [...(current.statusHistory ?? [])];
      if (history[history.length - 1]?.status !== nextStatus) {
        history.push({ status: nextStatus, at: ts });
      }

      const updated: Order = {
        ...current,
        status: nextStatus,
        updatedAt: ts,
        statusHistory: history,
      };

      queryClient.setQueryData<OrdersListCache | undefined>(
        queryKeys.orders.list(),
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((order) =>
              order.id === id ? updated : order,
            ),
          };
        },
      );
    },
    [ordersQuery.data?.items, queryClient],
  );

  const setUser = useCallback(async (user: DashboardUser) => {
    setUserOverride({
      name: user.name,
      email: user.email,
      guest: user.guest,
    });
  }, []);

  const saveAsset = useCallback(
    async (input: {
      blob: Blob;
      mime: string;
      name: string;
      designId?: string;
    }) => {
      const { asset, url } = await uploadAsset(input);
      return {
        id: asset.id,
        url,
        mime: asset.mime,
        name: asset.name,
      };
    },
    [],
  );

  const loadAsset = useCallback(async (id: string) => {
    try {
      const { getAssetDownloadUrl } = await import("@/lib/api/assets");
      const download = await getAssetDownloadUrl(id);
      return { url: download.url };
    } catch {
      return undefined;
    }
  }, []);

  const value = useMemo<DashboardContextValue>(() => {
    const ready =
      !authLoading &&
      session !== undefined &&
      (session == null ||
        (!designsQuery.isLoading && !ordersQuery.isLoading));

    return {
      ready,
      user: toDashboardUser(session, userOverride),
      designs: designsQuery.data?.items ?? [],
      orders: ordersQuery.data?.items ?? [],
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
    authLoading,
    session,
    userOverride,
    designsQuery.data?.items,
    designsQuery.isLoading,
    ordersQuery.data?.items,
    ordersQuery.isLoading,
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
