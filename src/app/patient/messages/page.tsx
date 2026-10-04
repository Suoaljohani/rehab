import type { Metadata } from "next";
import Link from "next/link";
import { Archive, PenSquare } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { EmergencyNotice } from "@/components/ui/notice";
import { THREAD_CATEGORY } from "@/lib/status";
import { fRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "الرسائل" };

export default async function PatientMessages({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const viewer = await requireRole(["patient"], "patient");
  const { view } = await searchParams;
  const supabase = await createClient();
  const [{ data: threads }, { data: reads }] = await Promise.all([
    supabase.from("message_threads").select("id, subject, category, status, last_message_at, last_sender_role, messages(body, created_at)").eq("patient_id", viewer.patientId!).order("last_message_at", { ascending: false }).order("created_at", { referencedTable: "messages", ascending: false }).limit(1, { referencedTable: "messages" }),
    supabase.from("thread_reads").select("thread_id, last_read_at, archived").eq("user_id", viewer.id),
  ]);
  const rm = new Map((reads ?? []).map((r) => [r.thread_id, r]));
  const archivedView = view === "archived";
  const list = (threads ?? []).filter((t) => !!rm.get(t.id)?.archived === archivedView);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[1.875rem] font-semibold text-ink">الرسائل</h1>
        <ButtonLink href="/patient/messages/new" icon={<PenSquare size={17} />}>رسالة جديدة</ButtonLink>
      </div>
      <LinkTabs variant="pill" items={[{ href: "/patient/messages", label: "الوارد", active: !archivedView }, { href: "/patient/messages?view=archived", label: "الأرشيف", active: archivedView }]} />
      {list.length === 0 ? (
        <Card><EmptyState title={archivedView ? "لا توجد محادثات مؤرشفة" : "لا توجد رسائل"} description="يمكنك سؤال فريق رعايتك عن تمرين أو موعد في أي وقت." icon={archivedView ? <Archive size={24} /> : undefined} /></Card>
      ) : (
        <ul className="overflow-hidden rounded-[22px] border border-line/80 bg-surface">
          {list.map((t) => {
            const r = rm.get(t.id);
            const unread = t.last_sender_role !== "patient" && (!r || new Date(r.last_read_at) < new Date(t.last_message_at));
            const last = (t.messages as { body: string }[])?.[0];
            return (
              <li key={t.id} className="border-b border-line-soft last:border-0">
                <Link href={`/patient/messages/${t.id}`} className="flex gap-3 px-4 py-4 transition hover:bg-[#FCFAF7]">
                  <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", unread ? "bg-clay-500" : "bg-transparent")} aria-label={unread ? "غير مقروءة" : undefined} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("truncate", unread ? "font-semibold text-ink" : "font-medium text-text")}>{t.subject}</span>
                      <span className="shrink-0 text-xs text-text-3">{fRelative(t.last_message_at)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-text-2">{last?.body}</p>
                    <div className="mt-2"><StatusBadge map={THREAD_CATEGORY} value={t.category} size="sm" /></div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <EmergencyNotice compact />
    </div>
  );
}
