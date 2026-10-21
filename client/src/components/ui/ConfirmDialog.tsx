"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Kicker } from "@/components/brand/ui";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  tone?: "danger" | "default";
  /** Small masthead label above the title, e.g. "Account". */
  kicker?: string;
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
  kicker,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Start on the safe choice so Enter/Space never confirms by accident.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

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
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        aria-label="Dismiss"
        tabIndex={-1}
        className="absolute inset-0 bg-ink/70 motion-safe:animate-[nf-fade-up_0.2s_ease-out_both]"
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
        className="relative z-10 w-full max-w-md border-t-4 border-ink bg-paper p-6 text-ink motion-safe:animate-[nf-fade-up_0.25s_ease-out_both] sm:border sm:border-t-4 sm:border-ink/15 sm:border-t-ink sm:p-7"
      >
        {kicker ? (
          <Kicker className={tone === "danger" ? "text-red-700" : "text-olive"}>{kicker}</Kicker>
        ) : null}
        <h2
          id="confirm-dialog-title"
          className={cn(
            "m-0 font-heading text-[1.9rem] leading-[0.95] font-extrabold tracking-[-0.05em]",
            kicker && "mt-4",
          )}
        >
          {title}
        </h2>
        <div
          id="confirm-dialog-description"
          className="mt-3 text-[0.95rem] leading-relaxed text-mute"
        >
          {description}
        </div>
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            disabled={confirming}
            onClick={onCancel}
            className="border border-ink/20 px-5 py-3 text-[0.7rem] font-bold tracking-[0.16em] text-ink uppercase transition-colors hover:border-ink disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className={cn(
              "px-5 py-3 text-[0.7rem] font-bold tracking-[0.16em] uppercase transition-colors disabled:opacity-50",
              tone === "danger"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-ink text-bone hover:bg-lime hover:text-ink",
            )}
          >
            {confirming ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
