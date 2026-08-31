export const queryKeys = {
  session: () => ["session"] as const,

  designs: {
    all: ["designs"] as const,
    list: (page?: number) => ["designs", { page }] as const,
    detail: (id: string) => ["designs", id] as const,
  },

  assets: {
    download: (assetId: string) => ["assets", assetId] as const,
  },

  orders: {
    all: ["orders"] as const,
    list: (page?: number) => ["orders", { page }] as const,
    detail: (id: string) => ["orders", id] as const,
  },

  quote: (hash: string) => ["quote", hash] as const,

  admin: {
    catalog: ["admin", "catalog"] as const,
    vendors: ["admin", "vendors"] as const,
    profit: ["admin", "profit"] as const,
    orders: ["admin", "orders"] as const,
    analytics: ["admin", "analytics"] as const,
    revenue: (from: string, to: string) =>
      ["admin", "analytics", "revenue", { from, to }] as const,
    bestsellers: ["admin", "analytics", "bestsellers"] as const,
  },

  catalog: {
    colors: ["catalog", "colors"] as const,
    garments: ["catalog", "garments"] as const,
  },
} as const;
