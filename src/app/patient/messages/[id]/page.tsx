import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Dumbbell } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ThreadMessages, type Msg } from "@/components/messages/thread-view";
import { Composer } from "@/components/messages/composer";
import { MarkRead } from "@/components/messages/mark-read";
import { ArchiveButton } from "@/components/messages/archive-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { THREAD_CATEGORY } from "@/lib/status";

export const metadata: Metadata = { title: "محادثة" };

export default async function PatientThread({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(["patient"], "patient");
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase.from("message_threads").select("id, subject, category, status, program_exercise:program_exercises(id, exercise_version:exercise_versions(name))").eq("id", id).maybeSingle();
  if (!t) notFound();
  const [{ data: msgs }, { data: read }] = await Promise.all([
    supabase.from("messages").select("id, body, created_at, sender_id, sender:profiles(full_name, role)").eq("thread_id", id).order("created_at"),
    supabase.from("thread_reads").select("archived").eq("thread_id", id).eq("user_id", viewer.id).maybeSingle(),
  ]);
  const ex = t.program_exercise as unknown as { id: string; exercise_version: { name: string } } | null;
  return (
    <div className="space-y-5">
      <MarkRead threadId={id} />
      <div className="flex items-center justify-between">
        <Link href="/patient/messages" className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> الرسائل</Link>
        <ArchiveButton threadId={id} archived={!!read?.archived} />
      </div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.subject}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge map={THREAD_CATEGORY} value={t.category} size="sm" />
          {ex && <Link href={`/patient/plan/exercise/${ex.id}`} className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2.5 py-0.5 text-xs text-sage-700 ring-1 ring-sage-200"><Dumbbell size={12} /> {ex.exercise_version.name}</Link>}
        </div>
      </div>
      <div className="rounded-[26px] border border-line/60 bg-surface-soft/40 p-4 sm:p-6"><ThreadMessages messages={(msgs ?? []) as unknown as Msg[]} viewerId={viewer.id} /></div>
      <Composer threadId={id} disabled={t.status === "archived"} />
    </div>
  );
}
