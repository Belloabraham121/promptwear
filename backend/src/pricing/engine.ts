import type {
  PricingInput,
  ProfitSettings,
  SmartQuote,
  SizeBreakdown,
  Vendor,
  VendorQuote,
  VendorSelectionStrategy,
} from './types';
import { SIZES } from './types';

function totalQuantity(sizes: SizeBreakdown): number {
  return SIZES.reduce((sum, size) => sum + (sizes[size] ?? 0), 0);
}

const DELIVERY_SLA_TARGET_DAYS = 7;
const SCREEN_SETUP = 12000;
const SCREEN_BULK_MIN = 12;

function regionTokens(city?: string, state?: string): string[] {
  return [city, state]
    .filter(Boolean)
    .map((s) => s!.toLowerCase().trim())
    .filter(Boolean);
}

function vendorServesRegion(
  vendor: Vendor,
  city?: string,
  state?: string,
): boolean {
  const regions = vendor.deliveryRegions.map((r) => r.toLowerCase());
  if (regions.some((r) => r.includes('nationwide') || r === 'ng')) {
    return true;
  }
  const tokens = regionTokens(city, state);
  if (tokens.length === 0) return true;
  return tokens.some((token) =>
    regions.some((r) => r.includes(token) || token.includes(r)),
  );
}

function estimateShippingDays(vendor: Vendor, regionMatch: boolean): number {
  const base = Math.max(1, Math.ceil(vendor.deliverySlaDays * 0.35));
  return regionMatch ? base : base + 2;
}

export function evaluateVendor(
  vendor: Vendor,
  input: PricingInput,
  excludedIds: Set<string>,
): VendorQuote {
  const qty = totalQuantity(input.sizes);
  const materialOk = vendor.materialAvailable.includes(input.quality);
  const printMethodOk = vendor.printMethods.includes(input.print);
  const capacityOk = vendor.capacityPerWeek >= qty;
  const regionMatch = vendorServesRegion(
    vendor,
    input.deliveryCity,
    input.deliveryState,
  );
  const excluded = excludedIds.has(vendor.id) || vendor.excluded;

  let reason: string | undefined;
  if (!vendor.active) reason = 'Vendor paused';
  else if (excluded) reason = 'Temporarily excluded';
  else if (!materialOk) reason = 'Material unavailable';
  else if (!printMethodOk) reason = 'Print method unsupported';
  else if (!capacityOk) reason = 'Insufficient capacity';
  else if (qty <= 0) reason = 'No quantity';

  const eligible = !reason;

  const garmentUnit =
    vendor.garmentCostByQuality[input.quality] ??
    Math.round(4500 * vendor.priceIndex);
  const printUnit =
    vendor.printingCostByMethod[input.print] ??
    Math.round(2500 * vendor.priceIndex);

  const garmentCost = Math.round(garmentUnit * qty * vendor.priceIndex);
  let printingCost = Math.round(printUnit * qty * vendor.priceIndex);
  let setupFee = 0;
  if (input.print === 'screen' && qty > 0 && qty < SCREEN_BULK_MIN) {
    setupFee = SCREEN_SETUP;
    printingCost += setupFee;
  }

  const shippingCost =
    qty > 0
      ? Math.round(
          vendor.shippingCostBase +
            vendor.shippingCostPerUnit * qty +
            (regionMatch ? 0 : 1500),
        )
      : 0;

  const fulfillmentCost = garmentCost + printingCost + shippingCost;
  const productionDays = vendor.estimatedProductionDays;
  const shippingDays = estimateShippingDays(vendor, regionMatch);
  const totalDays = productionDays + shippingDays;

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    eligible,
    reason,
    garmentCost,
    printingCost,
    shippingCost,
    setupFee,
    fulfillmentCost,
    qualityScore: vendor.qualityRating,
    customerRating: vendor.customerRating,
    productionDays,
    shippingDays,
    totalDays,
    meetsSla: totalDays <= DELIVERY_SLA_TARGET_DAYS,
    materialOk,
    printMethodOk,
    capacityOk,
    regionMatch,
  };
}

function pickVendor(
  candidates: VendorQuote[],
  strategy: VendorSelectionStrategy,
): VendorQuote | null {
  const eligible = candidates.filter((c) => c.eligible);
  if (eligible.length === 0) return null;

  const ranked = [...eligible].sort((a, b) => {
    if (strategy === 'lowest_cost') {
      if (a.fulfillmentCost !== b.fulfillmentCost) {
        return a.fulfillmentCost - b.fulfillmentCost;
      }
      return b.qualityScore - a.qualityScore;
    }
    if (strategy === 'highest_quality') {
      const aScore = a.qualityScore * 0.6 + a.customerRating * 0.4;
      const bScore = b.qualityScore * 0.6 + b.customerRating * 0.4;
      if (bScore !== aScore) return bScore - aScore;
      return a.fulfillmentCost - b.fulfillmentCost;
    }
    if (a.totalDays !== b.totalDays) return a.totalDays - b.totalDays;
    if (Number(b.meetsSla) !== Number(a.meetsSla)) {
      return Number(b.meetsSla) - Number(a.meetsSla);
    }
    return a.fulfillmentCost - b.fulfillmentCost;
  });

  return ranked[0] ?? null;
}

function clampMargin(pct: number, profit: ProfitSettings): number {
  const min = profit.minMarginPct ?? 10;
  const max = profit.maxMarginPct ?? 60;
  return Math.min(max, Math.max(min, pct));
}

/** Select optimal vendor and apply configurable margin → customer price. */
export function runSmartPricing(
  input: PricingInput,
  vendors: Vendor[],
  profit: ProfitSettings,
): SmartQuote {
  const qty = totalQuantity(input.sizes);
  const strategy = profit.selectionStrategy ?? 'lowest_cost';
  const excluded = new Set(profit.excludedVendorIds ?? []);
  const candidates = vendors.map((v) => evaluateVendor(v, input, excluded));

  let selected: VendorQuote | null = null;
  let overridden = false;

  if (profit.overrideVendorId) {
    const forced = candidates.find(
      (c) => c.vendorId === profit.overrideVendorId,
    );
    if (forced?.eligible) {
      selected = forced;
      overridden = true;
    }
  }

  if (!selected) {
    selected = pickVendor(candidates, strategy);
  }

  if (!selected || qty <= 0) {
    return {
      qty,
      strategy,
      marginPct: 0,
      fulfillmentCost: 0,
      marginAmount: 0,
      subtotal: 0,
      delivery: 0,
      total: 0,
      productionDays: 0,
      deliveryDays: 0,
      vendor: selected,
      candidates,
      overridden,
    };
  }

  const baseMargin = input.rush
    ? profit.rushMarginPct
    : profit.defaultMarginPct;
  const marginPct = clampMargin(baseMargin, profit);
  const fulfillmentCost = selected.fulfillmentCost;
  const marginAmount = Math.round(fulfillmentCost * (marginPct / 100));
  const customerTotal = fulfillmentCost + marginAmount;

  const delivery = selected.shippingCost;
  const subtotal = customerTotal - delivery;

  return {
    qty,
    strategy,
    marginPct,
    fulfillmentCost,
    marginAmount,
    subtotal,
    delivery,
    total: customerTotal,
    productionDays: selected.productionDays,
    deliveryDays: selected.totalDays,
    vendor: selected,
    candidates,
    overridden,
  };
}

export { DELIVERY_SLA_TARGET_DAYS };
