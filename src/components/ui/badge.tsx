import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "slate" | "sage" | "clay" | "success" | "warning" | "danger" | "info" | "muted";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-sand-100 text-text border-sand-200",
  slate: "bg-slate-50 text-slate-700 border-slate-100",
  sage: "bg-sage-50 text-sage-700 border-sage-200",
  clay: "bg-clay-50 text-clay-600 border-clay-100",
  success: "bg-success-bg text-success-fg border-success/20",
  warning: "bg-warning-bg text-warning-fg border-warning/25",
  danger: "bg-danger-bg text-danger-fg border-danger/20",
  info: "bg-info-bg text-info-fg border-info/20",
  muted: "bg-[#F4F1ED] text-text-2 border-line",
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-sand-400",
  slate: "bg-slate-600",
  sage: "bg-sage-500",
  clay: "bg-clay-400",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  muted: "bg-disabled",
};

export function Badge({
  tone = "neutral",
  dot,
  children,
  className,
  size = "md",
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-0.5 text-xs",
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
