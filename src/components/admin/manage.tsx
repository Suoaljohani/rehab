"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { digitsOnly } from "@/lib/identity";
import type { ActionResult } from "@/lib/errors";
import {
  removeAccount, removeAnnouncement, removeAppointment, removeFaq, removeMessageTemplate, removePatient, removeProgramTemplate,
  removeService, removeSpecialty, removeWaitlistEntry, restoreAccount, restorePatient, updateEpisode, updateMyDetails, updatePatient, updateStaff,
} from "@/lib/actions/manage";

type Kind = "account" | "patient" | "announcement" | "message_template" | "program_template" | "service" | "faq" | "specialty" | "appointment" | "waitlist";

const COPY: Record<Kind, { title: string; body: string; people?: boolean }> = {
  account: { title: "حذف الحساب", body: "يُغلق الحساب فورًا ويختفي من القوائم، ويُحرَّر بريده لإعادة الاستخدام، وتنتهي إسناداته في فرق الرعاية. يبقى سجل عمله محفوظًا ويمكن استعادته.", people: true },
  patient: { title: "حذف ملف المراجع", body: "يُغلق دخوله، وتُلغى رحلاته النشطة ومواعيده القادمة، ويختفي من القوائم ويُحرَّر رقم هويته. يبقى سجله الطبي محفوظًا ويمكن استعادته.", people: true },
  announcement: { title: "حذف الإعلان", body: "يُحذف الإعلان نهائيًا. الإشعارات التي وصلت للمستخدمين سابقًا تبقى لديهم." },
  message_template: { title: "حذف القالب", body: "يُحذف قالب الرسالة نهائيًا ولن يظهر لمقدمي الرعاية." },
  program_template: { title: "حذف قالب البرنامج", body: "يُحذف القالب وتمارينه نهائيًا. إن كانت برامج المراجعين قد أُنشئت منه فلن يُحذف — أوقفه بدلًا من ذلك." },
  service: { title: "حذف الخدمة", body: "تُحذف الخدمة من الموقع العام نهائيًا." },
  faq: { title: "حذف السؤال", body: "يُحذف السؤال من الموقع العام نهائيًا." },
  specialty: { title: "حذف التخصص", body: "يُحذف التخصص نهائيًا. إن كان مستخدمًا في رحلات أو موظفين أو خدمات فلن يُحذف." },
  appointment: { title: "حذف الموعد", body: "يُحذف الموعد نهائيًا من التقويم وسجل المراجع." },
  waitlist: { title: "حذف من قائمة الانتظار", body: "يُحذف القيد من قائمة الانتظار نهائيًا." },
};

function run(kind: Kind, id: string, reason: string, self?: boolean): Promise<ActionResult> {
  switch (kind) {
    case "account": return removeAccount(id, reason, self);
    case "patient": return removePatient(id, reason);
    case "announcement": return removeAnnouncement(id);
    case "message_template": return removeMessageTemplate(id);
    case "program_template": return removeProgramTemplate(id);
    case "service": return removeService(id);
    case "faq": return removeFaq(id);
    case "specialty": return removeSpecialty(id);
    case "appointment": return removeAppointment(id);
    case "waitlist": return removeWaitlistEntry(id);
  }
}

export function RemoveButton({ kind, id, name, self, label = "حذف", variant = "quiet", size = "sm", iconOnly }: {
  kind: Kind; id: string; name?: string; self?: boolean; label?: string; variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean;
}) {
  const c = COPY[kind];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const needsName = !!c.people && !!name;
  const ready = (!c.people || reason.trim().length >= 3) && (!needsName || typed.trim() === name!.trim());
  return (
    <>
      {iconOnly
        ? <button type="button" onClick={() => setOpen(true)} className="grid size-8 place-items-center rounded-full text-text-2 hover:bg-danger-bg hover:text-danger-fg" aria-label={`${label}${name ? ` ${name}` : ""}`}><Trash2 size={15} /></button>
        : <Button type="button" variant={variant} size={size} icon={<Trash2 size={15} />} onClick={() => setOpen(true)}>{label}</Button>}
      <Dialog open={open} onClose={() => setOpen(false)} size="sm" title={c.title} description={name}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="danger" disabled={!ready} loading={pending} icon={<Trash2 size={15} />}
            onClick={() => start(async () => {
              const r = await run(kind, id, reason, self);
              if (!r.ok) return setError(r.error);
              toast({ tone: "success", title: r.message ?? "تم الحذف" });
              setOpen(false);
              router.refresh();
            })}>{self ? "حذف حسابي" : "تأكيد الحذف"}</Button></>}>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-text">{c.body}</p>
          {error && <Notice tone="danger">{error}</Notice>}
          {c.people && (
            <Field label="سبب الحذف" htmlFor={`rr-${id}`} hint="يُحفظ في سجل التدقيق.">
              <Textarea id={`rr-${id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}
          {needsName && (
            <Field label={<>للتأكيد اكتب: <b className="text-ink">{name}</b></>} htmlFor={`rt-${id}`}>
              <Input id={`rt-${id}`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </Field>
          )}
        </div>
      </Dialog>
    </>
  );
}

export function RestoreButton({ kind, id }: { kind: "account" | "patient"; id: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button size="sm" variant="secondary" icon={<RotateCcw size={15} />} loading={pending}
      onClick={() => start(async () => {
        const r = kind === "account" ? await restoreAccount(id) : await restorePatient(id);
        toast(r.ok ? { tone: "success", title: r.message ?? "تمت الاستعادة" } : { tone: "danger", title: "تعذّرت الاستعادة", body: r.error });
        if (r.ok) router.refresh();
      })}>استعادة</Button>
  );
}

function useSave() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const save = (fn: () => Promise<ActionResult>, after?: () => void) => start(async () => {
    setError(null);
    const r = await fn();
    if (!r.ok) return setError(r.error);
    toast({ tone: "success", title: r.message ?? "تم الحفظ" });
    after?.();
    router.refresh();
  });
  return { pending, error, save };
}

// ---------- staff (admin edits anyone, including themselves) ----------
type StaffData = { full_name: string; full_name_en: string | null; email: string | null; phone: string | null; title: string | null; employee_id: string | null; specialty_code: string | null; capacity: number };

export function StaffEditForm({ userId, data, specialties }: { userId: string; data: StaffData; specialties: { code: string; name: string }[] }) {
  const [v, setV] = useState({ ...data, full_name_en: data.full_name_en ?? "", email: data.email ?? "", phone: data.phone ?? "", title: data.title ?? "", employee_id: data.employee_id ?? "", specialty_code: data.specialty_code ?? "" });
  const { pending, error, save } = useSave();
  const set = (k: keyof typeof v, val: string | number) => setV({ ...v, [k]: val });
  return (
    <div className="space-y-5">
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" htmlFor="sf-n" required><Input id="sf-n" value={v.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
        <Field label="الاسم بالإنجليزية" htmlFor="sf-ne"><Input id="sf-ne" dir="ltr" value={v.full_name_en} onChange={(e) => set("full_name_en", e.target.value)} /></Field>
        <Field label="البريد الإلكتروني (اسم الدخول)" htmlFor="sf-e" required hint="يتغير اسم الدخول فورًا."><Input id="sf-e" type="email" dir="ltr" value={v.email} onChange={(e) => set("email", e.target.value)} className="text-end" /></Field>
        <Field label="الجوال" htmlFor="sf-p"><Input id="sf-p" dir="ltr" inputMode="tel" maxLength={10} placeholder="05XXXXXXXX" value={v.phone} onChange={(e) => set("phone", digitsOnly(e.target.value).slice(0, 10))} className="text-end font-mono" /></Field>
        <Field label="المسمى المهني" htmlFor="sf-t"><Input id="sf-t" value={v.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="الرقم الوظيفي" htmlFor="sf-i"><Input id="sf-i" dir="ltr" value={v.employee_id} onChange={(e) => set("employee_id", e.target.value)} /></Field>
        <Field label="التخصص" htmlFor="sf-s"><Select id="sf-s" value={v.specialty_code} onChange={(e) => set("specialty_code", e.target.value)}><option value="">—</option>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></Field>
        <Field label="سعة الحالات" htmlFor="sf-c"><Input id="sf-c" type="number" min={0} value={v.capacity} onChange={(e) => set("capacity", Number(e.target.value))} /></Field>
      </div>
      <div className="flex justify-end"><Button loading={pending} icon={<Save size={16} />} onClick={() => save(() => updateStaff(userId, v))}>حفظ البيانات</Button></div>
    </div>
  );
}

// ---------- my account (any staff member) ----------
export function MyDetailsForm({ data }: { data: { full_name: string; full_name_en: string | null; phone: string | null; title: string | null } }) {
  const [v, setV] = useState({ full_name: data.full_name, full_name_en: data.full_name_en ?? "", phone: data.phone ?? "", title: data.title ?? "" });
  const { pending, error, save } = useSave();
  return (
    <div className="space-y-5">
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" htmlFor="md-n"><Input id="md-n" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} /></Field>
        <Field label="الاسم بالإنجليزية" htmlFor="md-ne"><Input id="md-ne" dir="ltr" value={v.full_name_en} onChange={(e) => setV({ ...v, full_name_en: e.target.value })} /></Field>
        <Field label="الجوال" htmlFor="md-p"><Input id="md-p" dir="ltr" inputMode="tel" maxLength={10} placeholder="05XXXXXXXX" value={v.phone} onChange={(e) => setV({ ...v, phone: digitsOnly(e.target.value).slice(0, 10) })} className="text-end font-mono" /></Field>
        <Field label="المسمى المهني" htmlFor="md-t"><Input id="md-t" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
      </div>
      <div className="flex justify-end"><Button loading={pending} icon={<Save size={16} />} onClick={() => save(() => updateMyDetails(v))}>حفظ بياناتي</Button></div>
    </div>
  );
}

// ---------- patient demographics ----------
type PatientData = { full_name: string; full_name_en: string | null; national_id: string | null; date_of_birth: string | null; sex: string | null };

export function PatientEditDialog({ patientId, data }: { patientId: string; data: PatientData }) {
  const [open, setOpen] = useState(false);
  const init = { full_name: data.full_name, full_name_en: data.full_name_en ?? "", national_id: data.national_id ?? "", date_of_birth: data.date_of_birth ?? "", sex: data.sex ?? "" };
  const [v, setV] = useState(init);
  const { pending, error, save } = useSave();
  return (
    <>
      <Button size="sm" variant="secondary" icon={<Pencil size={15} />} onClick={() => { setV(init); setOpen(true); }}>تعديل البيانات</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="تعديل بيانات المراجع" description="تُسجَّل كل التعديلات في سجل التدقيق مع القيم السابقة."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><Button loading={pending} icon={<Save size={16} />} onClick={() => save(() => updatePatient(patientId, v), () => setOpen(false))}>حفظ</Button></>}>
        <div className="space-y-4">
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="الاسم الكامل" htmlFor="pe-n"><Input id="pe-n" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} /></Field>
            <Field label="الاسم بالإنجليزية" htmlFor="pe-ne"><Input id="pe-ne" dir="ltr" value={v.full_name_en} onChange={(e) => setV({ ...v, full_name_en: e.target.value })} /></Field>
            <Field label="رقم الهوية / الإقامة" htmlFor="pe-id" hint="يدخل به المراجع إلى المنصة."><Input id="pe-id" dir="ltr" inputMode="numeric" maxLength={10} value={v.national_id} onChange={(e) => setV({ ...v, national_id: digitsOnly(e.target.value).slice(0, 10) })} className="text-end font-mono" /></Field>
            <Field label="تاريخ الميلاد" htmlFor="pe-d"><Input id="pe-d" type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={v.date_of_birth} onChange={(e) => setV({ ...v, date_of_birth: e.target.value })} /></Field>
            <Field label="الجنس" htmlFor="pe-s"><Select id="pe-s" value={v.sex} onChange={(e) => setV({ ...v, sex: e.target.value })}><option value="">—</option><option value="male">ذكر</option><option value="female">أنثى</option></Select></Field>
          </div>
          <p className="text-xs text-text-2">رقم الجوال يُعدّل من حقل «الجوال» في الملف لأنه مرتبط برموز الدخول.</p>
        </div>
      </Dialog>
    </>
  );
}

// ---------- journey details ----------
type EpisodeData = { title: string; specialty_code: string; referral_reason: string | null; referral_source: string | null; diagnosis_summary: string | null; main_goal: string | null; start_date: string; end_date: string | null };

export function EpisodeEditDialog({ episodeId, patientId, data, specialties, trigger }: { episodeId: string; patientId: string; data: EpisodeData; specialties: { code: string; name: string }[]; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const init = { ...data, referral_reason: data.referral_reason ?? "", referral_source: data.referral_source ?? "", diagnosis_summary: data.diagnosis_summary ?? "", main_goal: data.main_goal ?? "", end_date: data.end_date ?? "" };
  const [v, setV] = useState(init);
  const { pending, error, save } = useSave();
  const set = (k: keyof typeof v, val: string) => setV({ ...v, [k]: val });
  return (
    <>
      <button type="button" onClick={() => { setV(init); setOpen(true); }} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline">{trigger ?? <><Pencil size={12} /> تعديل</>}</button>
      <Dialog open={open} onClose={() => setOpen(false)} size="lg" title="تعديل بيانات الرحلة" description="حالة الرحلة تُغيَّر من الملف السريري حتى تُحدَّث البرامج والتنبيهات معها."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><Button loading={pending} icon={<Save size={16} />} onClick={() => save(() => updateEpisode(episodeId, patientId, v), () => setOpen(false))}>حفظ</Button></>}>
        <div className="space-y-4">
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="عنوان الرحلة" htmlFor="ee-t" className="sm:col-span-2"><Input id="ee-t" value={v.title} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="التخصص" htmlFor="ee-s"><Select id="ee-s" value={v.specialty_code} onChange={(e) => set("specialty_code", e.target.value)}>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></Field>
            <Field label="جهة الإحالة" htmlFor="ee-rs"><Input id="ee-rs" value={v.referral_source} onChange={(e) => set("referral_source", e.target.value)} /></Field>
            <Field label="تاريخ البداية" htmlFor="ee-sd"><Input id="ee-sd" type="date" value={v.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
            <Field label="تاريخ النهاية" htmlFor="ee-ed"><Input id="ee-ed" type="date" value={v.end_date} onChange={(e) => set("end_date", e.target.value)} /></Field>
            <Field label="سبب الإحالة" htmlFor="ee-rr" className="sm:col-span-2"><Textarea id="ee-rr" rows={2} value={v.referral_reason} onChange={(e) => set("referral_reason", e.target.value)} /></Field>
            <Field label="ملخص التشخيص" htmlFor="ee-dx" className="sm:col-span-2"><Textarea id="ee-dx" rows={2} value={v.diagnosis_summary} onChange={(e) => set("diagnosis_summary", e.target.value)} /></Field>
            <Field label="الهدف الرئيسي" htmlFor="ee-g" className="sm:col-span-2"><Textarea id="ee-g" rows={2} value={v.main_goal} onChange={(e) => set("main_goal", e.target.value)} /></Field>
          </div>
        </div>
      </Dialog>
    </>
  );
}
