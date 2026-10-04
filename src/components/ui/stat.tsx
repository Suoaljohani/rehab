import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Stat({
  label,
  value,
  hint,
  icon,
  href,
  tone = "default",
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  href?: string;
  tone?: "default" | "attention" | "sage" | "ink";
  trend?: ReactNode;
}) {
  const body = (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-[var(--radius-xl)] border p-5 transition-[box-shadow,transform,border-color] duration-300",
        tone === "default" && "border-line/80 bg-surface shadow-[var(--shadow-sm)]",
        tone === "attention" && "border-clay-200 bg-clay-50",
        tone === "sage" && "surface-sage border-sage-200",
        tone === "ink" && "surface-ink border-white/5 text-ivory",
        href && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("text-[0.8125rem]", tone === "ink" ? "text-ivory/70" : "text-text-2")}>{label}</div>
        {icon && (
          <span
            className={cn(
              "grid size-9 place-items-center rounded-[11px]",
              tone === "attention" ? "bg-clay-100 text-clay-600" : tone === "ink" ? "bg-white/10 text-ivory" : tone === "sage" ? "bg-white/60 text-sage-700" : "bg-sand-100 text-slate-600",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className={cn("mt-3 font-display text-[2rem] font-semibold leading-none tabular", tone === "ink" ? "text-ivory" : "text-ink")}>{value}</div>
      {(hint || trend) && (
        <div className={cn("mt-2.5 flex items-center gap-2 text-xs", tone === "ink" ? "text-ivory/60" : "text-text-2")}>
          {trend}
          {hint}
        </div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full focus-visible:outline-2">
      {body}
    </Link>
  ) : (
    body
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[0.8125rem] font-medium text-sage-700">{eyebrow}</div>}
        <h1 className="font-display text-[1.875rem] font-semibold leading-tight text-ink sm:text-[2.125rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-text-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3.5 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[1.0625rem] font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function DescriptionList({ items, columns = 2 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-4", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs text-text-2">{it.label}</dt>
          <dd className="mt-1 text-[0.9375rem] text-ink">{it.value ?? <span className="text-text-3">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
