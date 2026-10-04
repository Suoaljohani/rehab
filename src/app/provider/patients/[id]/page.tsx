import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkTabs } from "@/components/ui/tabs";
import { ErrorState } from "@/components/ui/states";
import { buttonClasses } from "@/components/ui/button";
import { EpisodeStatusControl } from "@/components/provider/record/forms";
import { JourneyTab, MessagesTab, NotesTab, OutcomesTab, OverviewTab, ProgramTab, SessionsTab, type EpisodeCtx } from "@/components/provider/record/tabs";
import { EPISODE_STATUS, CARE_ROLE_LABEL } from "@/lib/status";
import { age, fDate } from "@/lib/format";

export const metadata: Metadata = { title: "ملف المراجع" };

const TABS = [["overview", "نظرة عامة"], ["journey", "الرحلة"], ["sessions", "الجلسات"], ["program", "البرنامج المنزلي"], ["outcomes", "النتائج"], ["messages", "الرسائل"], ["notes", "ملاحظات داخلية"]] as const;

export default async function PatientRecord({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireRole(PROVIDER_AREA_ROLES);
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const supabase = await createClient();
  // Every record open is audited; access is decided by the database, not the URL (§116).
  const { data: allowed } = await supabase.rpc("log_record_access", { p_episode: id });
  const { data: ep } = allowed ? await supabase.from("episodes").select("*, patient:patients(id, full_name, mrn, access_id, date_of_birth, sex, phone), specialty:specialties(name), care_team:care_team_members(provider_id, role, ended_at, provider:profiles!care_team_members_provider_id_fkey(full_name))").eq("id", id).maybeSingle() : { data: null };
  if (!ep) {
    return <ErrorState kind="denied" title="لا تملك صلاحية الوصول لهذا الملف" description="هذا المراجع غير مرتبط بفريق رعايتك. تم تسجيل محاولة الوصول. إذا كنت تحتاج الوصول تواصل مع مشرف القسم." action={<Link href="/provider/patients" className={buttonClasses("primary")}>مراجعيّ</Link>} />;
  }
  const p = ep.patient as unknown as { id: string; full_name: string; mrn: string; access_id: string; date_of_birth: string | null; sex: string | null };
  const team = (ep.care_team as unknown as { provider_id: string; role: string; ended_at: string | null; provider: { full_name: string } }[]).filter((m) => !m.ended_at);
  const primary = team.find((m) => m.role === "primary");
  const canWrite = viewer.role !== "content_reviewer";
  const ctx: EpisodeCtx = { id: ep.id, patient_id: p.id, title: ep.title, status: ep.status, start_date: ep.start_date, referral_reason: ep.referral_reason, diagnosis_summary: ep.diagnosis_summary, main_goal: ep.main_goal, code: ep.code };
  const current = TABS.some(([k]) => k === tab) ? tab : "overview";
  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/provider/patients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> مراجعيّ</Link>
      <header className="surface-travertine mb-6 rounded-[28px] border border-line/60 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar name={p.full_name} size="xl" />
            <div>
              <h1 className="font-display text-[1.875rem] font-semibold leading-tight text-ink">{p.full_name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-2">
                <span dir="ltr">{p.mrn}</span><span>·</span><span>{age(p.date_of_birth) ?? "—"} سنة</span>{p.sex && <><span>·</span><span>{p.sex === "male" ? "ذكر" : "أنثى"}</span></>}<span>·</span><span dir="ltr">{p.access_id}</span>
              </div>
            </div>
          </div>
          {canWrite && <EpisodeStatusControl episodeId={ep.id} status={ep.status} />}
        </div>
        <div className="mt-6 grid gap-4 border-t border-line/60 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs text-text-2">الرحلة التأهيلية</div><div className="mt-0.5 font-medium text-ink">{ep.title}</div><div className="text-xs text-text-3" dir="ltr">{ep.code}</div></div>
          <div><div className="text-xs text-text-2">الحالة</div><div className="mt-1"><StatusBadge map={EPISODE_STATUS} value={ep.status} /></div></div>
          <div><div className="text-xs text-text-2">{CARE_ROLE_LABEL.primary}</div><div className="mt-0.5 font-medium text-ink">{primary?.provider.full_name ?? <span className="text-clay-600">غير معيّن</span>}</div></div>
          <div><div className="text-xs text-text-2">التخصص · البداية</div><div className="mt-0.5 font-medium text-ink">{(ep.specialty as unknown as { name: string })?.name} · {fDate(ep.start_date)}</div></div>
        </div>
      </header>
      <LinkTabs className="mb-6" items={TABS.map(([k, l]) => ({ href: `/provider/patients/${id}?tab=${k}`, label: l, active: current === k }))} />
      {current === "overview" && <OverviewTab ep={ctx} />}
      {current === "journey" && <JourneyTab ep={ctx} />}
      {current === "sessions" && <SessionsTab ep={ctx} viewerId={viewer.id} canWrite={canWrite} />}
      {current === "program" && <ProgramTab ep={ctx} canWrite={canWrite} />}
      {current === "outcomes" && <OutcomesTab ep={ctx} canWrite={canWrite} />}
      {current === "messages" && <MessagesTab ep={ctx} canWrite={canWrite} />}
      {current === "notes" && <NotesTab ep={ctx} viewerId={viewer.id} canWrite={canWrite} />}
    </div>
  );
}
