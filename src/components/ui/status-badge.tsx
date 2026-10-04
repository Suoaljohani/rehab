import { Badge } from "./badge";
import { statusOf } from "@/lib/status";

export function StatusBadge({ map, value, size }: { map: Record<string, { label: string; tone: import("./badge").BadgeTone }>; value?: string | null; size?: "sm" | "md" }) {
  const s = statusOf(map, value);
  return (
    <Badge tone={s.tone} dot size={size}>
      {s.label}
    </Badge>
  );
}
