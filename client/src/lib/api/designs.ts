import { api } from "@/lib/api/client";
import type {
  Design,
  DesignMethod,
  DesignStatus,
  PanelJson,
  PatternPanel,
  StudioBackground,
} from "@/lib/dashboard/types";
import { EMPTY_PANELS } from "@/lib/dashboard/types";

export type DesignChatMessage = {
  role: "user" | "assistant";
  text: string;
  at: string;
  imageUrl?: string;
  imageAssetId?: string;
};

export type DesignResponse = {
  id: string;
  title: string;
  prompt: string;
  method: DesignMethod;
  color: string;
  background: StudioBackground;
  status: DesignStatus;
  garmentId: "classic" | "oversized";
  activePanel: PatternPanel;
  panels: Record<PatternPanel, PanelJson>;
  thumbnailAssetId?: string;
  chat: DesignChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type PaginatedDesignsResponse = {
  items: DesignResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CreateDesignInput = {
  title: string;
  color: string;
  prompt?: string;
  method?: DesignMethod;
  background?: StudioBackground;
  status?: DesignStatus;
  garmentId?: "classic" | "oversized";
  activePanel?: PatternPanel;
  panels?: Partial<Record<PatternPanel, PanelJson>>;
  thumbnailAssetId?: string;
  chat?: DesignChatMessage[];
};

export type UpdateDesignInput = Partial<CreateDesignInput> & {
  thumbnailAssetId?: string | null;
};

export type ListDesignsParams = {
  page?: number;
  limit?: number;
  status?: DesignStatus;
};

export function mapDesignFromApi(response: DesignResponse): Design {
  return {
    id: response.id,
    title: response.title,
    prompt: response.prompt,
    method: response.method,
    color: response.color,
    background: response.background,
    status: response.status,
    garmentId: response.garmentId ?? "classic",
    activePanel: response.activePanel ?? "front",
    panels: { ...EMPTY_PANELS(), ...response.panels },
    thumbnailAssetId: response.thumbnailAssetId,
    chat: response.chat ?? [],
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

function designsPath(params?: ListDesignsParams): string {
  if (!params) return "/designs";
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return query ? `/designs?${query}` : "/designs";
}

export function listDesigns(params?: ListDesignsParams) {
  return api.get<PaginatedDesignsResponse>(designsPath(params)).then((response) => ({
    ...response,
    items: response.items.map(mapDesignFromApi),
  }));
}

export function getDesign(id: string) {
  return api.get<DesignResponse>(`/designs/${id}`).then(mapDesignFromApi);
}

export function createDesign(input: CreateDesignInput) {
  return api.post<DesignResponse>("/designs", input).then(mapDesignFromApi);
}

export function updateDesign(id: string, input: UpdateDesignInput) {
  return api.patch<DesignResponse>(`/designs/${id}`, input).then(mapDesignFromApi);
}

export function deleteDesign(id: string) {
  return api.delete<{ id: string }>(`/designs/${id}`);
}

export type { Design };
