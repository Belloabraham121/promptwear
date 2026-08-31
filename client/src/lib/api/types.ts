export type UserRole = "customer" | "admin";

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  guest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}
