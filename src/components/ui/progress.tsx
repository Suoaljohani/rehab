import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  max = 100,
  tone = "sage",
  size = "md",
  label,
  className,
}: {
  value: number;
  max?: number;
  tone?: "sage" | "slate" | "clay" | "light";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const track = tone === "light" ? "bg-white/15" : "bg-sage-100";
  const fill = {
    sage: "bg-gradient-to-l from-sage-400 to-sage-500",
    slate: "bg-slate-600",
    clay: "bg-clay-400",
    light: "bg-sage-300",
  }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("w-full overflow-hidden rounded-full", track, { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" }[size], className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-[var(--ease-calm)]", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  stroke = 10,
  tone = "sage",
  children,
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: "sage" | "light" | "slate";
  children?: React.ReactNode;
  label?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const colors = {
    sage: { track: "var(--color-sage-100)", fill: "var(--color-sage-500)" },
    light: { track: "rgba(255,255,255,0.14)", fill: "var(--color-sage-300)" },
    slate: { track: "var(--color-slate-100)", fill: "var(--color-slate-600)" },
  }[tone];
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.fill}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,0.61,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Segmented step indicator (e.g. exercise 2 of 5). */
export function StepDots({ total, current, completed = [] as number[], tone = "sage" }: { total: number; current: number; completed?: number[]; tone?: "sage" | "light" }) {
  return (
    <div className="flex w-full gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => {
        const done = completed.includes(i);
        const active = i === current;
        return (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-500",
              done ? (tone === "light" ? "bg-sage-300" : "bg-sage-500") : active ? (tone === "light" ? "bg-ivory" : "bg-slate-600") : tone === "light" ? "bg-white/15" : "bg-sand-200",
            )}
          />
        );
      })}
    </div>
  );
}
