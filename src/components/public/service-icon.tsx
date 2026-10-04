import { Activity, Hand, MessageSquareText, Sparkles } from "lucide-react";

export function ServiceIcon({ name, size = 22 }: { name?: string | null; size?: number }) {
  if (name === "activity") return <Activity size={size} />;
  if (name === "hand") return <Hand size={size} />;
  if (name === "message") return <MessageSquareText size={size} />;
  return <Sparkles size={size} />;
}
