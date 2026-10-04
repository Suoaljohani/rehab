import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CalendarDays, ClipboardList, Megaphone, MessageCircle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/lib/actions/patient";
import { fRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "الإشعارات" };

const ICON: Record<string, typeof Bell> = { message: MessageCircle, appointment: CalendarDays, appointment_reminder: CalendarDays, program: ClipboardList, announcement: Megaphone };

export default async function Notifications() {
  const viewer = await requireRole(["patient"], "patient");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(50);
  const unread = (data ?? []).some((n) => !n.read_at);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[1.875rem] font-semibold text-ink">الإشعارات</h1>
        {unread && <form action={markAllNotificationsRead}><Button variant="ghost" size="sm">تعليم الكل كمقروء</Button></form>}
      </div>
      {(data ?? []).length === 0 ? <Card><EmptyState icon={<Bell size={24} />} title="لا توجد إشعارات" /></Card> : (
        <ul className="overflow-hidden rounded-[22px] border border-line/80 bg-surface">
          {(data ?? []).map((n) => {
            const I = ICON[n.kind] ?? Bell;
            const body = (
              <div className={cn("flex gap-3 px-4 py-4", !n.read_at && "bg-sage-50/60")}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand-100 text-slate-600"><I size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3"><span className={cn("text-ink", !n.read_at && "font-semibold")}>{n.title}</span><span className="shrink-0 text-xs text-text-3">{fRelative(n.created_at)}</span></div>
                  {n.body && <p className="mt-0.5 text-sm text-text-2">{n.body}</p>}
                </div>
              </div>
            );
            return <li key={n.id} className="border-b border-line-soft last:border-0">{n.link ? <Link href={n.link}>{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
