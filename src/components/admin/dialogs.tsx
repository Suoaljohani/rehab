"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, FolderPlus, Plus, Power, UserMinus } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { assignCare, createEpisode, endCare, scheduleAppointment, setAccountStatus } from "@/lib/actions/admin";
import { CARE_ROLE_LABEL } from "@/lib/status";
import { todayISO, addDays } from "@/lib/format";
import type { ActionResult } from "@/lib/errors";

function useRun() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult<unknown>>, ok: string, after?: () => void) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast({ tone: "danger", title: "تعذّر التنفيذ", body: r.error });
    toast({ tone: "success", title: ok });
    after?.();
    router.refresh();
  });
  return { pending, run };
}

export type ProviderOpt = { id: string; full_name: string; specialty_code?: string | null; active?: number; capacity?: number };

export function AccountToggle({ userId, status, path }: { userId: string; status: string; path: string }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  const disabling = status === "active";
  return (
    <>
      <Button variant={disabling ? "danger" : "secondary"} size="sm" icon={<Power size={15} />} onClick={() => setOpen(true)}>{disabling ? "إيقاف الحساب" : "إعادة تفعيل الحساب"}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={disabling ? "إيقاف الحساب" : "إعادة تفعيل الحساب"} size="sm"
        description={disabling ? "يُمنع الدخول فورًا وتتوقف كل الصلاحيات. يبقى السجل محفوظًا ويُسجَّل الإجراء." : "يستعيد المستخدم القدرة على الدخول بصلاحياته الحالية."}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>تراجع</Button><Button variant={disabling ? "danger" : "primary"} loading={pending} onClick={() => run(() => setAccountStatus(userId, disabling ? "disabled" : "active", path), disabling ? "تم إيقاف الحساب" : "تم تفعيل الحساب", () => setOpen(false))}>تأكيد</Button></>} />
    </>
  );
}

export function NewEpisodeDialog({ patientId, specialties, providers }: { patientId: string; specialties: { code: string; name: string }[]; providers: ProviderOpt[] }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, string>>({});
  const { pending, run } = useRun();
  return (
    <>
      <Button size="sm" icon={<FolderPlus size={15} />} onClick={() => setOpen(true)}>رحلة تأهيلية جديدة</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="رحلة تأهيلية جديدة" description="تبقى الرحلات السابقة محفوظة بشكل منفصل."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><Button loading={pending} disabled={!v.specialty_code} onClick={() => run(() => createEpisode(patientId, v), "أُنشئت الرحلة", () => setOpen(false))}>إنشاء</Button></>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="التخصص" htmlFor="es"><Select id="es" value={v.specialty_code ?? ""} onChange={(e) => setV({ ...v, specialty_code: e.target.value })}><option value="">اختر</option>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></Field>
          <Field label="عنوان الرحلة" htmlFor="et"><Input id="et" value={v.episode_title ?? ""} onChange={(e) => setV({ ...v, episode_title: e.target.value })} /></Field>
          <Field label="سبب الإحالة" htmlFor="er" className="sm:col-span-2"><Textarea id="er" rows={2} value={v.referral_reason ?? ""} onChange={(e) => setV({ ...v, referral_reason: e.target.value })} /></Field>
          <Field label="الهدف الرئيسي" htmlFor="eg"><Input id="eg" value={v.main_goal ?? ""} onChange={(e) => setV({ ...v, main_goal: e.target.value })} /></Field>
          <Field label="مقدم الرعاية الرئيسي" htmlFor="ep"><Select id="ep" value={v.primary_provider_id ?? ""} onChange={(e) => setV({ ...v, primary_provider_id: e.target.value })}><option value="">لاحقًا</option>{providers.filter((p) => !v.specialty_code || p.specialty_code === v.specialty_code).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></Field>
        </div>
      </Dialog>
    </>
  );
}

export function CareTeamEditor({ episodeId, members, providers }: { episodeId: string; members: { id: string; role: string; provider_id: string; name: string }[]; providers: ProviderOpt[] }) {
  const [add, setAdd] = useState(false);
  const [end, setEnd] = useState<string | null>(null);
  const [v, setV] = useState({ provider: "", role: "secondary", reason: "" });
  const { pending, run } = useRun();
  const hasPrimary = members.some((m) => m.role === "primary");
  return (
    <div>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-page/60 px-3 py-2 text-sm ring-1 ring-line-soft">
            <div><span className="font-medium text-ink">{m.name}</span> <span className="text-text-2">· {CARE_ROLE_LABEL[m.role]}</span></div>
            <button onClick={() => { setV({ ...v, reason: "" }); setEnd(m.id); }} className="inline-flex items-center gap-1 text-xs text-danger-fg hover:underline"><UserMinus size={13} /> إنهاء</button>
          </li>
        ))}
        {members.length === 0 && <li className="text-sm text-clay-600">لا يوجد فريق رعاية.</li>}
      </ul>
      <Button size="sm" variant="quiet" className="mt-3" icon={<Plus size={14} />} onClick={() => { setV({ provider: "", role: hasPrimary ? "secondary" : "primary", reason: "" }); setAdd(true); }}>إضافة / نقل</Button>
      <Dialog open={add} onClose={() => setAdd(false)} title="تعديل فريق الرعاية" description="تتحدّث الصلاحيات فورًا ويُسجَّل الإجراء (من، متى، من، إلى، السبب)."
        footer={<><Button variant="ghost" onClick={() => setAdd(false)}>إلغاء</Button><Button loading={pending} disabled={!v.provider} onClick={() => run(() => assignCare(episodeId, v.provider, v.role, v.reason), "تم تحديث فريق الرعاية", () => setAdd(false))}>حفظ</Button></>}>
        <div className="space-y-4">
          <Field label="مقدم الرعاية" htmlFor="cp"><Select id="cp" value={v.provider} onChange={(e) => setV({ ...v, provider: e.target.value })}><option value="">اختر</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.capacity ? ` (${p.active}/${p.capacity})` : ""}</option>)}</Select></Field>
          <Field label="الدور" htmlFor="cr"><Select id="cr" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>{Object.entries(CARE_ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          {v.role === "primary" && hasPrimary && <Notice tone="warning">سيُنقل الدور الرئيسي من مقدم الرعاية الحالي. السبب إلزامي.</Notice>}
          <Field label="السبب" htmlFor="cre"><Textarea id="cre" rows={2} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} /></Field>
        </div>
      </Dialog>
      <Dialog open={!!end} onClose={() => setEnd(null)} title="إنهاء العضوية في فريق الرعاية" size="sm"
        footer={<><Button variant="ghost" onClick={() => setEnd(null)}>إلغاء</Button><Button variant="danger" loading={pending} disabled={!v.reason.trim()} onClick={() => run(() => endCare(end!, v.reason), "تم التحديث", () => setEnd(null))}>إنهاء</Button></>}>
        <Field label="السبب (إلزامي)" htmlFor="ere"><Textarea id="ere" rows={2} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} /></Field>
      </Dialog>
    </div>
  );
}

export function ScheduleDialog({
  patients, episodes, providers, defaults, label = "موعد جديد", variant = "primary", size = "sm",
}: {
  patients?: { id: string; full_name: string }[]; episodes: { id: string; title: string; patient_id: string; specialty_code: string }[]; providers: ProviderOpt[];
  defaults?: { patient_id?: string; request_id?: string; episode_id?: string; notes?: string }; label?: string; variant?: ButtonVariant; size?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, string>>({ date: addDays(todayISO(), 1), time: "09:00", duration_min: "45", ...(defaults as Record<string, string>) });
  const { pending, run } = useRun();
  const eps = episodes.filter((e) => !v.patient_id || e.patient_id === v.patient_id);
  function submit() {
    const starts_at = new Date(`${v.date}T${v.time}:00+03:00`).toISOString();
    run(() => scheduleAppointment({ patient_id: v.patient_id, episode_id: v.episode_id || null, provider_id: v.provider_id || null, starts_at, duration_min: v.duration_min, location: v.location, notes: v.notes, request_id: v.request_id || null }), "تم تأكيد الموعد وإشعار المراجع", () => setOpen(false));
  }
  return (
    <>
      <Button size={size} variant={variant} icon={<CalendarPlus size={15} />} onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="جدولة موعد" description="يُتحقق من تعارض مواعيد مقدم الرعاية تلقائيًا."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><Button loading={pending} disabled={!v.patient_id} onClick={submit}>تأكيد الموعد</Button></>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {patients && <Field label="المراجع" htmlFor="sp" className="sm:col-span-2"><Select id="sp" value={v.patient_id ?? ""} onChange={(e) => setV({ ...v, patient_id: e.target.value, episode_id: "" })}><option value="">اختر</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></Field>}
          <Field label="الرحلة" htmlFor="se"><Select id="se" value={v.episode_id ?? ""} onChange={(e) => setV({ ...v, episode_id: e.target.value })}><option value="">بدون</option>{eps.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</Select></Field>
          <Field label="مقدم الرعاية" htmlFor="spv"><Select id="spv" value={v.provider_id ?? ""} onChange={(e) => setV({ ...v, provider_id: e.target.value })}><option value="">غير محدد</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></Field>
          <Field label="التاريخ" htmlFor="sd"><Input id="sd" type="date" min={todayISO()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></Field>
          <Field label="الوقت" htmlFor="st"><Input id="st" type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} /></Field>
          <Field label="المدة (دقيقة)" htmlFor="sdu"><Input id="sdu" type="number" min={15} step={15} value={v.duration_min} onChange={(e) => setV({ ...v, duration_min: e.target.value })} /></Field>
          <Field label="المكان" htmlFor="sl"><Input id="sl" placeholder="عيادة ٢٠٤" value={v.location ?? ""} onChange={(e) => setV({ ...v, location: e.target.value })} /></Field>
          <Field label="ملاحظات" htmlFor="sn" className="sm:col-span-2"><Textarea id="sn" rows={2} value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
        </div>
      </Dialog>
    </>
  );
}
