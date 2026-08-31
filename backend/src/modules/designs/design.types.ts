export type DesignMethod = 'prompt' | 'draw' | 'hybrid';

export type PatternPanel =
  | 'front'
  | 'back'
  | 'sleeveL'
  | 'sleeveR'
  | 'collar';

export type StudioBackground = 'ink' | 'bone' | 'white' | 'grid';

export type DesignStatus = 'draft' | 'saved' | 'ordered';

export type PanelJson = Record<string, unknown> | null;

export type DesignChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  at: string;
};

export type DesignResponse = {
  id: string;
  title: string;
  prompt: string;
  method: DesignMethod;
  color: string;
  background: StudioBackground;
  status: DesignStatus;
  garmentId: 'classic' | 'oversized';
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

export const PATTERN_PANELS: PatternPanel[] = [
  'front',
  'back',
  'sleeveL',
  'sleeveR',
  'collar',
];

export const EMPTY_PANELS = (): Record<PatternPanel, PanelJson> => ({
  front: null,
  back: null,
  sleeveL: null,
  sleeveR: null,
  collar: null,
});
