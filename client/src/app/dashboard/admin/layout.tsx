"use client";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminProvider } from "@/components/admin/AdminProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGate>
      <AdminProvider>{children}</AdminProvider>
    </AdminGate>
  );
}
