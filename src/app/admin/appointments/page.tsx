import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileText, Phone, UserPlus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { LinkTabs } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableShell, THead, Th, Tr, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { buttonClasses } from "@/components/ui/button";
import { ScheduleDialog } from "@/components/admin/dialogs";
import { ApptStatusMenu, ChangeDecision, RequestStatusForm, WaitlistForm, WaitlistStatus } from "./actions-ui";
import { RemoveButton } from "@/components/admin/manage";
import { APPOINTMENT_STATUS, REQUEST_STATUS } from "@/lib/status";
import { WEEKDAYS_SHORT, fDate, fDateTime, fRelative, todayISO, addDays } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "المواعيد" };

export default async function AppointmentCenter({ searchParams }: { searchParams: Promise<{ tab?: string; request?: string; status?: string; provider?: string }> }) {
  await requireRole(["supervisor", "admin", "super_admin"]);
  const sp = await searchParams;
  const tab = sp.tab ?? "requests";
  const supabase = await createClient();
  const [{ data: specs }, { data: cl }, { count: reqCount }, { count: chCount }] = await Promise.all([
    supabase.from("specialties").select("code, name").order("sort"),
    supabase.rpc("provider_caseload"),
    supabase.from("appointment_requests").select("id", { count: "exact", head: true }).in("status", ["new", "under_review", "need_information", "accepted"]),
    supabase.from("appointment_change_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const providers = ((cl ?? []) as { provider_id: string; full_name: string; status: string; specialty_code: string | null }[]).filter((c) => c.status === "active").map((c) => ({ id: c.provider_id, full_name: c.full_name, specialty_code: c.specialty_code }));
  const tabs = [
    { href: "/admin/appointments?tab=requests", label: "طلبات المواعيد", active: tab === "requests", count: reqCount ?? 0 },
    { href: "/admin/appointments?tab=appointments", label: "المواعيد", active: tab === "appointments" },
    { href: "/admin/appointments?tab=changes", label: "طلبات التغيير", active: tab === "changes", count: chCount ?? 0 },
    { href: "/admin/appointments?tab=waitlist", label: "قائمة الانتظار", active: tab === "waitlist" },
  ];
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="مركز المواعيد" description="في هذا الإصدار: الطلب ليس حجزًا مؤكدًا — يراجعه القسم ويحدد الموعد." />
      <LinkTabs className="mb-6" items={tabs} />
      {tab === "requests" && <RequestsTab selected={sp.request} status={sp.status} providers={providers} />}
      {tab === "appointments" && <AppointmentsTab providers={providers} provider={sp.provider} status={sp.status} />}
      {tab === "changes" && <ChangesTab />}
      {tab === "waitlist" && <WaitlistTab specialties={specs ?? []} />}
    </div>
  );
}

async function RequestsTab({ selected, status, providers }: { selected?: string; status?: string; providers: { id: string; full_name: string }[] }) {
  const supabase = await createClient();
  let q = supabase.from("appointment_requests").select("id, reference, full_name, phone, national_id, status, journey_type, has_referral, preferred_period, notes, internal_note, created_at, patient_id, specialty:specialties(name)").order("created_at", { ascending: false }).limit(100);
  q = status ? q.eq("status", status) : q.in("status", ["new", "under_review", "need_information", "accepted"]);
  const { data } = await q;
  const sel = (data ?? []).find((r) => r.id === selected) ?? (selected ? (await supabase.from("appointment_requests").select("id, reference, full_name, phone, national_id, status, journey_type, has_referral, preferred_period, notes, internal_note, created_at, patient_id, specialty:specialties(name)").eq("id", selected).maybeSingle()).data : null);
  let events: { status: string; note: string | null; public_note: string | null; created_at: string }[] = [];
  let matches: { id: string; full_name: string; mrn: string; match_reason: string }[] = [];
  let eps: { id: string; title: string; patient_id: string; specialty_code: string }[] = [];
  if (sel) {
    const [{ data: ev }, { data: m }] = await Promise.all([
      supabase.from("request_events").select("status, note, public_note, created_at").eq("request_id", sel.id).order("created_at"),
      supabase.rpc("find_patient_duplicates", { p_national_id: sel.national_id, p_phone: sel.phone, p_name: sel.full_name, p_dob: null }),
    ]);
    events = ev ?? [];
    matches = (m ?? []) as typeof matches;
    const ids = [sel.patient_id, ...matches.map((x) => x.id)].filter(Boolean) as string[];
    if (ids.length) eps = ((await supabase.from("episodes").select("id, title, patient_id, specialty_code").in("patient_id", ids).in("status", ["active", "draft", "on_hold"])).data ?? []);
  }
  const JT: Record<string, string> = { referral: "لديه إحالة", returning: "مراجع سابق", new_appointment: "موعد جديد", find_service: "استفسار عن الخدمة", inquiry: "استفسار" };
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div>
        <LinkTabs variant="pill" className="mb-4" items={[{ href: "/admin/appointments?tab=requests", label: "المفتوحة", active: !status }, ...["new", "need_information", "scheduled", "rejected", "closed"].map((k) => ({ href: `/admin/appointments?tab=requests&status=${k}`, label: REQUEST_STATUS[k].label, active: status === k }))]} />
        {(data ?? []).length === 0 ? <Card><EmptyState compact title="لا توجد طلبات" /></Card> : (
          <ul className="overflow-hidden rounded-[20px] border border-line/80 bg-surface">{(data ?? []).map((r) => (
            <li key={r.id} className="border-b border-line-soft last:border-0">
              <Link href={`/admin/appointments?tab=requests${status ? `&status=${status}` : ""}&request=${r.id}`} className={cn("flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#FCFAF7]", selected === r.id && "bg-slate-50")}>
                <div><div className="font-medium text-ink">{r.full_name}</div><div className="text-xs text-text-2"><span dir="ltr">{r.reference}</span> · {(r.specialty as unknown as { name: string } | null)?.name ?? "خدمة غير محددة"} · {JT[r.journey_type]} · {fRelative(r.created_at)}</div></div>
                <StatusBadge map={REQUEST_STATUS} value={r.status} size="sm" />
              </Link>
            </li>
          ))}</ul>
        )}
      </div>
      {sel ? (
        <Card className="h-fit p-6">
          <CardHeader eyebrow={<span dir="ltr">{sel.reference}</span>} title={sel.full_name} action={<StatusBadge map={REQUEST_STATUS} value={sel.status} />} />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-text-2">الجوال</dt><dd className="flex items-center gap-1 text-ink" dir="ltr"><Phone size={13} /> {sel.phone}</dd></div>
            <div><dt className="text-xs text-text-2">الخدمة</dt><dd className="text-ink">{(sel.specialty as unknown as { name: string } | null)?.name ?? "—"}</dd></div>
            <div><dt className="text-xs text-text-2">إحالة</dt><dd className="text-ink">{sel.has_referral ? "نعم" : "لا"}</dd></div>
            <div><dt className="text-xs text-text-2">الفترة المفضلة</dt><dd className="text-ink">{sel.preferred_period ?? "—"}</dd></div>
          </dl>
          {sel.notes && <p className="mt-4 rounded-[12px] bg-sand-50 p-3 text-sm ring-1 ring-sand-200">{sel.notes}</p>}
          {sel.internal_note && <p className="mt-2 rounded-[12px] bg-clay-50 p-3 text-xs text-clay-700">داخلي: {sel.internal_note}</p>}
          <ol className="mt-5 space-y-2 border-s border-line ps-4 text-xs">{events.map((e, i) => <li key={i}><b className="text-ink">{REQUEST_STATUS[e.status]?.label}</b> <span className="text-text-3">{fDateTime(e.created_at)}</span>{e.public_note && <div className="text-text-2">{e.public_note}</div>}</li>)}</ol>
          {sel.status !== "scheduled" && sel.status !== "closed" && sel.status !== "rejected" && (
            <div className="mt-6 space-y-5 border-t border-line-soft pt-5">
              <div>
                <div className="mb-2 text-sm font-semibold text-ink">جدولة موعد</div>
                {matches.length > 0 ? (
                  <ul className="space-y-2">{matches.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 rounded-[12px] bg-sage-50 p-3 text-sm ring-1 ring-sage-200">
                      <div><div className="font-medium text-ink">{m.full_name}</div><div className="text-xs text-text-2"><span dir="ltr">{m.mrn}</span> · {m.match_reason}</div></div>
                      <ScheduleDialog label="جدولة" episodes={eps} providers={providers} defaults={{ patient_id: m.id, request_id: sel.id, notes: sel.notes ?? undefined }} />
                    </li>
                  ))}</ul>
                ) : (
                  <div className="rounded-[12px] bg-sand-50 p-3 text-sm text-text-2 ring-1 ring-sand-200">لا يوجد ملف مطابق. أنشئ ملف المراجع أولًا ثم عد لجدولة الموعد.
                    <Link href="/admin/patients/new" className={buttonClasses("secondary", "sm", "mt-2 w-full")}><UserPlus size={15} /> إنشاء ملف مراجع</Link></div>
                )}
              </div>
              <RequestStatusForm id={sel.id} status={sel.status} />
            </div>
          )}
        </Card>
      ) : <Card className="h-fit"><EmptyState compact icon={<FileText size={22} />} title="اختر طلبًا" description="لعرض التفاصيل وتحديث الحالة أو الجدولة." /></Card>}
    </div>
  );
}

async function AppointmentsTab({ providers, provider, status }: { providers: { id: string; full_name: string }[]; provider?: string; status?: string }) {
  const supabase = await createClient();
  const from = addDays(todayISO(), -7);
  let q = supabase.from("appointments").select("id, starts_at, duration_min, location, status, patient:patients(id, full_name), provider:profiles!appointments_provider_id_fkey(full_name), specialty:specialties(name)").gte("starts_at", `${from}T00:00:00+03:00`).order("starts_at").limit(200);
  if (provider) q = q.eq("provider_id", provider);
  if (status) q = q.eq("status", status);
  const [{ data }, { data: pts }, { data: eps }] = await Promise.all([
    q,
    supabase.from("patients").select("id, full_name").eq("status", "active").order("full_name"),
    supabase.from("episodes").select("id, title, patient_id, specialty_code").in("status", ["active", "on_hold"]),
  ]);
  const sel = "h-10 rounded-[12px] border border-line bg-surface px-3 text-sm";
  return (
    <TableShell toolbar={<div className="flex w-full flex-wrap items-center justify-between gap-2">
      <form className="flex flex-wrap gap-2"><input type="hidden" name="tab" value="appointments" />
        <select name="provider" defaultValue={provider ?? ""} className={sel} aria-label="مقدم الرعاية"><option value="">كل مقدمي الرعاية</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>
        <select name="status" defaultValue={status ?? ""} className={sel} aria-label="الحالة"><option value="">كل الحالات</option>{Object.entries(APPOINTMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <button className={buttonClasses("quiet", "sm", "h-10")}>تصفية</button></form>
      <ScheduleDialog patients={pts ?? []} episodes={eps ?? []} providers={providers} />
    </div>}>
      {(data ?? []).length === 0 ? <EmptyState compact icon={<CalendarDays size={22} />} title="لا توجد مواعيد" /> : (
        <Table>
          <THead><tr><Th>الموعد</Th><Th>المراجع</Th><Th>الخدمة</Th><Th>مقدم الرعاية</Th><Th>المكان</Th><Th>الحالة</Th></tr></THead>
          <tbody>{(data ?? []).map((a) => (
            <Tr key={a.id}>
              <Td><div className="font-medium text-ink">{fDate(a.starts_at, "day")}</div><div className="text-xs text-text-2 tabular">{new Intl.DateTimeFormat("ar-SA-u-nu-latn", { timeZone: "Asia/Riyadh", hour: "numeric", minute: "2-digit" }).format(new Date(a.starts_at))} · {a.duration_min}د</div></Td>
              <Td><Link href={`/admin/patients/${(a.patient as unknown as { id: string }).id}`} className="hover:underline">{(a.patient as unknown as { full_name: string }).full_name}</Link></Td>
              <Td>{(a.specialty as unknown as { name: string } | null)?.name ?? "—"}</Td>
              <Td>{(a.provider as unknown as { full_name: string } | null)?.full_name ?? <span className="text-clay-600">غير محدد</span>}</Td>
              <Td className="text-text-2">{a.location}</Td>
              <Td><div className="flex items-center gap-2"><StatusBadge map={APPOINTMENT_STATUS} value={a.status} size="sm" /><ApptStatusMenu id={a.id} status={a.status} /><RemoveButton kind="appointment" id={a.id} iconOnly /></div></Td>
            </Tr>
          ))}</tbody>
        </Table>
      )}
    </TableShell>
  );
}

async function ChangesTab() {
  const supabase = await createClient();
  const { data } = await supabase.from("appointment_change_requests").select("id, kind, reason, preferred, status, created_at, appointment:appointments(starts_at, location), patient:patients(full_name)").order("created_at", { ascending: false }).limit(50);
  if ((data ?? []).length === 0) return <Card><EmptyState compact title="لا توجد طلبات تغيير" /></Card>;
  return (
    <ul className="space-y-3">{(data ?? []).map((c) => (
      <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line/80 bg-surface p-5">
        <div>
          <div className="flex items-center gap-2"><span className="font-semibold text-ink">{(c.patient as unknown as { full_name: string }).full_name}</span><Badge size="sm" tone={c.kind === "cancel" ? "danger" : "info"}>{c.kind === "cancel" ? "إلغاء" : "تغيير"}</Badge></div>
          <div className="mt-1 text-sm text-text-2">الموعد: {fDateTime((c.appointment as unknown as { starts_at: string }).starts_at)} · {fRelative(c.created_at)}</div>
          {c.reason && <div className="mt-1 text-sm text-text">«{c.reason}»</div>}
          {c.preferred && <div className="text-xs text-text-2">الوقت المفضل: {c.preferred}</div>}
        </div>
        {c.status === "pending" ? <ChangeDecision id={c.id} /> : <Badge tone={c.status === "approved" ? "success" : "muted"}>{c.status === "approved" ? "تمت الموافقة" : "مرفوض"}</Badge>}
      </li>
    ))}</ul>
  );
}

async function WaitlistTab({ specialties }: { specialties: { code: string; name: string }[] }) {
  const supabase = await createClient();
  const { data } = await supabase.from("waitlist_entries").select("id, full_name, phone, preferred_days, preferred_time, priority, status, notes, created_at, specialty:specialties(name)").order("created_at");
  const P: Record<string, string> = { routine: "اعتيادية", soon: "قريبًا", priority: "أولوية" };
  return (
    <TableShell toolbar={<div className="flex w-full justify-between"><span className="text-sm text-text-2">{(data ?? []).filter((w) => w.status === "waiting").length} بالانتظار</span><WaitlistForm specialties={specialties} /></div>}>
      {(data ?? []).length === 0 ? <EmptyState compact title="قائمة الانتظار فارغة" /> : (
        <Table>
          <THead><tr><Th>الاسم</Th><Th>الخدمة</Th><Th>الأيام المفضلة</Th><Th>الوقت</Th><Th>الأولوية</Th><Th>منذ</Th><Th>الحالة</Th></tr></THead>
          <tbody>{(data ?? []).map((w) => (
            <Tr key={w.id}>
              <Td><div className="font-medium text-ink">{w.full_name}</div><div className="text-xs text-text-2" dir="ltr">{w.phone}</div></Td>
              <Td>{(w.specialty as unknown as { name: string } | null)?.name}</Td>
              <Td>{(w.preferred_days as number[]).map((d) => WEEKDAYS_SHORT[d]).join("، ") || "—"}</Td>
              <Td>{w.preferred_time ?? "—"}</Td>
              <Td>{w.priority ? <Badge size="sm" tone={w.priority === "priority" ? "clay" : "neutral"}>{P[w.priority]}</Badge> : "—"}</Td>
              <Td className="text-text-2">{fRelative(w.created_at)}</Td>
              <Td><div className="flex items-center gap-1"><WaitlistStatus id={w.id} status={w.status} /><RemoveButton kind="waitlist" id={w.id} iconOnly /></div></Td>
            </Tr>
          ))}</tbody>
        </Table>
      )}
    </TableShell>
  );
}
