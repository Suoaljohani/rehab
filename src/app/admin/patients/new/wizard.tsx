"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, KeyRound, ShieldAlert, UserCheck } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox, ChoiceCard, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { createPatient, findDuplicates } from "@/lib/actions/admin";
import { cn } from "@/lib/cn";
import { digitsOnly, maskNationalId } from "@/lib/identity";

const STEPS = ["الهوية", "البيانات الأساسية", "التواصل", "الرحلة التأهيلية", "فريق الرعاية", "الدخول"];
type Dup = { id: string; full_name: string; mrn: string; phone: string; date_of_birth: string | null; match_reason: string };

export function PatientWizard({ specialties, providers }: { specialties: { code: string; name: string }[]; providers: { id: string; full_name: string; specialty_code: string | null; active: number; capacity: number }[] }) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Record<string, string>>({ create_access: "1", sex: "" });
  const [dups, setDups] = useState<Dup[] | null>(null);
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ access_id: string; mrn: string; patient_id: string } | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const set = (k: string, val: string) => setV((x) => ({ ...x, [k]: val }));

  function validate(): string | null {
    if (step === 0 && !/^[12]\d{9}$/.test(v.national_id ?? "")) return "رقم الهوية أو الإقامة مطلوب: ١٠ أرقام يبدأ بـ 1 أو 2 — وهو ما يدخل به المراجع.";
    if (step === 1 && (v.full_name ?? "").trim().length < 3) return "اكتب الاسم الكامل.";
    if (step === 1 && v.date_of_birth && (v.date_of_birth > new Date().toISOString().slice(0, 10) || v.date_of_birth < "1900-01-01")) return "تاريخ الميلاد غير صحيح.";
    if (step === 2 && !/^(05\d{8})$/.test((v.phone ?? "").replace(/\D/g, ""))) return "رقم الجوال يجب أن يكون بالصيغة 05XXXXXXXX.";
    if (step === 3 && !v.specialty_code) return "اختر الخدمة / التخصص.";
    return null;
  }
  function next() {
    const e = validate();
    setErr(e);
    if (e) return;
    if (step === 2 && dups === null) {
      start(async () => {
        const r = await findDuplicates({ national_id: v.national_id, phone: v.phone, name: v.full_name, dob: v.date_of_birth });
        if (r.ok && r.data && r.data.length > 0) { setDups(r.data); return; }
        setDups([]);
        setStep(3);
      });
      return;
    }
    if (step === 2 && dups && dups.length > 0 && !ack) return setErr("راجع السجلات المحتملة وأكّد أن المراجع جديد.");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function submit() {
    start(async () => {
      const r = await createPatient({ ...v, create_access: v.create_access === "1" });
      if (!r.ok) { setErr(r.error); return toast({ tone: "danger", title: "تعذّر الإنشاء", body: r.error }); }
      setDone(r.data!);
    });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-6 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-sage-600 text-white shadow-[var(--shadow-md)]"><Check size={36} strokeWidth={2.4} /></div>
        <h2 className="mt-6 font-display text-2xl font-semibold text-ink">تم إنشاء ملف المراجع</h2>
        <p className="mt-1 text-text-2">يدخل المراجع برقم هويته، ثم رمز تحقق يصل إلى جواله المسجّل. لا حاجة لتسليمه أي رقم إضافي.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[18px] bg-sand-50 p-4 ring-1 ring-sand-200"><div className="text-xs text-text-2">رقم الهوية</div><div className="mt-1 font-mono text-2xl font-semibold text-ink" dir="ltr">{maskNationalId(v.national_id)}</div></div>
          <div className="rounded-[18px] bg-sand-50 p-4 ring-1 ring-sand-200"><div className="text-xs text-text-2">رقم الملف</div><div className="mt-1 font-mono text-2xl font-semibold text-ink" dir="ltr">{done.mrn}</div></div>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/admin/patients/new" onClick={() => { setDone(null); setStep(0); setV({ create_access: "1", sex: "" }); }} className={buttonClasses("secondary")}>مراجع آخر</Link>
          <Link href={`/admin/patients/${done.patient_id}`} className={buttonClasses("primary")}>فتح الملف</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ol className="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="خطوات الإنشاء">
        {STEPS.map((s, i) => (
          <li key={s} className="text-center">
            <div className={cn("mx-auto h-1.5 rounded-full", i < step ? "bg-sage-500" : i === step ? "bg-slate-600" : "bg-sand-200")} />
            <div className={cn("mt-2 text-xs", i === step ? "font-semibold text-ink" : "text-text-2")}>{i + 1}. {s}</div>
          </li>
        ))}
      </ol>
      {err && <Notice tone="danger" className="mb-5">{err}</Notice>}
      <div className="min-h-64 space-y-5">
        {step === 0 && (
          <>
            <Field label="رقم الهوية الوطنية / الإقامة" htmlFor="nid" required hint="يدخل به المراجع إلى المنصة، ويمنع تكرار السجلات."><Input id="nid" dir="ltr" inputMode="numeric" maxLength={10} value={v.national_id ?? ""} onChange={(e) => { set("national_id", digitsOnly(e.target.value).slice(0, 10)); setDups(null); }} className="max-w-xs text-end font-mono tracking-wider" /></Field>
            <Notice tone="neutral" icon={<ShieldAlert size={18} />}>جمع الحد الأدنى من البيانات (Data Minimization). لا تُدخل بيانات غير لازمة للرعاية.</Notice>
          </>
        )}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="الاسم الكامل" htmlFor="fn" required><Input id="fn" value={v.full_name ?? ""} onChange={(e) => { set("full_name", e.target.value); setDups(null); }} /></Field>
            <Field label="الاسم بالإنجليزية" htmlFor="fne"><Input id="fne" dir="ltr" value={v.full_name_en ?? ""} onChange={(e) => set("full_name_en", e.target.value)} /></Field>
            <Field label="تاريخ الميلاد" htmlFor="dob"><Input id="dob" type="date" max={new Date().toISOString().slice(0, 10)} min="1900-01-01" value={v.date_of_birth ?? ""} onChange={(e) => { set("date_of_birth", e.target.value); setDups(null); }} /></Field>
            <Field label="الجنس" htmlFor="sex" hint="عند الحاجة السريرية أو التشغيلية فقط"><Select id="sex" value={v.sex} onChange={(e) => set("sex", e.target.value)}><option value="">غير محدد</option><option value="male">ذكر</option><option value="female">أنثى</option></Select></Field>
          </div>
        )}
        {step === 2 && (
          <>
            <Field label="رقم الجوال" htmlFor="ph" required hint="جوال المراجع نفسه — إليه يُرسل رمز الدخول برسالة نصية، ولا يُستخدم لمراجع آخر."><Input id="ph" dir="ltr" inputMode="tel" maxLength={10} placeholder="05XXXXXXXX" value={v.phone ?? ""} onChange={(e) => { set("phone", digitsOnly(e.target.value).slice(0, 10)); setDups(null); }} className="max-w-xs text-end font-mono" /></Field>
            {dups && dups.length > 0 && (
              <div className="rounded-[18px] border border-warning/30 bg-warning-bg p-4">
                <div className="font-semibold text-warning-fg">سجلات محتملة لنفس المراجع</div>
                <p className="mt-1 text-sm text-warning-fg">لا يدمج النظام السجلات تلقائيًا. إذا كان المراجع موجودًا فأضف له رحلة جديدة من ملفه.</p>
                <ul className="mt-3 space-y-2">{dups.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-surface p-3 text-sm">
                    <div><div className="font-medium text-ink">{d.full_name}</div><div className="text-xs text-text-2"><span dir="ltr">{d.mrn}</span> · {d.match_reason}</div></div>
                    <Link href={`/admin/patients/${d.id}`} className="text-slate-600 hover:underline">فتح الملف</Link>
                  </li>
                ))}</ul>
                <Checkbox className="mt-3" checked={ack} onChange={(e) => setAck(e.target.checked)} label="تحققت — هذا مراجع جديد مختلف" />
              </div>
            )}
          </>
        )}
        {step === 3 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="الخدمة / التخصص" htmlFor="sp" required><Select id="sp" value={v.specialty_code ?? ""} onChange={(e) => set("specialty_code", e.target.value)}><option value="">اختر</option>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></Field>
            <Field label="عنوان الرحلة" htmlFor="et"><Input id="et" placeholder="مثال: تأهيل الركبة بعد الرباط الصليبي" value={v.episode_title ?? ""} onChange={(e) => set("episode_title", e.target.value)} /></Field>
            <Field label="سبب الإحالة" htmlFor="rr" className="sm:col-span-2"><Textarea id="rr" rows={2} value={v.referral_reason ?? ""} onChange={(e) => set("referral_reason", e.target.value)} /></Field>
            <Field label="التشخيص المختصر (عند الحاجة)" htmlFor="dx"><Input id="dx" value={v.diagnosis_summary ?? ""} onChange={(e) => set("diagnosis_summary", e.target.value)} /></Field>
            <Field label="الهدف الرئيسي" htmlFor="mg"><Input id="mg" value={v.main_goal ?? ""} onChange={(e) => set("main_goal", e.target.value)} /></Field>
          </div>
        )}
        {step === 4 && (
          <fieldset className="space-y-2" onChange={(e) => set("primary_provider_id", (e.target as unknown as HTMLInputElement).value)}>
            <legend className="mb-2 text-sm font-medium text-ink">مقدم الرعاية الرئيسي</legend>
            <ChoiceCard name="prov" value="" label="لاحقًا — ضعه في قائمة غير الموزّعين" description="سيظهر في لوحة التوزيع لتعيينه." defaultChecked={!v.primary_provider_id} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {providers.filter((p) => !v.specialty_code || p.specialty_code === v.specialty_code).map((p) => (
                <ChoiceCard key={p.id} name="prov" value={p.id} label={p.full_name} description={`الحالات ${p.active} من ${p.capacity}${p.active >= p.capacity ? " — السعة ممتلئة" : ""}`} icon={<UserCheck size={18} />} defaultChecked={v.primary_provider_id === p.id} />
              ))}
            </div>
          </fieldset>
        )}
        {step === 5 && (
          <div className="space-y-4">
            <Checkbox checked={v.create_access === "1"} onChange={(e) => set("create_access", e.target.checked ? "1" : "0")} label="تفعيل دخول المراجع للمنصة" description="يدخل برقم هويته، ثم رمز تحقق يُرسل إلى جواله المسجّل." />
            <div className="rounded-[18px] bg-sand-50 p-5 text-sm ring-1 ring-sand-200">
              <div className="mb-3 flex items-center gap-2 font-semibold text-ink"><KeyRound size={16} /> المراجعة قبل الإنشاء</div>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[["الاسم", v.full_name], ["الجوال", v.phone], ["الهوية", v.national_id ? "•••••" + v.national_id.slice(-4) : "—"], ["الخدمة", specialties.find((s) => s.code === v.specialty_code)?.name], ["الرحلة", v.episode_title || "رحلة تأهيلية"], ["مقدم الرعاية", providers.find((p) => p.id === v.primary_provider_id)?.full_name ?? "غير موزّع"]].map(([l, x]) => (
                  <div key={l}><dt className="text-xs text-text-2">{l}</dt><dd className="text-ink">{x || "—"}</dd></div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </div>
      <div className="mt-8 flex justify-between border-t border-line-soft pt-5">
        <Button variant="ghost" onClick={() => { setErr(null); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0} icon={<ArrowRight size={16} />}>السابق</Button>
        {step < STEPS.length - 1 ? <Button onClick={next} loading={pending} iconEnd={<ArrowLeft size={16} />}>التالي</Button> : <Button onClick={submit} loading={pending} icon={<Check size={17} />}>إنشاء المراجع</Button>}
      </div>
    </div>
  );
}
