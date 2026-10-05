import type { Metadata } from "next";
import { maskNationalId } from "@/lib/identity";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/stat";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { AccountToggle, CareTeamEditor, NewEpisodeDialog, ScheduleDialog } from "@/components/admin/dialogs";
import { PhoneEditor } from "@/components/admin/phone-editor";
import { EpisodeEditDialog, PatientEditDialog, RemoveButton, RestoreButton } from "@/components/admin/manage";
import { Notice } from "@/components/ui/notice";
import { APPOINTMENT_STATUS, EPISODE_STATUS, USER_STATUS } from "@/lib/status";
import { age, fDate, fDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "ملف المراجع" };

export default async function AdminPatient({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(["supervisor", "admin", "super_admin"]);
  const isAdmin = ["admin", "super_admin"].includes(viewer.role);
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("patients").select("*, profile:profiles!patients_user_id_fkey(status, last_login_at)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: episodes }, { data: appts }, { data: specs }, { data: cl }, { data: sms }] = await Promise.all([
    supabase.from("episodes").select("id, code, title, status, start_date, end_date, specialty_code, referral_reason, referral_source, diagnosis_summary, main_goal, specialty:specialties(name), care_team:care_team_members(id, role, provider_id, ended_at, provider:profiles!care_team_members_provider_id_fkey(full_name))").eq("patient_id", id).order("start_date", { ascending: false }),
    supabase.from("appointments").select("id, starts_at, status, location, provider:profiles!appointments_provider_id_fkey(full_name)").eq("patient_id", id).order("starts_at", { ascending: false }).limit(12),
    supabase.from("specialties").select("code, name").order("sort"),
    supabase.rpc("provider_caseload"),
    supabase.from("sms_deliveries").select("id, event, error_code, created_at").eq("patient_id", id).order("created_at", { ascending: false }).limit(6),
  ]);
  const providers = ((cl ?? []) as { provider_id: string; full_name: string; specialty_code: string | null; active_episodes: number; capacity: number; status: string }[]).filter((c) => c.status === "active").map((c) => ({ id: c.provider_id, full_name: c.full_name, specialty_code: c.specialty_code, active: c.active_episodes, capacity: c.capacity }));
  const prof = p.profile as unknown as { status: string; last_login_at: string | null } | null;
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/patients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> المراجعين</Link>
      {p.removed_at && (
        <Notice tone="danger" className="mb-5" title={`ملف محذوف · ${fDateTime(p.removed_at)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><span>أُلغيت رحلاته النشطة ومواعيده القادمة، وأُغلق دخوله. رقم الهوية السابق <span dir="ltr" className="font-mono">{maskNationalId(p.removed_national_id)}</span>.</span>{isAdmin && <RestoreButton kind="patient" id={id} />}</div>
        </Notice>
      )}
      <Card tone="travertine" className="mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={p.full_name} size="xl" />
            <div>
              <h1 className="font-display text-[1.875rem] font-semibold text-ink">{p.full_name}</h1>
              <div className="mt-1 text-sm text-text-2"><span dir="ltr">{p.mrn}</span> · رقم الهوية <span dir="ltr" className="font-mono">{maskNationalId(p.national_id)}</span></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {p.is_sample && <Badge tone="clay">بيانات عيّنة</Badge>}
            {prof && <StatusBadge map={USER_STATUS} value={prof.status} />}
            {!p.removed_at && <PatientEditDialog patientId={id} data={{ full_name: p.full_name, full_name_en: p.full_name_en, national_id: p.national_id, date_of_birth: p.date_of_birth, sex: p.sex }} />}
            {p.user_id && prof && !p.removed_at && <AccountToggle userId={p.user_id} status={prof.status} path={`/admin/patients/${id}`} />}
          </div>
        </div>
        <div className="mt-6 border-t border-line/60 pt-5">
          <DescriptionList columns={3} items={[
            { label: "العمر", value: age(p.date_of_birth) ? `${age(p.date_of_birth)} سنة` : null },
            { label: "الجنس", value: p.sex === "male" ? "ذكر" : p.sex === "female" ? "أنثى" : null },
            { label: "الجوال (لرموز الدخول)", value: <PhoneEditor patientId={id} phone={p.phone} /> },
            { label: "الهوية", value: p.national_id ? <span dir="ltr">••••••{p.national_id.slice(-4)}</span> : null },
            { label: "الجوال موثّق", value: p.phone_verified ? "نعم" : "لا" },
            { label: "آخر دخول", value: prof?.last_login_at ? fDateTime(prof.last_login_at) : "لم يسجل الدخول" },
          ]} />
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-ink">الرحلات التأهيلية</h2><NewEpisodeDialog patientId={id} specialties={specs ?? []} providers={providers} /></div>
          {(episodes ?? []).length === 0 ? <Card><EmptyState compact title="لا توجد رحلات" /></Card> : (episodes ?? []).map((e) => {
            const members = (e.care_team as unknown as { id: string; role: string; provider_id: string; ended_at: string | null; provider: { full_name: string } }[]).filter((m) => !m.ended_at).map((m) => ({ id: m.id, role: m.role, provider_id: m.provider_id, name: m.provider.full_name }));
            return (
              <Card key={e.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><div className="font-semibold text-ink">{e.title}</div><div className="text-xs text-text-2"><span dir="ltr">{e.code}</span> · {(e.specialty as unknown as { name: string })?.name} · {fDate(e.start_date)}{e.end_date ? ` — ${fDate(e.end_date)}` : ""}</div></div>
                  <div className="flex items-center gap-3"><StatusBadge map={EPISODE_STATUS} value={e.status} size="sm" />{!p.removed_at && <EpisodeEditDialog episodeId={e.id} patientId={id} specialties={specs ?? []} data={{ title: e.title, specialty_code: e.specialty_code, referral_reason: e.referral_reason, referral_source: e.referral_source, diagnosis_summary: e.diagnosis_summary, main_goal: e.main_goal, start_date: e.start_date, end_date: e.end_date }} />}<Link href={`/provider/patients/${e.id}`} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline">الملف السريري <ExternalLink size={12} /></Link></div>
                </div>
                <div className="mt-4 border-t border-line-soft pt-4"><div className="mb-2 text-xs font-medium text-text-2">فريق الرعاية</div>
                  {["active", "on_hold", "draft"].includes(e.status) ? <CareTeamEditor episodeId={e.id} members={members} providers={providers} /> : <div className="text-sm text-text-2">{members.map((m) => m.name).join("، ") || "—"} <Badge size="sm" tone="muted">للقراءة</Badge></div>}
                </div>
              </Card>
            );
          })}
        </section>
        <div className="space-y-6">
        <Card className="h-fit">
          <CardHeader title="المواعيد" action={<ScheduleDialog episodes={(episodes ?? []).map((e) => ({ id: e.id, title: e.title, patient_id: id, specialty_code: e.specialty_code }))} providers={providers} defaults={{ patient_id: id }} />} />
          {(appts ?? []).length === 0 ? <p className="text-sm text-text-2">لا توجد مواعيد.</p> : (
            <ul className="divide-y divide-line-soft">{(appts ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div><div className="text-ink">{fDateTime(a.starts_at)}</div><div className="text-xs text-text-2">{(a.provider as unknown as { full_name: string } | null)?.full_name ?? "—"} · {a.location}</div></div>
                <StatusBadge map={APPOINTMENT_STATUS} value={a.status} size="sm" />
              </li>
            ))}</ul>
          )}
        </Card>
        <Card className="h-fit">
          <CardHeader title="رسائل رمز الدخول" description="آخر محاولات الدخول عبر SMS — للإجابة عن «لم يصلني الرمز»." />
          {p.is_sample ? <p className="text-sm text-text-2">ملف عيّنة: لا تُرسل له رسائل.</p> : (sms ?? []).length === 0 ? <p className="text-sm text-text-2">لم يطلب المراجع رمز دخول بعد.</p> : (
            <ul className="divide-y divide-line-soft">{(sms ?? []).map((m) => {
              const e = SMS_EVENT[m.event] ?? { label: m.event, tone: "muted" as const };
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div><div className="text-ink">{e.label}</div><div className="text-xs text-text-2">{fDateTime(m.created_at)}{m.error_code ? <> · <span dir="ltr" className="font-mono">{m.error_code}</span></> : null}</div></div>
                  <Badge size="sm" tone={e.tone}>{e.short}</Badge>
                </li>
              );
            })}</ul>
          )}
        </Card>
        {isAdmin && !p.removed_at && (
          <Card className="h-fit border-danger/25">
            <CardHeader title="حذف ملف المراجع" description="يُغلق دخوله ويختفي من القوائم، ويبقى سجله الطبي محفوظًا وقابلًا للاستعادة." />
            <RemoveButton kind="patient" id={id} name={p.full_name} label="حذف الملف" variant="danger" />
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}

const SMS_EVENT: Record<string, { label: string; short: string; tone: "success" | "sage" | "warning" | "danger" | "muted" }> = {
  sent: { label: "أُرسل رمز التحقق", short: "أُرسل", tone: "sage" },
  verified: { label: "دخل بنجاح", short: "نجح", tone: "success" },
  rejected: { label: "أدخل رمزًا غير صحيح أو منتهيًا", short: "رُفض", tone: "warning" },
  suppressed: { label: "طلب رمزًا قبل مرور دقيقة", short: "انتظار", tone: "muted" },
  failed: { label: "تعذّر الإرسال من مزوّد الرسائل", short: "فشل", tone: "danger" },
  rate_limited: { label: "تجاوز حد الإرسال", short: "حد", tone: "danger" },
  no_phone: { label: "لا يوجد رقم جوال صالح", short: "بلا رقم", tone: "danger" },
  phone_conflict: { label: "الرقم مستخدم في حساب آخر", short: "تعارض", tone: "danger" },
};
