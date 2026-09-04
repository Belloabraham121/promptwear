"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "font-[family-name:var(--font-body)] border border-[#f3f0e8]/15 bg-[#0c0e0c] text-[#f3f0e8]",
              title: "text-[#f3f0e8]",
              description: "text-[#c8c4b8]",
              error: "border-red-400/30",
              success: "border-[#d6ff3c]/30",
            },
          }}
        />
      </AuthProvider>
    </QueryProvider>
  );
}
