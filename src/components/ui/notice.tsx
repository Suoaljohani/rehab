import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger" | "neutral" | "sage" | "internal";

const tones: Record<Tone, string> = {
  info: "bg-info-bg border-info/25 text-info-fg",
  success: "bg-success-bg border-success/25 text-success-fg",
  warning: "bg-warning-bg border-warning/30 text-warning-fg",
  danger: "bg-danger-bg border-danger/25 text-danger-fg",
  neutral: "bg-sand-50 border-sand-200 text-text",
  sage: "bg-sage-50 border-sage-200 text-sage-800",
  internal: "bg-[repeating-linear-gradient(135deg,#FBF4EF_0_10px,#F8EEE6_10px_20px)] border-clay-200 text-clay-700",
};

export function Notice({ tone = "neutral", title, children, icon, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-[14px] border px-4 py-3.5 text-sm leading-relaxed", tones[tone], className)} role={tone === "danger" || tone === "warning" ? "alert" : "note"}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && "mt-0.5", "opacity-95")}>{children}</div>}
      </div>
    </div>
  );
}

/** Mandatory patient-safety disclaimer (PRD §20, §119). */
export function EmergencyNotice({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-[14px] border border-clay-200 bg-clay-50 px-4 py-3 text-[0.8125rem] leading-relaxed text-clay-700", className)} role="note">
      <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <path d="M12 3 2.5 19.5h19L12 3Z" /><path d="M12 10v4M12 17h.01" />
      </svg>
      <p>
        {compact ? "المنصة ليست مخصصة للحالات الطارئة." : "المنصة ليست مخصصة للحالات الطارئة. عند وجود حالة طارئة استخدم قنوات الطوارئ المعتمدة أو اتصل بـ 997."}
      </p>
    </div>
  );
}
