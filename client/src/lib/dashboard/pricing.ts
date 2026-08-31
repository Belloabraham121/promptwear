import type { ProfitSettings, Vendor } from "@/lib/admin/types";
import { runSmartPricing, type SmartQuote } from "@/lib/pricing/engine";
import type {
  GarmentQuality,
  PrintMethod,
  SizeBreakdown,
} from "@/lib/dashboard/types";
import { SIZES } from "@/lib/dashboard/types";

const GARMENT_BASE: Record<GarmentQuality, number> = {
  standard: 4500,
  premium: 6500,
  heavy: 8500,
};

const PRINT_BASE: Record<PrintMethod, number> = {
  dtf: 2500,
  screen: 1800,
};

/** Screen print setup fee kicks in under 12 units (encourages bulk). */
const SCREEN_SETUP = 12000;
const SCREEN_BULK_MIN = 12;

const DELIVERY_FLAT = 2500;
const DELIVERY_BULK = 4500;
const BULK_QTY = 20;

export function totalQuantity(sizes: SizeBreakdown): number {
  return SIZES.reduce((sum, size) => sum + (sizes[size] ?? 0), 0);
}

export function emptySizes(): SizeBreakdown {
  return { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
}

/**
 * Legacy static quote — used as fallback when admin vendors are unavailable.
 * Prefer `quoteSmartOrder` for customer-facing pricing.
 */
export function quoteOrder(input: {
  quality: GarmentQuality;
  print: PrintMethod;
  sizes: SizeBreakdown;
}): { qty: number; subtotal: number; delivery: number; total: number } {
  const qty = totalQuantity(input.sizes);
  if (qty <= 0) {
    return { qty: 0, subtotal: 0, delivery: 0, total: 0 };
  }

  const unit = GARMENT_BASE[input.quality] + PRINT_BASE[input.print];
  let subtotal = unit * qty;

  if (input.print === "screen" && qty < SCREEN_BULK_MIN) {
    subtotal += SCREEN_SETUP;
  }

  if (qty >= BULK_QTY) {
    subtotal = Math.round(subtotal * 0.92);
  }

  const delivery = qty >= BULK_QTY ? DELIVERY_BULK : DELIVERY_FLAT;
  return { qty, subtotal, delivery, total: subtotal + delivery };
}

export function quoteSmartOrder(
  input: {
    quality: GarmentQuality;
    print: PrintMethod;
    sizes: SizeBreakdown;
    deliveryCity?: string;
    deliveryState?: string;
    rush?: boolean;
  },
  vendors?: Vendor[],
  profit?: ProfitSettings,
): SmartQuote | ReturnType<typeof quoteOrder> & { smart?: false } {
  if (vendors && profit && vendors.length > 0) {
    return runSmartPricing(input, vendors, profit);
  }
  return { ...quoteOrder(input), smart: false as const };
}

export function isSmartQuote(
  q: SmartQuote | (ReturnType<typeof quoteOrder> & { smart?: false }),
): q is SmartQuote {
  return "vendor" in q && "candidates" in q;
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
