import { cn } from "@/lib/cn";

const palettes = [
  "bg-sage-100 text-sage-700",
  "bg-sand-200 text-clay-700",
  "bg-slate-100 text-slate-700",
  "bg-clay-100 text-clay-700",
  "bg-[#ECE7DF] text-ink",
];

export function initials(name?: string | null) {
  if (!name) return "؟";
  const strip = (w: string) => (w.startsWith("ال") && w.length > 3 ? w.slice(2) : w);
  const parts = name.trim().replace(/^(أ\.|د\.|م\.)\s*/, "").split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (strip(parts[0])[0] ?? "") + " " + (strip(parts[parts.length - 1])[0] ?? "");
}

export function Avatar({ name, size = "md", className }: { name?: string | null; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }) {
  const n = name ?? "";
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  const palette = palettes[h % palettes.length];
  const s = { xs: "size-6 text-[0.625rem]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-20 text-2xl" }[size];
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-surface", palette, s, className)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
