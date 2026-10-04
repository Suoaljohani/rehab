import { Avatar } from "@/components/ui/avatar";
import { fDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export type Msg = { id: string; body: string; created_at: string; sender_id: string; sender?: { full_name: string; role: string } | null };

export function ThreadMessages({ messages, viewerId }: { messages: Msg[]; viewerId: string }) {
  return (
    <ol className="space-y-4" aria-label="الرسائل">
      {messages.map((m) => {
        const mine = m.sender_id === viewerId;
        const staff = m.sender?.role && m.sender.role !== "patient";
        return (
          <li key={m.id} className={cn("flex items-end gap-2.5", mine ? "flex-row" : "flex-row-reverse")}>
            {!mine && <Avatar name={m.sender?.full_name} size="sm" />}
            <div className={cn("max-w-[82%]", mine ? "items-start" : "items-end")}>
              {!mine && <div className="mb-1 px-1 text-xs text-text-2">{m.sender?.full_name}{staff ? " · فريق الرعاية" : ""}</div>}
              <div className={cn("whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[0.9375rem] leading-relaxed", mine ? "rounded-ee-[6px] bg-slate-600 text-ivory" : "rounded-es-[6px] border border-line bg-surface text-text")}>
                {m.body}
              </div>
              <div className={cn("mt-1 px-1 text-[0.6875rem] text-text-3", mine ? "text-start" : "text-end")}>{fDateTime(m.created_at)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
