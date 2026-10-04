import Link from "next/link";
import {
  Activity, CalendarCheck2, ClipboardCheck, Dumbbell, Edit3, FileText, Flag, HeartPulse, Lock, MessageCircle, Plus, Sparkles, Target, UserPlus, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOpenFlags } from "@/lib/provider-data";
import { FlagList } from "@/components/provider/flag-list";
import { Card, CardHeader } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { BarChart, LineChart } from "@/components/ui/charts";
import { Notice } from "@/components/ui/notice";
import { Table, TableShell, THead, Th, Tr, Td } from "@/components/ui/table";
import { ExerciseArt } from "@/components/exercise/exercise-art";
import { GoalDialog, IssueAction, NewProgramDialog, NoteDialog, OutcomeForm, ProgramActions, StaffThreadDialog } from "./forms";
import { APPOINTMENT_STATUS, CARE_ROLE_LABEL, DIFFICULTY_LABEL, FEELING_LABEL, ISSUE_REASON, PROGRAM_STATUS, THREAD_CATEGORY } from "@/lib/status";
import { daysLabel, fDate, fDateTime, fRelative, prescription } from "@/lib/format";
import { cn } from "@/lib/cn";

export type EpisodeCtx = {
  id: string; patient_id: string; title: string; status: string; start_date: string; referral_reason: string | null; diagnosis_summary: string | null; main_goal: string | null; code: string;
};

/* ============================ OVERVIEW ============================ */
export async function OverviewTab({ ep }: { ep: EpisodeCtx }) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [flags, { data: adh }, { data: lastAppt }, { data: nextAppt }, { data: prog }, { data: lastSession }, { data: lastIssue }, { data: team }, { data: goals }] = await Promise.all([
    getOpenFlags(ep.id),
    supabase.rpc("adherence", { p_patient: ep.patient_id, p_episode: ep.id }),
    supabase.from("appointments").select("starts_at").eq("episode_id", ep.id).eq("status", "completed").order("starts_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("appointments").select("starts_at, location").eq("episode_id", ep.id).gte("starts_at", now).in("status", ["confirmed", "pending_confirmation"]).order("starts_at").limit(1).maybeSingle(),
    supabase.from("home_programs").select("id, title, status, start_date, end_date").eq("episode_id", ep.id).in("status", ["active", "scheduled", "paused", "draft"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("home_sessions").select("session_date, feeling, patient_note, completed_at").eq("episode_id", ep.id).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("issue_reports").select("reason, comment, created_at").eq("episode_id", ep.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("care_team_members").select("id, role, start_date, provider:profiles!care_team_members_provider_id_fkey(full_name, staff:staff_profiles(title))").eq("episode_id", ep.id).is("ended_at", null),
    supabase.from("goals").select("id, title, baseline, target, current_value, unit, status").eq("episode_id", ep.id).neq("status", "cancelled").order("created_at"),
  ]);
  const a = adh as { rate: number | null; completed: number; eligible: number; session_rate: number | null } | null;
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        {flags.length > 0 && <section><h2 className="mb-3 flex items-center gap-2 font-semibold text-ink"><Flag size={17} className="text-clay-500" /> بحاجة إلى انتباه</h2><FlagList flags={flags} showPatient={false} /></section>}
        <Card>
          <CardHeader title="ملخص الرحلة" />
          <DescriptionList items={[
            { label: "سبب الإحالة", value: ep.referral_reason },
            { label: "التشخيص المختصر", value: ep.diagnosis_summary && <span dir="auto">{ep.diagnosis_summary}</span> },
            { label: "تاريخ بدء الرحلة", value: fDate(ep.start_date) },
            { label: "الهدف الرئيسي", value: ep.main_goal },
            { label: "آخر جلسة حضورية", value: lastAppt ? fDate(lastAppt.starts_at) : null },
            { label: "الجلسة القادمة", value: nextAppt ? `${fDateTime(nextAppt.starts_at)} · ${nextAppt.location ?? ""}` : null },
          ]} />
        </Card>
        <Card>
          <CardHeader title="البرنامج المنزلي الحالي" action={prog && <Link href={`/provider/patients/${ep.id}?tab=program`} className="text-sm text-slate-600 hover:underline">التفاصيل</Link>} />
          {prog ? (
            <div className="flex items-center justify-between gap-4">
              <div><div className="font-medium text-ink">{prog.title}</div><div className="text-sm text-text-2">{fDate(prog.start_date)} — {fDate(prog.end_date)}</div></div>
              <StatusBadge map={PROGRAM_STATUS} value={prog.status} />
            </div>
          ) : <EmptyState compact title="لا يوجد برنامج منزلي نشط" action={<Link href={`/provider/patients/${ep.id}?tab=program`} className="text-sm font-medium text-slate-600 hover:underline">إنشاء برنامج</Link>} />}
        </Card>
        <Card>
          <CardHeader title="الأهداف" action={<GoalDialog episodeId={ep.id} size="sm" variant="quiet"  icon={<Plus size={15} />} label="هدف" />} />
          {(goals ?? []).length === 0 ? <p className="text-sm text-text-2">لم تُحدد أهداف بعد.</p> : (
            <ul className="space-y-4">{(goals ?? []).map((g) => {
              const b = Number(g.baseline ?? 0), t = Number(g.target ?? 0), c = Number(g.current_value ?? b);
              return <li key={g.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-ink">{g.title}</span><span className="text-text-2 tabular">{g.status === "achieved" ? "تحقق ✓" : `${c} / ${t} ${g.unit ?? ""}`}</span></div><ProgressBar value={g.status === "achieved" ? 100 : t === b ? 0 : ((c - b) / (t - b)) * 100} size="sm" label={g.title} /></li>;
            })}</ul>
          )}
        </Card>
      </div>
      <div className="space-y-6">
        <Card tone="sage" className="flex items-center gap-5">
          <ProgressRing value={a?.rate ?? 0} size={96} stroke={9}><span className="font-display text-2xl font-semibold text-ink tabular">{a?.rate ?? "—"}{a?.rate != null ? "٪" : ""}</span></ProgressRing>
          <div><div className="text-sm text-sage-800">الالتزام (آخر ٧ أيام)</div><div className="mt-1 font-semibold text-ink">{a?.completed ?? 0} من {a?.eligible ?? 0} تمرين</div><div className="mt-1 text-xs text-sage-800">التزام الجلسات: {a?.session_rate ?? "—"}٪</div></div>
        </Card>
        <Card>
          <CardHeader title="آخر ملاحظات المراجع" />
          {lastSession ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-text-2">جلسة منزلية {fDate(lastSession.session_date, "short")}</span>{lastSession.feeling && <Badge tone={lastSession.feeling === "worse" ? "danger" : lastSession.feeling === "better" ? "success" : "neutral"} size="sm">{FEELING_LABEL[lastSession.feeling]}</Badge>}</div>
              {lastSession.patient_note && <p className="rounded-[12px] bg-sand-50 p-3 text-text ring-1 ring-sand-200">«{lastSession.patient_note}»</p>}
            </div>
          ) : <p className="text-sm text-text-2">لا توجد جلسات منزلية مكتملة بعد.</p>}
          {lastIssue && <div className="mt-3 border-t border-line-soft pt-3 text-sm"><span className="text-clay-600">آخر بلاغ:</span> {ISSUE_REASON[lastIssue.reason]}{lastIssue.comment ? ` — ${lastIssue.comment}` : ""} <span className="text-xs text-text-3">({fRelative(lastIssue.created_at)})</span></div>}
        </Card>
        <Card>
          <CardHeader title="فريق الرعاية" action={<Users size={17} className="text-text-3" />} />
          <ul className="space-y-3">{(team ?? []).map((m) => {
            const p = m.provider as unknown as { full_name: string; staff: { title: string | null } | null };
            return <li key={m.id} className="flex items-center gap-3"><Avatar name={p.full_name} size="sm" /><div className="flex-1"><div className="text-sm font-medium text-ink">{p.full_name}</div><div className="text-xs text-text-2">{CARE_ROLE_LABEL[m.role]}</div></div></li>;
          })}</ul>
        </Card>
      </div>
    </div>
  );
}

/* ============================ JOURNEY ============================ */
const TL_ICON: Record<string, typeof Activity> = {
  EPISODE_CREATED: Sparkles, CARE_TEAM_UPDATED: UserPlus, PROGRAM_PUBLISHED: Dumbbell, PROGRAM_UPDATED: Edit3, PROGRAM_PAUSED: Dumbbell, PROGRAM_RESUMED: Dumbbell,
  HOME_SESSION_COMPLETED: ClipboardCheck, PATIENT_FEEDBACK: HeartPulse, SESSION_RECORDED: FileText, INTERNAL_NOTE: Lock, MESSAGE_SENT: MessageCircle,
  GOAL_CREATED: Target, GOAL_UPDATED: Target, APPOINTMENT_COMPLETED: CalendarCheck2, APPOINTMENT_NO_SHOW: CalendarCheck2,
};
const TL_TONE: Record<string, string> = { PATIENT_FEEDBACK: "bg-clay-50 text-clay-600 ring-clay-100", HOME_SESSION_COMPLETED: "bg-sage-50 text-sage-700 ring-sage-200", INTERNAL_NOTE: "bg-clay-50 text-clay-600 ring-clay-100", APPOINTMENT_NO_SHOW: "bg-danger-bg text-danger-fg ring-danger/20" };

export async function JourneyTab({ ep }: { ep: EpisodeCtx }) {
  const supabase = await createClient();
  const { data } = await supabase.from("timeline_events").select("id, type, title, detail, created_at, patient_visible, actor:profiles(full_name)").eq("episode_id", ep.id).order("created_at", { ascending: false }).limit(200);
  const groups = new Map<string, NonNullable<typeof data>>();
  (data ?? []).forEach((e) => {
    const k = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(e.created_at));
    groups.set(k, [...(groups.get(k) ?? []), e]);
  });
  if (!data?.length) return <Card><EmptyState title="لا توجد أحداث بعد" /></Card>;
  return (
    <div className="max-w-3xl space-y-8">
      {[...groups.entries()].map(([day, evs]) => (
        <section key={day}>
          <h3 className="sticky top-16 z-10 mb-3 inline-block rounded-full bg-page/90 px-3 py-1 text-sm font-semibold text-ink backdrop-blur">{fDate(day, "day")}</h3>
          <ol className="relative space-y-3 border-s border-line ps-6">
            {evs.map((e) => {
              const I = TL_ICON[e.type] ?? Activity;
              return (
                <li key={e.id} className="relative">
                  <span className={cn("absolute -start-[38px] top-1 grid size-7 place-items-center rounded-full ring-4 ring-page", TL_TONE[e.type] ?? "bg-slate-50 text-slate-600")}><I size={14} /></span>
                  <div className="rounded-[16px] border border-line/70 bg-surface px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-ink">{e.title}</span><span className="text-xs text-text-3">{new Intl.DateTimeFormat("ar-SA-u-nu-latn", { timeZone: "Asia/Riyadh", hour: "numeric", minute: "2-digit" }).format(new Date(e.created_at))}</span></div>
                    {e.detail && <p className="mt-0.5 text-sm text-text-2">{e.detail}</p>}
                    <div className="mt-1.5 flex items-center gap-2 text-[0.6875rem] text-text-3">
                      {(e.actor as unknown as { full_name: string } | null)?.full_name && <span>{(e.actor as unknown as { full_name: string }).full_name}</span>}
                      {!e.patient_visible && <span className="inline-flex items-center gap-1 text-clay-600"><Lock size={10} /> للفريق فقط</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/* ============================ SESSIONS ============================ */
export async function SessionsTab({ ep, viewerId, canWrite }: { ep: EpisodeCtx; viewerId: string; canWrite: boolean }) {
  const supabase = await createClient();
  const [{ data: notes }, { data: appts }] = await Promise.all([
    supabase.from("clinical_notes").select("*, author:profiles(full_name), revisions:clinical_note_revisions(id)").eq("episode_id", ep.id).eq("kind", "session").order("note_date", { ascending: false }),
    supabase.from("appointments").select("id, starts_at, status, location, provider:profiles!appointments_provider_id_fkey(full_name)").eq("episode_id", ep.id).order("starts_at", { ascending: false }).limit(20),
  ]);
  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold text-ink">ملاحظات الجلسات</h2>{canWrite && <NoteDialog episodeId={ep.id} kind="session" size="sm"  icon={<Plus size={15} />} label="تسجيل جلسة" />}</div>
        {(notes ?? []).length === 0 ? <Card><EmptyState compact title="لا توجد ملاحظات جلسات" /></Card> : (notes ?? []).map((n) => (
          <Card key={n.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="font-semibold text-ink">{n.session_type ?? "جلسة"} · {fDate(n.note_date)}</div><div className="text-xs text-text-2">{(n.author as unknown as { full_name: string })?.full_name} · سُجّلت {fDateTime(n.created_at)}{(n.revisions as unknown[]).length ? ` · عُدّلت ${(n.revisions as unknown[]).length} مرة` : ""}</div></div>
              <div className="flex items-center gap-2">
                {n.pain_score != null && <Badge tone={n.pain_score >= 7 ? "danger" : n.pain_score >= 4 ? "warning" : "success"} size="sm">ألم {n.pain_score}/10</Badge>}
                {n.author_id === viewerId && <NoteDialog episodeId={ep.id} kind="session" initial={n} size="sm" variant="ghost"  icon={<Edit3 size={14} />} label="تعديل" />}
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {[["ما ذكره المراجع", n.patient_report], ["الملاحظة الوظيفية", n.functional_observation], ["التدخلات", n.interventions], ["التقدم", n.progress], ["الخطة", n.plan]].filter(([, v]) => v).map(([l, v]) => (
                <div key={l as string}><dt className="text-xs text-text-2">{l}</dt><dd className="mt-0.5 leading-relaxed text-text">{v}</dd></div>
              ))}
            </dl>
            {n.internal_note && <Notice tone="internal" className="mt-4" title="ملاحظة داخلية — غير مرئية للمراجع">{n.internal_note}</Notice>}
          </Card>
        ))}
      </div>
      <Card className="h-fit">
        <CardHeader title="الجلسات الحضورية" />
        <ul className="divide-y divide-line-soft">{(appts ?? []).map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div><div className="text-ink">{fDateTime(a.starts_at)}</div><div className="text-xs text-text-2">{(a.provider as unknown as { full_name: string } | null)?.full_name ?? "—"}</div></div>
            <StatusBadge map={APPOINTMENT_STATUS} value={a.status} size="sm" />
          </li>
        ))}</ul>
      </Card>
    </div>
  );
}

/* ============================ HOME PROGRAM ============================ */
export async function ProgramTab({ ep, canWrite }: { ep: EpisodeCtx; canWrite: boolean }) {
  const supabase = await createClient();
  const [{ data: programs }, { data: templates }, { data: issues }] = await Promise.all([
    supabase.from("home_programs").select("id, title, status, start_date, end_date, current_version_id, updated_at, versions:program_versions!program_versions_program_id_fkey(id, version, status, effective_date, published_at, change_summary, publisher:profiles!program_versions_published_by_fkey(full_name))").eq("episode_id", ep.id).order("created_at", { ascending: false }),
    supabase.from("program_templates").select("id, name, duration_weeks").eq("status", "active").order("name"),
    supabase.from("issue_reports").select("id, reason, comment, status, created_at, exercise:exercise_versions(name)").eq("episode_id", ep.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const current = (programs ?? []).find((p) => ["active", "scheduled", "paused", "draft"].includes(p.status));
  let pes: { id: string; reps: number | null; sets: number | null; hold_sec: number | null; duration_sec: number | null; days_of_week: number[]; instructions: string | null; ev: { name: string; body_region: string | null; version: number } }[] = [];
  let recent: { id: string; completed_at: string; pain_score: number | null; difficulty: string | null; name: string }[] = [];
  if (current) {
    const vid = current.current_version_id ?? (current.versions as { id: string; status: string }[]).find((v) => v.status === "draft")?.id;
    const [{ data: pe }, { data: comps }] = await Promise.all([
      vid ? supabase.from("program_exercises").select("id, reps, sets, hold_sec, duration_sec, days_of_week, instructions, ev:exercise_versions(name, body_region, version)").eq("program_version_id", vid).order("order_index") : Promise.resolve({ data: [] }),
      supabase.from("exercise_completions").select("id, completed_at, pain_score, difficulty, ev:exercise_versions(name)").eq("episode_id", ep.id).order("completed_at", { ascending: false }).limit(12),
    ]);
    pes = (pe ?? []) as unknown as typeof pes;
    recent = (comps ?? []).map((c) => ({ id: c.id, completed_at: c.completed_at, pain_score: c.pain_score, difficulty: c.difficulty, name: (c.ev as unknown as { name: string }).name }));
  }
  const closed = !["active", "draft"].includes(ep.status);
  return (
    <div className="space-y-6">
      {closed && <Notice tone="neutral">الرحلة {ep.status === "on_hold" ? "معلّقة" : "مغلقة"} — لا يمكن إنشاء برامج جديدة دون إعادة التفعيل (BR-015).</Notice>}
      {!current ? (
        <Card><EmptyState title="لا يوجد برنامج منزلي نشط" description="أنشئ برنامجًا من مكتبة التمارين أو انطلق من قالب جاهز." action={canWrite ? <NewProgramDialog episodeId={ep.id} templates={templates ?? []} disabled={closed} /> : undefined} /></Card>
      ) : (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><h2 className="font-display text-xl font-semibold text-ink">{current.title}</h2><StatusBadge map={PROGRAM_STATUS} value={current.status} /></div>
              <div className="mt-1 text-sm text-text-2">{fDate(current.start_date)} — {fDate(current.end_date)} · {pes.length} تمارين · آخر تحديث {fRelative(current.updated_at)}</div>
            </div>
            {canWrite && <ProgramActions programId={current.id} status={current.status} episodeId={ep.id} hasDraft={(current.versions as { status: string }[]).some((v) => v.status === "draft")} />}
          </div>
          <div className="mt-6 overflow-hidden rounded-[18px] border border-line-soft">
            <Table className="min-w-0">
              <THead><tr><Th>التمرين</Th><Th>الوصفة</Th><Th>الأيام</Th><Th>تعليمات</Th></tr></THead>
              <tbody>{pes.map((p) => (
                <Tr key={p.id}>
                  <Td><div className="flex items-center gap-3"><ExerciseArt region={p.ev.body_region} className="size-10 shrink-0 rounded-[10px]" animated={false} /><div><div className="font-medium text-ink">{p.ev.name}</div><div className="text-xs text-text-3">نسخة التمرين {p.ev.version}</div></div></div></Td>
                  <Td className="text-text-2">{prescription(p).join(" · ")}</Td>
                  <Td className="text-text-2">{daysLabel(p.days_of_week)}</Td>
                  <Td className="max-w-[16rem] truncate text-text-2">{p.instructions ?? "—"}</Td>
                </Tr>
              ))}</tbody>
            </Table>
          </div>
        </Card>
      )}
      {current && canWrite && <div className="flex justify-end"><NewProgramDialog episodeId={ep.id} templates={templates ?? []} disabled={closed} /></div>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="آخر التمارين المنفذة" description="الألم والصعوبة كما سجّلها المراجع." />
          {recent.length === 0 ? <p className="text-sm text-text-2">لا يوجد تنفيذ مسجّل.</p> : (
            <ul className="divide-y divide-line-soft">{recent.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div><div className="text-ink">{c.name}</div><div className="text-xs text-text-3">{fDateTime(c.completed_at)}</div></div>
                <div className="flex gap-1.5">{c.pain_score != null && <Badge size="sm" tone={c.pain_score >= 7 ? "danger" : c.pain_score >= 4 ? "warning" : "success"}>ألم {c.pain_score}</Badge>}{c.difficulty && <Badge size="sm" tone="neutral">{DIFFICULTY_LABEL[c.difficulty]}</Badge>}</div>
              </li>
            ))}</ul>
          )}
        </Card>
        <Card>
          <CardHeader title="بلاغات التمارين" />
          {(issues ?? []).length === 0 ? <p className="text-sm text-text-2">لا توجد بلاغات.</p> : (
            <ul className="divide-y divide-line-soft">{(issues ?? []).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div><div className="text-ink">{ISSUE_REASON[i.reason]} · {(i.exercise as unknown as { name: string } | null)?.name}</div>{i.comment && <div className="text-xs text-text-2">«{i.comment}»</div>}<div className="text-xs text-text-3">{fRelative(i.created_at)}</div></div>
                {canWrite && <IssueAction issueId={i.id} status={i.status} episodeId={ep.id} />}
              </li>
            ))}</ul>
          )}
        </Card>
      </div>
      {(programs ?? []).length > 0 && (
        <Card>
          <CardHeader title="سجل النسخ" description="لا يُحذف أي تاريخ — كل تعديل منشور يُنشئ نسخة جديدة." />
          <TableShell className="shadow-none">
            <Table><THead><tr><Th>البرنامج</Th><Th>النسخة</Th><Th>الحالة</Th><Th>يسري من</Th><Th>نُشر بواسطة</Th><Th>ملخص التغيير</Th></tr></THead>
              <tbody>{(programs ?? []).flatMap((p) => (p.versions as unknown as { id: string; version: number; status: string; effective_date: string | null; published_at: string | null; change_summary: string | null; publisher: { full_name: string } | null }[])
                .sort((a, b) => b.version - a.version).map((v) => (
                <Tr key={v.id}><Td className="font-medium text-ink">{p.title}</Td><Td className="tabular">v{v.version}</Td>
                  <Td><Badge size="sm" tone={v.status === "published" ? "sage" : v.status === "draft" ? "muted" : v.status === "discarded" ? "muted" : "slate"}>{({ published: "منشورة", superseded: "سابقة", draft: "مسودة", discarded: "متجاهلة" } as Record<string, string>)[v.status]}</Badge></Td>
                  <Td>{v.effective_date ? fDate(v.effective_date) : "—"}</Td><Td>{v.publisher?.full_name ?? "—"}</Td><Td className="max-w-xs truncate text-text-2">{v.change_summary ?? "—"}</Td></Tr>
              )))}</tbody></Table>
          </TableShell>
        </Card>
      )}
    </div>
  );
}

/* ============================ OUTCOMES ============================ */
export async function OutcomesTab({ ep, canWrite }: { ep: EpisodeCtx; canWrite: boolean }) {
  const supabase = await createClient();
  const [{ data: goals }, { data: outcomes }, { data: daily }, { data: comps }] = await Promise.all([
    supabase.from("goals").select("*").eq("episode_id", ep.id).order("created_at"),
    supabase.from("outcomes").select("measure, value, unit, recorded_at, source").eq("episode_id", ep.id).order("recorded_at"),
    supabase.rpc("adherence_daily", { p_patient: ep.patient_id, p_days: 28, p_episode: ep.id }),
    supabase.from("exercise_completions").select("pain_score, completed_at").eq("episode_id", ep.id).not("pain_score", "is", null).order("completed_at"),
  ]);
  const byMeasure = new Map<string, { label: string; value: number }[]>();
  const units = new Map<string, string>();
  (outcomes ?? []).forEach((o) => { byMeasure.set(o.measure, [...(byMeasure.get(o.measure) ?? []), { label: fDate(o.recorded_at, "short"), value: Number(o.value) }]); if (o.unit) units.set(o.measure, o.unit); });
  const weeks = new Map<string, [number, number]>();
  ((daily ?? []) as { day: string; eligible: number; completed: number }[]).forEach((d) => {
    const dt = new Date(`${d.day}T12:00:00Z`); dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay());
    const k = dt.toISOString().slice(0, 10); const c = weeks.get(k) ?? [0, 0]; c[0] += d.eligible; c[1] += d.completed; weeks.set(k, c);
  });
  const painDays = new Map<string, number[]>();
  (comps ?? []).forEach((c) => { const k = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(c.completed_at)); painDays.set(k, [...(painDays.get(k) ?? []), c.pain_score!]); });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="الأهداف" action={canWrite && <GoalDialog episodeId={ep.id} size="sm"  icon={<Plus size={15} />} label="هدف جديد" />} />
        {(goals ?? []).length === 0 ? <EmptyState compact title="لا توجد أهداف" /> : (
          <ul className="grid gap-4 md:grid-cols-2">{(goals ?? []).map((g) => {
            const b = Number(g.baseline ?? 0), t = Number(g.target ?? 0), c = Number(g.current_value ?? b);
            return (
              <li key={g.id} className="rounded-[18px] border border-line/80 p-4">
                <div className="flex items-start justify-between gap-2"><div className="font-medium text-ink">{g.title}</div>{canWrite && <GoalDialog episodeId={ep.id} initial={g} size="sm" variant="ghost"  icon={<Edit3 size={14} />} label="تحديث" />}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-[10px] bg-sand-50 py-2"><div className="text-text-3">البداية</div><div className="font-semibold text-ink tabular">{g.baseline ?? "—"}</div></div><div className="rounded-[10px] bg-sage-50 py-2"><div className="text-text-3">الحالي</div><div className="font-semibold text-ink tabular">{g.current_value ?? "—"}</div></div><div className="rounded-[10px] bg-slate-50 py-2"><div className="text-text-3">المستهدف</div><div className="font-semibold text-ink tabular">{g.target ?? "—"}</div></div></div>
                <ProgressBar className="mt-3" value={g.status === "achieved" ? 100 : t === b ? 0 : ((c - b) / (t - b)) * 100} size="sm" label={g.title} />
                <div className="mt-2 flex justify-between text-xs text-text-2"><span>{g.unit}</span><span>{g.status === "achieved" ? "تحقق ✓" : g.due_date ? `حتى ${fDate(g.due_date)}` : ""}</span></div>
              </li>
            );
          })}</ul>
        )}
      </Card>
      {canWrite && <Card><CardHeader title="تسجيل قياس" description="Provider-entered outcome — يظهر في الرسم البياني فورًا." /><OutcomeForm episodeId={ep.id} measures={[...byMeasure.keys()]} /></Card>}
      <div className="grid gap-6 lg:grid-cols-2">
        {[...byMeasure.entries()].map(([m, pts]) => (
          <Card key={m}><CardHeader title={m} description={`${pts.length} قياسات · ${units.get(m) ?? ""}`} /><LineChart title={m} data={pts} tone="slate" /></Card>
        ))}
        <Card><CardHeader title="الالتزام الأسبوعي" description="آخر ٤ أسابيع" /><BarChart title="الالتزام الأسبوعي" unit="٪" max={100} data={[...weeks.entries()].map(([k, [e, c]]) => ({ label: `أسبوع ${fDate(k, "short")}`, value: e ? Math.round((c / e) * 100) : null, hint: `${c} من ${e}` }))} /></Card>
        {painDays.size > 1 && <Card><CardHeader title="الألم المُبلّغ من المراجع" description="Patient-reported — متوسط يومي" /><LineChart title="الألم" max={10} tone="clay" data={[...painDays.entries()].map(([k, v]) => ({ label: fDate(k, "short"), value: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 }))} /></Card>}
      </div>
    </div>
  );
}

/* ============================ MESSAGES ============================ */
export async function MessagesTab({ ep, canWrite }: { ep: EpisodeCtx; canWrite: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase.from("message_threads").select("id, subject, category, last_message_at, last_sender_role, status").eq("patient_id", ep.patient_id).order("last_message_at", { ascending: false });
  return (
    <Card>
      <CardHeader title="المحادثات" action={canWrite && <StaffThreadDialog patientId={ep.patient_id} episodeId={ep.id} />} />
      {(data ?? []).length === 0 ? <EmptyState compact title="لا توجد محادثات" /> : (
        <ul className="divide-y divide-line-soft">{(data ?? []).map((t) => (
          <li key={t.id}><Link href={`/provider/messages/${t.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
            <div><div className="font-medium text-ink">{t.subject}</div><div className="text-xs text-text-2">{t.last_sender_role === "patient" ? "آخر رسالة من المراجع" : "آخر رسالة من الفريق"} · {fRelative(t.last_message_at)}</div></div>
            <StatusBadge map={THREAD_CATEGORY} value={t.category} size="sm" />
          </Link></li>
        ))}</ul>
      )}
    </Card>
  );
}

/* ============================ NOTES ============================ */
export async function NotesTab({ ep, viewerId, canWrite }: { ep: EpisodeCtx; viewerId: string; canWrite: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase.from("clinical_notes").select("id, note_date, internal_note, created_at, author_id, author:profiles(full_name)").eq("episode_id", ep.id).eq("kind", "internal").order("created_at", { ascending: false });
  return (
    <div className="max-w-3xl space-y-4">
      <Notice tone="internal" title="ملاحظات داخلية — غير مرئية للمراجع">تُربط كل ملاحظة بكاتبها وتاريخها، ولا تُحذف، وتُحفظ كل التعديلات في سجل المراجعات.</Notice>
      {canWrite && <div className="flex justify-end"><NoteDialog episodeId={ep.id} kind="internal" size="sm"  icon={<Plus size={15} />} label="ملاحظة داخلية" /></div>}
      {(data ?? []).length === 0 ? <Card><EmptyState compact icon={<Lock size={22} />} title="لا توجد ملاحظات داخلية" /></Card> : (data ?? []).map((n) => (
        <div key={n.id} className="rounded-[18px] border border-clay-200 bg-[repeating-linear-gradient(135deg,#FFFFFF_0_14px,#FCF8F5_14px_28px)] p-5">
          <div className="flex items-center justify-between gap-3 text-xs text-text-2"><span className="inline-flex items-center gap-1.5"><Lock size={12} className="text-clay-600" />{(n.author as unknown as { full_name: string })?.full_name} · {fDate(n.note_date)}</span>
            {n.author_id === viewerId && <NoteDialog episodeId={ep.id} kind="internal" initial={n} variant="ghost" size="sm" label="تعديل" />}</div>
          <p className="mt-2 leading-relaxed text-text">{n.internal_note}</p>
        </div>
      ))}
    </div>
  );
}
