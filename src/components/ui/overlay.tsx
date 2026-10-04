"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Accessible modal dialog built on the native <dialog> element (focus trap + Esc for free). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-[var(--radius-2xl)] border border-line bg-surface p-0 text-text shadow-[var(--shadow-lg)] backdrop:bg-ink/35 backdrop:backdrop-blur-[2px] open:animate-[rise_0.35s_var(--ease-calm)]",
        { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size],
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 pb-4 pt-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm text-text-2">{description}</p>}
        </div>
        <button onClick={onClose} className="grid size-9 place-items-center rounded-full text-text-2 hover:bg-sand-100 hover:text-ink" aria-label="إغلاق">
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2.5 border-t border-line-soft bg-[#FCFAF7] px-6 py-4">{footer}</div>}
    </dialog>
  );
}

/** Side drawer (opens from the inline-end edge — left in RTL). */
export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed inset-y-0 end-0 start-auto m-0 h-full max-h-none w-full max-w-lg border-s border-line bg-surface p-0 text-text shadow-[var(--shadow-lg)] backdrop:bg-ink/30 open:flex open:flex-col"
    >
      <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <button onClick={onClose} className="grid size-9 place-items-center rounded-full text-text-2 hover:bg-sand-100" aria-label="إغلاق">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="flex justify-end gap-2.5 border-t border-line-soft px-6 py-4">{footer}</div>}
    </dialog>
  );
}
