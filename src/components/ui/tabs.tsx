import Link from "next/link";
import { cn } from "@/lib/cn";

export type TabItem = { href: string; label: string; count?: number; active?: boolean };

/** URL-driven tabs: deep-linkable, server-rendered, keyboard accessible. */
export function LinkTabs({ items, className, variant = "underline" }: { items: TabItem[]; className?: string; variant?: "underline" | "pill" }) {
  if (variant === "pill") {
    return (
      <nav className={cn("inline-flex flex-wrap gap-1 rounded-[14px] border border-line bg-surface-soft/60 p-1", className)} aria-label="تبويبات">
        {items.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-[10px] px-3.5 py-1.5 text-sm transition",
              t.active ? "bg-surface font-medium text-ink shadow-[var(--shadow-xs)]" : "text-text-2 hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[0.6875rem] tabular", t.active ? "bg-slate-50 text-slate-700" : "bg-sand-100")}>{t.count}</span>}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className={cn("scrollbar-calm -mb-px flex gap-1 overflow-x-auto border-b border-line", className)} aria-label="تبويبات">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "relative inline-flex shrink-0 items-center gap-2 px-3.5 pb-3 pt-2 text-sm transition-colors",
            t.active ? "font-semibold text-ink" : "text-text-2 hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-sand-100 px-1.5 text-[0.6875rem] text-text-2 tabular">{t.count}</span>}
          {t.active && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-slate-600" />}
        </Link>
      ))}
    </nav>
  );
}
