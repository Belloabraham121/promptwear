import { api } from "@/lib/api/client";
import type { AdminGarment, ProductColor } from "@/lib/admin/types";

export function getPublicColors() {
  return api.get<ProductColor[]>("/catalog/colors");
}

export function getPublicGarments() {
  return api.get<AdminGarment[]>("/catalog/garments");
}
