import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { LinkTabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { THREAD_CATEGORY } from "@/lib/status";
import { fRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Inbox showing only conversations the viewer is authorised for (RLS). */
export async function StaffInbox({ viewerId, filter, base, activeId }: { viewerId: string; filter?: string; base: string; activeId?: string }) {
  const supabase = await createClient();
  const [{ data: threads }, { data: reads }] = await Promise.all([
    supabase.from("message_threads").select("id, subject, category, status, last_message_at, last_sender_role, patient:patients(full_name), messages(body, created_at)").order("last_message_at", { ascending: false }).order("created_at", { referencedTable: "messages", ascending: false }).limit(1, { referencedTable: "messages" }).limit(100),
    supabase.from("thread_reads").select("thread_id, last_read_at, archived").eq("user_id", viewerId),
  ]);
  const rm = new Map((reads ?? []).map((r) => [r.thread_id, r]));
  const rows = (threads ?? []).map((t) => {
    const r = rm.get(t.id);
    return { ...t, unread: t.last_sender_role === "patient" && (!r || new Date(r.last_read_at) < new Date(t.last_message_at)), archived: !!r?.archived };
  });
  const f = filter ?? "inbox";
  const list = rows.filter((t) => {
    if (f === "archived") return t.archived;
    if (t.archived) return false;
    if (f === "unread") return t.unread;
    if (["exercise_question", "pain", "appointment", "general"].includes(f)) return t.category === f;
    return true;
  });
  const count = (k: string) => rows.filter((t) => !t.archived && (k === "unread" ? t.unread : t.category === k)).length;
  return (
    <div className="flex h-full flex-col">
      <LinkTabs variant="pill" className="mb-4" items={[
        { href: `${base}?f=inbox`, label: "الكل", active: f === "inbox" },
        { href: `${base}?f=unread`, label: "غير مقروءة", active: f === "unread", count: count("unread") },
        { href: `${base}?f=exercise_question`, label: "تمارين", active: f === "exercise_question" },
        { href: `${base}?f=pain`, label: "ألم", active: f === "pain", count: count("pain") || undefined },
        { href: `${base}?f=appointment`, label: "مواعيد", active: f === "appointment" },
        { href: `${base}?f=general`, label: "عامة", active: f === "general" },
        { href: `${base}?f=archived`, label: "الأرشيف", active: f === "archived" },
      ]} />
      {list.length === 0 ? <div className="rounded-[20px] border border-line bg-surface"><EmptyState compact title="لا توجد رسائل" /></div> : (
        <ul className="overflow-hidden rounded-[20px] border border-line/80 bg-surface">
          {list.map((t) => {
            const name = (t.patient as unknown as { full_name: string })?.full_name;
            return (
              <li key={t.id} className="border-b border-line-soft last:border-0">
                <Link href={`/provider/messages/${t.id}?f=${f}`} className={cn("flex gap-3 px-4 py-3.5 transition hover:bg-[#FCFAF7]", activeId === t.id && "bg-slate-50")}>
                  <Avatar name={name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className={cn("truncate text-sm", t.unread ? "font-semibold text-ink" : "text-text")}>{name}</span><span className="shrink-0 text-[0.6875rem] text-text-3">{fRelative(t.last_message_at)}</span></div>
                    <div className={cn("truncate text-sm", t.unread ? "text-ink" : "text-text-2")}>{t.subject}</div>
                    <div className="mt-1 flex items-center gap-2"><StatusBadge map={THREAD_CATEGORY} value={t.category} size="sm" />{t.unread && <span className="size-2 rounded-full bg-clay-500" aria-label="غير مقروءة" />}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
