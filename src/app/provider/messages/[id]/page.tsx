import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Dumbbell, UserRound } from "lucide-react";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffInbox } from "@/components/messages/staff-inbox";
import { ThreadMessages, type Msg } from "@/components/messages/thread-view";
import { Composer } from "@/components/messages/composer";
import { MarkRead } from "@/components/messages/mark-read";
import { ArchiveButton } from "@/components/messages/archive-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { THREAD_CATEGORY } from "@/lib/status";

export const metadata: Metadata = { title: "محادثة" };

export default async function ProviderThread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string }> }) {
  const viewer = await requireRole(PROVIDER_AREA_ROLES);
  const { id } = await params;
  const { f } = await searchParams;
  const supabase = await createClient();
  const { data: t } = await supabase.from("message_threads").select("id, subject, category, status, episode_id, patient:patients(full_name, mrn), program_exercise:program_exercises(id, exercise_version:exercise_versions(name))").eq("id", id).maybeSingle();
  if (!t) notFound();
  const [{ data: msgs }, { data: read }, { data: templates }] = await Promise.all([
    supabase.from("messages").select("id, body, created_at, sender_id, sender:profiles(full_name, role)").eq("thread_id", id).order("created_at"),
    supabase.from("thread_reads").select("archived").eq("thread_id", id).eq("user_id", viewer.id).maybeSingle(),
    supabase.from("message_templates").select("id, name, body").order("name"),
  ]);
  const p = t.patient as unknown as { full_name: string; mrn: string };
  const ex = t.program_exercise as unknown as { exercise_version: { name: string } } | null;
  return (
    <div className="mx-auto max-w-7xl">
      <MarkRead threadId={id} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        <div className="hidden lg:block"><StaffInbox viewerId={viewer.id} filter={f} base="/provider/messages" activeId={id} /></div>
        <section className="flex min-h-[70dvh] flex-col rounded-[24px] border border-line/80 bg-surface shadow-[var(--shadow-sm)]">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft p-5">
            <div>
              <h1 className="text-lg font-semibold text-ink">{t.subject}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-2">
                {t.episode_id ? <Link href={`/provider/patients/${t.episode_id}`} className="inline-flex items-center gap-1 hover:text-ink hover:underline"><UserRound size={14} />{p.full_name}</Link> : p.full_name}
                <StatusBadge map={THREAD_CATEGORY} value={t.category} size="sm" />
                {ex && <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2 py-0.5 text-xs text-sage-700 ring-1 ring-sage-200"><Dumbbell size={12} /> {ex.exercise_version.name}</span>}
              </div>
            </div>
            <ArchiveButton threadId={id} archived={!!read?.archived} />
          </header>
          <div className="flex-1 overflow-y-auto bg-surface-soft/30 p-5"><ThreadMessages messages={(msgs ?? []) as unknown as Msg[]} viewerId={viewer.id} /></div>
          <div className="border-t border-line-soft p-4"><Composer threadId={id} disabled={t.status === "archived"} templates={templates ?? []} /></div>
        </section>
      </div>
    </div>
  );
}
