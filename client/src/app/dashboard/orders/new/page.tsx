"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  EmptyState,
  PageHeader,
  PrimaryLink,
} from "@/components/dashboard/ui";
import { validateCoupon } from "@/lib/api/coupons";
import { postQuote, type QuoteResponse } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/errors";
import {
  emptySizes,
  formatNaira,
  totalQuantity,
} from "@/lib/dashboard/pricing";
import {
  PAYMENT_LABELS,
  PRINT_LABELS,
  QUALITY_LABELS,
  SIZES,
  type GarmentQuality,
  type PaymentMethod,
  type PrintMethod,
  type SizeBreakdown,
  type SizeKey,
} from "@/lib/dashboard/types";
import { SELECTION_STRATEGY_LABELS } from "@/lib/pricing/engine";
import { cn } from "@/lib/utils";

const EMPTY_QUOTE: QuoteResponse = {
  qty: 0,
  strategy: "lowest_cost",
  marginPct: 0,
  fulfillmentCost: 0,
  marginAmount: 0,
  subtotal: 0,
  delivery: 0,
  total: 0,
  productionDays: 0,
  deliveryDays: 0,
  vendor: null,
  candidates: [],
  overridden: false,
  discountAmount: 0,
  grandTotal: 0,
};

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, designs, user, placeOrder } = useDashboard();

  const preset = searchParams.get("design") ?? "";
  const [designId, setDesignId] = useState(preset);
  const [quality, setQuality] = useState<GarmentQuality>("standard");
  const [print, setPrint] = useState<PrintMethod>("dtf");
  const [sizes, setSizes] = useState<SizeBreakdown>(emptySizes());
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("Lagos");
  const [state, setState] = useState("Lagos");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("card");

  const [quote, setQuote] = useState<QuoteResponse>(EMPTY_QUOTE);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!designId && designs[0]) {
      setDesignId(designs[0].id);
    }
  }, [designId, designs]);

  useEffect(() => {
    if (!ready) return;
    setFullName((prev) => prev || user.name || "");
    setEmail((prev) => prev || user.email || "");
  }, [ready, user.name, user.email]);

  const design =
    designs.find((d) => d.id === designId) ?? designs[0] ?? null;

  const quoteInputKey = useMemo(
    () =>
      JSON.stringify({
        quality,
        print,
        sizes,
        city,
        state,
        couponCode: couponCode.trim().toUpperCase(),
      }),
    [quality, print, sizes, city, state, couponCode],
  );

  useEffect(() => {
    if (!ready) return;

    const qty = totalQuantity(sizes);
    if (qty <= 0) {
      setQuote(EMPTY_QUOTE);
      setQuoteError(null);
      setCouponMessage(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setQuoteLoading(true);
        setQuoteError(null);
        setCouponMessage(null);

        const trimmedCoupon = couponCode.trim();
        try {
          const nextQuote = await postQuote({
            quality,
            print,
            sizes,
            deliveryCity: city,
            deliveryState: state,
            couponCode: trimmedCoupon || undefined,
          });

          if (trimmedCoupon) {
            const validation = await validateCoupon({
              code: trimmedCoupon,
              orderTotal: nextQuote.total,
            });
            setCouponMessage(
              `Coupon applied — save ${formatNaira(validation.discountAmount)}`,
            );
          }

          if (!controller.signal.aborted) {
            setQuote(nextQuote);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            setQuote(EMPTY_QUOTE);
            const message =
              error instanceof ApiError
                ? error.message
                : "Could not fetch quote";
            if (trimmedCoupon) {
              setCouponMessage(message);
              setQuoteError(null);
            } else {
              setQuoteError(message);
            }
          }
        } finally {
          if (!controller.signal.aborted) {
            setQuoteLoading(false);
          }
        }
      })();
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [ready, quoteInputKey, quality, print, sizes, city, state, couponCode]);

  const displayTotal =
    quote.discountAmount > 0 ? quote.grandTotal : quote.total;

  function setSize(size: SizeKey, value: number) {
    setSizes((prev) => ({
      ...prev,
      [size]: Math.max(0, Math.min(500, value)),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!design || quote.qty <= 0) return;
    if (!fullName.trim() || !email.trim() || !phone.trim() || !line1.trim()) {
      return;
    }
    if (paymentMethod === "wallet") return;

    setSubmitting(true);
    try {
      const trimmedCoupon = couponCode.trim();
      const order = await placeOrder({
        designId: design.id,
        quality,
        print,
        sizes,
        couponCode: trimmedCoupon || undefined,
        note: note.trim() || undefined,
        checkout: {
          contact: {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
          address: {
            line1: line1.trim(),
            line2: line2.trim() || undefined,
            city: city.trim(),
            state: state.trim(),
            postalCode: postalCode.trim() || undefined,
            country: "NG",
          },
          paymentMethod,
        },
      });
      router.push(`/dashboard/orders/${order.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-[#c8c4b8]">Loading…</p>;
  }

  if (designs.length === 0) {
    return (
      <div>
        <PageHeader title="New order" />
        <EmptyState
          title="Save a design first"
          body="Orders start from a design in your studio. Create one, then come back to quote sizes and quality."
          action={<PrimaryLink href="/dashboard/studio">Open studio</PrimaryLink>}
        />
      </div>
    );
  }

  const checkoutReady =
    fullName.trim() &&
    email.trim() &&
    phone.trim() &&
    line1.trim() &&
    city.trim() &&
    state.trim() &&
    paymentMethod !== "wallet";

  return (
    <div>
      <PageHeader
        title="Checkout"
        description="Configure your run, enter delivery details, and get a single transparent price from the server pricing engine."
      />

      <form
        onSubmit={handleSubmit}
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]"
      >
        <div className="space-y-8">
          <section className="space-y-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em]">
              Product
            </h2>

            <label className="block">
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                Design
              </span>
              <select
                value={design?.id ?? ""}
                onChange={(e) => setDesignId(e.target.value)}
                className="mt-2 w-full border border-[#f3f0e8]/15 bg-[#070807] px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
              >
                {designs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                Sizes & quantities
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {SIZES.map((size) => (
                  <label key={size} className="border border-[#f3f0e8]/12 p-3">
                    <span className="block text-xs text-[#c8c4b8]">{size}</span>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={sizes[size]}
                      onChange={(e) =>
                        setSize(size, Number(e.target.value) || 0)
                      }
                      className="mt-2 w-full bg-transparent text-lg font-semibold outline-none"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-sm text-[#f3f0e8]">
                Total pieces:{" "}
                <span className="font-semibold text-[#d6ff3c]">
                  {totalQuantity(sizes)}
                </span>
              </p>
            </fieldset>

            <fieldset>
              <legend className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                Cloth quality
              </legend>
              <div className="mt-3 grid gap-2">
                {(Object.keys(QUALITY_LABELS) as GarmentQuality[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setQuality(key)}
                    className={cn(
                      "border px-3 py-3 text-left text-sm transition",
                      quality === key
                        ? "border-[#d6ff3c] bg-[#d6ff3c]/10"
                        : "border-[#f3f0e8]/15 hover:border-[#f3f0e8]/35",
                    )}
                  >
                    {QUALITY_LABELS[key]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                Print method
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(Object.keys(PRINT_LABELS) as PrintMethod[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPrint(key)}
                    className={cn(
                      "border px-3 py-3 text-left text-sm transition",
                      print === key
                        ? "border-[#d6ff3c] bg-[#d6ff3c]/10"
                        : "border-[#f3f0e8]/15 hover:border-[#f3f0e8]/35",
                    )}
                  >
                    <span className="font-semibold">{PRINT_LABELS[key]}</span>
                    <span className="mt-1 block text-xs text-[#c8c4b8]">
                      {key === "screen"
                        ? "Best for bulk (setup under 12 pcs)"
                        : "Great for 1–50 pieces"}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                Coupon code (optional)
              </span>
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm uppercase outline-none focus:border-[#d6ff3c]"
              />
              {couponMessage ? (
                <p
                  className={cn(
                    "mt-2 text-xs",
                    couponMessage.startsWith("Coupon applied")
                      ? "text-[#d6ff3c]"
                      : "text-red-300",
                  )}
                >
                  {couponMessage}
                </p>
              ) : null}
            </label>
          </section>

          <section className="space-y-4 border-t border-[#f3f0e8]/10 pt-8">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em]">
              Delivery & contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  Full name
                </span>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
                />
              </label>
              <label className="block">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  Email
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
                />
              </label>
              <label className="block">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  Phone
                </span>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  Address line 1
                </span>
                <input
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  Address line 2
                </span>
                <input
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
                />
              </label>
              <label className="block">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  City
                </span>
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
                />
              </label>
              <label className="block">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  State
                </span>
                <input
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
                />
              </label>
              <label className="block">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
                  Postal code
                </span>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="mt-2 w-full border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 border-t border-[#f3f0e8]/10 pt-8">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em]">
              Payment
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((key) => {
                const disabled = key === "wallet";
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPaymentMethod(key)}
                    className={cn(
                      "border px-3 py-3 text-left text-sm transition",
                      disabled
                        ? "cursor-not-allowed border-[#f3f0e8]/8 opacity-45"
                        : paymentMethod === key
                          ? "border-[#d6ff3c] bg-[#d6ff3c]/10"
                          : "border-[#f3f0e8]/15 hover:border-[#f3f0e8]/35",
                    )}
                  >
                    <span className="font-semibold">{PAYMENT_LABELS[key]}</span>
                    <span className="mt-1 block text-xs text-[#c8c4b8]">
                      {disabled
                        ? "Coming soon"
                        : key === "card"
                          ? "Offline — no charge yet"
                          : "Offline — transfer details later"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
              Order note (optional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Delivery notes, event date, packing prefs…"
              className="mt-2 w-full resize-y border border-[#f3f0e8]/15 bg-transparent px-3 py-3 text-sm outline-none focus:border-[#d6ff3c]"
            />
          </label>
        </div>

        <aside className="h-fit border border-[#f3f0e8]/12 bg-[#0c0e0c] p-5 lg:sticky lg:top-24">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#c8c4b8]">
            Your price
          </p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.04em] text-[#d6ff3c]">
            {quoteLoading
              ? "…"
              : quote.qty > 0
                ? formatNaira(displayTotal)
                : "—"}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#c8c4b8]">Subtotal</dt>
              <dd>{formatNaira(quote.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#c8c4b8]">Delivery</dt>
              <dd>{formatNaira(quote.delivery)}</dd>
            </div>
            {quote.discountAmount > 0 ? (
              <div className="flex justify-between gap-3 text-[#d6ff3c]">
                <dt>Discount</dt>
                <dd>-{formatNaira(quote.discountAmount)}</dd>
              </div>
            ) : null}
          </dl>

          {quote.vendor ? (
            <div className="mt-4 space-y-1 border-t border-[#f3f0e8]/10 pt-4 text-xs text-[#c8c4b8]">
              <p>
                Est.{" "}
                <span className="text-[#f3f0e8]">
                  {quote.deliveryDays} days
                </span>{" "}
                · rule{" "}
                <span className="text-[#f3f0e8]">
                  {SELECTION_STRATEGY_LABELS[quote.strategy]}
                </span>
              </p>
              {quote.overridden ? (
                <p className="text-[#d6ff3c]">Admin vendor override active</p>
              ) : null}
            </div>
          ) : quote.qty > 0 && !quote.vendor ? (
            <p className="mt-4 text-xs text-red-300">
              No eligible vendor for this config — adjust quality, print, or
              city.
            </p>
          ) : null}

          {quoteError ? (
            <p className="mt-4 text-xs text-red-300">{quoteError}</p>
          ) : null}

          <button
            type="submit"
            disabled={
              submitting ||
              quoteLoading ||
              quote.qty <= 0 ||
              !checkoutReady ||
              !quote.vendor
            }
            className="mt-6 w-full bg-[#d6ff3c] px-4 py-3 text-xs font-bold uppercase tracking-[0.06em] text-[#070807] transition hover:bg-[#e2ff6a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Placing…" : "Place order"}
          </button>
          <p className="mt-3 text-[0.65rem] leading-relaxed text-[#c8c4b8]">
            Payment is collected offline — no card or transfer is processed in
            this release.
          </p>
        </aside>
      </form>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#c8c4b8]">Loading…</p>}>
      <NewOrderForm />
    </Suspense>
  );
}
