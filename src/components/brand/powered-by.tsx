import { cn } from "@/lib/cn";

/** Quiet maker's mark — present on every surface's edge, never competing with the content. */
export function PoweredBy({ tone = "default", className }: { tone?: "default" | "light"; className?: string }) {
  return (
    <span dir="ltr" className={cn("inline-flex select-none items-center gap-1.5 text-[0.6875rem] tracking-[0.08em]", tone === "light" ? "text-ivory/35" : "text-text-3", className)}>
      <span className="uppercase">Powered by</span>
      <span className={cn("font-semibold tracking-[0.04em]", tone === "light" ? "text-ivory/55" : "text-text-2")}>JqAlshalan</span>
    </span>
  );
}
