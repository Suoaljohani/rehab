import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Calm illustrated empty state. Every list in the product uses this. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  compact,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-full bg-sand-100 animate-[breathe_6s_ease-in-out_infinite]" aria-hidden="true" />
        <div className="relative grid size-16 place-items-center rounded-full border border-sand-200 bg-surface text-sage-600 shadow-[var(--shadow-sm)]">
          {icon ?? <LeafGlyph />}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[0.9375rem] leading-relaxed text-text-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "حدث خطأ غير متوقع",
  description = "نعتذر عن ذلك. يمكنك المحاولة مرة أخرى، وإذا استمرت المشكلة تواصل مع القسم.",
  action,
  kind = "error",
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  kind?: "error" | "offline" | "denied" | "archived" | "expired" | "disabled" | "video";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="mb-5 grid size-16 place-items-center rounded-full border border-clay-100 bg-clay-50 text-clay-600">
        <StateGlyph kind={kind} />
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-[0.9375rem] leading-relaxed text-text-2">{description}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

function StateGlyph({ kind }: { kind: string }) {
  const common = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "offline":
      return (<svg {...common}><path d="M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 5.2-2.7M16.8 10.9A10 10 0 0 1 19 12.5M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" /></svg>);
    case "denied":
      return (<svg {...common}><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>);
    case "archived":
      return (<svg {...common}><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" /></svg>);
    case "expired":
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
    case "disabled":
      return (<svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 12.5-6.6M17 17l4 4M21 17l-4 4" /></svg>);
    case "video":
      return (<svg {...common}><rect x="2.5" y="5" width="14" height="14" rx="2.5" /><path d="m16.5 10 5-3v10l-5-3M3 3l18 18" /></svg>);
    default:
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>);
  }
}

export function LeafGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15Z" />
      <path d="M5 19 13 11" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[10px] bg-sand-100", className)} aria-hidden="true" />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-line/70 bg-surface p-6" aria-busy="true" aria-label="جارٍ التحميل">
      <Skeleton className="mb-4 h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("mb-2.5 h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="جارٍ التحميل">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius-xl)]" />
        ))}
      </div>
      <SkeletonCard lines={5} />
    </div>
  );
}
