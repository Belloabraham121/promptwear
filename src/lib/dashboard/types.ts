export type DesignMethod = "prompt" | "draw" | "hybrid";

export type PatternPanel =
  | "front"
  | "back"
  | "sleeveL"
  | "sleeveR"
  | "collar";

export type StudioBackground = "ink" | "bone" | "white" | "grid";

export type DesignStatus = "draft" | "saved" | "ordered";

/** Fabric.js canvas JSON per pattern panel (serialized). */
export type PanelJson = Record<string, unknown> | null;

export type Design = {
  id: string;
  title: string;
  prompt: string;
  method: DesignMethod;
  color: string;
  background: StudioBackground;
  status: DesignStatus;
  /** Studio garment mesh — classic (full panels) or oversized (CLO) */
  garmentId: "classic" | "oversized";
  activePanel: PatternPanel;
  panels: Record<PatternPanel, PanelJson>;
  /** IndexedDB asset id for PNG/JPEG thumbnail */
  thumbnailAssetId?: string;
  chat: { role: "user" | "assistant"; text: string; at: string }[];
  createdAt: string;
  updatedAt: string;
};

export type GarmentQuality = "standard" | "premium" | "heavy";
export type PrintMethod = "dtf" | "screen";
export type OrderStatus =
  | "draft"
  | "quoted"
  | "paid"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

export type SizeKey = "S" | "M" | "L" | "XL" | "XXL";

export type SizeBreakdown = Record<SizeKey, number>;

export type OrderLine = {
  designId: string;
  designTitle: string;
  color: string;
  quality: GarmentQuality;
  print: PrintMethod;
  sizes: SizeBreakdown;
};

export type Order = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  line: OrderLine;
  subtotal: number;
  delivery: number;
  total: number;
  note?: string;
};

export type DashboardUser = {
  name: string;
  email: string;
  guest: boolean;
};

export const SIZES: SizeKey[] = ["S", "M", "L", "XL", "XXL"];

export const PATTERN_PANELS: PatternPanel[] = [
  "front",
  "back",
  "sleeveL",
  "sleeveR",
  "collar",
];

export const PANEL_LABELS: Record<PatternPanel, string> = {
  front: "Front",
  back: "Back",
  sleeveL: "Left sleeve",
  sleeveR: "Right sleeve",
  collar: "Collar",
};

export const EMPTY_PANELS = (): Record<PatternPanel, PanelJson> => ({
  front: null,
  back: null,
  sleeveL: null,
  sleeveR: null,
  collar: null,
});

export const QUALITY_LABELS: Record<GarmentQuality, string> = {
  standard: "Standard cotton",
  premium: "Premium ringspun",
  heavy: "Heavyweight 220gsm",
};

export const PRINT_LABELS: Record<PrintMethod, string> = {
  dtf: "DTF print",
  screen: "Screen print",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  quoted: "Quoted",
  paid: "Paid",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const DESIGN_STATUS_LABELS: Record<DesignStatus, string> = {
  draft: "Draft",
  saved: "Design",
  ordered: "Ordered",
};
