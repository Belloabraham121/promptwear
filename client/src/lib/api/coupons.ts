import { api } from "@/lib/api/client";

export type ValidateCouponInput = {
  code: string;
  orderTotal?: number;
};

export type ValidateCouponResponse = {
  valid: true;
  coupon: {
    id: string;
    code: string;
    type: "percent" | "flat";
    value: number;
    expiresAt: string;
  };
  discountAmount: number;
  finalTotal: number;
};

export function validateCoupon(input: ValidateCouponInput) {
  return api.post<ValidateCouponResponse>("/coupons/validate", {
    code: input.code,
    orderTotal:
      input.orderTotal !== undefined ? String(input.orderTotal) : undefined,
  });
}
