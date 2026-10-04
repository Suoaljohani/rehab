import { cn } from "@/lib/cn";

/**
 * Illustrated stand-in for exercise media: an abstract line figure on a warm
 * travertine field. Region decides the pose so the library stays legible even
 * before real videos are uploaded.
 */
const POSES: Record<string, string> = {
  knee: "M70 40a8 8 0 1 0 0.1 0M70 50v32M70 82l26 4M96 86l30-2M70 60l-18 14M70 60l18 12",
  hip: "M60 38a8 8 0 1 0 0.1 0M60 48v34M60 82l-14 34M60 82l36 -18M60 60l-20 10M60 60l20 6",
  back: "M42 70a8 8 0 1 0 0.1 0M52 74h44M96 74l14 30M96 74l-6 32M70 74l-8 26M70 74l14 -22",
  shoulder: "M80 34a8 8 0 1 0 0.1 0M80 44v40M80 84l-12 34M80 84l12 34M80 54l-30 -22M80 54l30 -22",
  neck: "M80 30a9 9 0 1 0 0.1 0M80 41v42M80 83l-12 35M80 83l12 35M80 55l-22 14M80 55l22 14",
  ankle: "M80 26a8 8 0 1 0 0.1 0M80 36v42M80 78l-6 38M80 78l10 34l14 4M80 50l-20 16M80 50l20 16",
  hand: "M50 92c10-30 24-48 40-50M90 42l18-18M90 42l22-6M90 42l20 8M90 42l12 20",
  balance: "M80 28a8 8 0 1 0 0.1 0M80 38v40M80 78l-2 40M80 78l26 10M80 52l-30 8M80 52l30 -8",
  speech: "M64 54a22 22 0 1 0 0.1 0M76 50c6 4 6 12 0 16M96 46c10 8 10 24 0 32M110 40c14 12 14 36 0 48",
  core: "M44 82a8 8 0 1 0 0.1 0M54 84h40M94 84l20 -24M114 60l12 0M70 84l-6 -22M64 62l16 -6",
};

export function ExerciseArt({ region = "knee", className, label, animated = true }: { region?: string | null; className?: string; label?: string; animated?: boolean }) {
  const d = POSES[region ?? "knee"] ?? POSES.knee;
  return (
    <div className={cn("relative overflow-hidden surface-travertine", className)} role="img" aria-label={label ?? "رسم توضيحي للتمرين"}>
      <div className="absolute -end-10 -top-10 size-40 rounded-full bg-sand-200/50 blur-2xl" aria-hidden="true" />
      <div className="absolute -bottom-12 -start-6 size-36 rounded-full bg-sage-200/50 blur-2xl" aria-hidden="true" />
      <svg viewBox="0 0 160 140" className="relative h-full w-full" aria-hidden="true">
        <line x1="20" y1="120" x2="140" y2="120" stroke="#D6BFAC" strokeWidth="1.2" strokeDasharray="2 4" />
        <g className={animated ? "origin-center animate-[breathe_5s_ease-in-out_infinite]" : undefined} style={{ transformBox: "fill-box" }}>
          <path d={d} fill="none" stroke="#44556B" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <circle cx="128" cy="30" r="5" fill="#97A88B" opacity="0.9" />
      </svg>
    </div>
  );
}
