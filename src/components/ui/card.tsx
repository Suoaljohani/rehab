import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "white" | "soft" | "sage" | "ink" | "sand" | "travertine";

const tones: Record<Tone, string> = {
  white: "bg-surface border border-line/80 shadow-[var(--shadow-sm)]",
  soft: "surface-plaster border border-line/60",
  sage: "surface-sage border border-sage-200",
  ink: "surface-ink text-ivory border border-white/5 shadow-[var(--shadow-lg)]",
  sand: "bg-sand-50 border border-sand-200",
  travertine: "surface-travertine border border-line/60",
};

export function Card({
  tone = "white",
  padded = true,
  interactive,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone; padded?: boolean; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)]",
        tones[tone],
        padded && "p-5 sm:p-6",
        interactive &&
          "transition-[box-shadow,transform,border-color] duration-300 ease-[var(--ease-calm)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-sand-300",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-medium tracking-wide text-text-2">{eyebrow}</div>}
        <h3 className="text-[1.0625rem] font-semibold leading-snug text-ink">{title}</h3>
        {description && <p className="mt-1 text-sm text-text-2">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
