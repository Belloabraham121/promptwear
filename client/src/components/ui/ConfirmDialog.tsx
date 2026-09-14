"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirming = false,
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !confirming) {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, confirming, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/70"
        disabled={confirming}
        onClick={() => {
          if (!confirming) onCancel();
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#0b1f1c]/10 bg-white p-5 text-[#0b1f1c] shadow-[0_24px_80px_rgba(11,31,28,0.2)]"
      >
        <h2
          id="confirm-dialog-title"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.03em]"
        >
          {title}
        </h2>
        <div
          id="confirm-dialog-description"
          className="mt-3 text-sm leading-relaxed text-[#52706a]"
        >
          {description}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={confirming}
            onClick={onCancel}
            className="rounded-full border border-[#0b1f1c]/15 px-3.5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[#52706a] transition hover:border-[#0b1f1c]/30 hover:text-[#0b1f1c] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className={cn(
              "rounded-full px-3.5 py-2 text-[0.65rem] font-bold uppercase tracking-[0.08em] transition disabled:opacity-50",
              tone === "danger"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[#0b1f1c] text-white hover:bg-[#14322d]",
            )}
          >
            {confirming ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
