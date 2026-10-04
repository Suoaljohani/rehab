import { cn } from "@/lib/cn";

/**
 * MASAR mark — a single continuous path rising in an arc (the journey of
 * recovery) resolving into a sage point (the goal reached).
 */
export function LogoMark({ className, tone = "default" }: { className?: string; tone?: "default" | "light" }) {
  const stroke = tone === "light" ? "#F7F3EE" : "#44556B";
  return (
    <svg className={cn("size-9", className)} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="39" height="39" rx="12" fill={tone === "light" ? "rgba(247,243,238,0.08)" : "#F1EAE2"} stroke={tone === "light" ? "rgba(247,243,238,0.16)" : "#E6D5C7"} />
      <path d="M9 28.5c3.2 0 4.6-2.2 6.2-5.6 1.9-4.1 3.7-8.4 8.6-8.4 3.4 0 5.3 1.9 6.7 4.2" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 28.5h11" stroke={stroke} strokeOpacity="0.35" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="31" cy="21.6" r="3.1" fill="#97A88B" />
    </svg>
  );
}

export function Logo({ className, tone = "default", subtitle = true }: { className?: string; tone?: "default" | "light"; subtitle?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark tone={tone} />
      <span className="leading-none">
        <span className={cn("block font-display text-[1.375rem] font-semibold", tone === "light" ? "text-ivory" : "text-ink")}>مَسار</span>
        {subtitle && <span className={cn("mt-1 block text-[0.6875rem] tracking-wide", tone === "light" ? "text-ivory/60" : "text-text-2")}>منصة التأهيل الطبي</span>}
      </span>
    </span>
  );
}
