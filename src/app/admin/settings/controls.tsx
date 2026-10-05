"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/errors";
import { saveSetting, saveSpecialty } from "@/lib/actions/admin";
import { RemoveButton } from "@/components/admin/manage";

function useRun() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return {
    pending,
    run: (fn: () => Promise<ActionResult>, ok?: () => void) => start(async () => {
      const r = await fn();
      if (!r.ok) toast({ tone: "danger", title: "تعذّر الحفظ", body: r.error });
      else { toast({ tone: "success", title: r.message ?? "تم" }); ok?.(); router.refresh(); }
    }),
  };
}

/** Switch with a confirmation step — every change to a system setting is audited. */
export function SettingToggle({ settingKey, value, label, confirmOn, confirmOff }: { settingKey: string; value: boolean; label: string; confirmOn?: string; confirmOff?: string }) {
  const [on, setOn] = useState(value);
  const [ask, setAsk] = useState(false);
  const { pending, run } = useRun();
  const next = !on;
  const message = next ? confirmOn : confirmOff;
  const commit = () => run(() => saveSetting(settingKey, next), () => { setOn(next); setAsk(false); });
  return (
    <>
      <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={pending}
        onClick={() => (message ? setAsk(true) : commit())}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:opacity-60", on ? "bg-slate-brand" : "bg-[#D9D1C7]")}>
        <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(41,50,61,0.25)] transition-all duration-300", on ? "start-6" : "start-1")} />
      </button>
      <Dialog open={ask} onClose={() => setAsk(false)} size="sm" title={label} description={message}
        footer={<><Button variant="secondary" onClick={() => setAsk(false)}>إلغاء</Button><Button loading={pending} onClick={commit}>{next ? "تفعيل" : "إيقاف"}</Button></>}>
        <p className="text-sm text-text-2">سيُسجَّل هذا التغيير باسمك في سجل التدقيق مع القيمة السابقة والجديدة.</p>
      </Dialog>
    </>
  );
}

export function SettingNumber({ settingKey, value, min, max, unit, label }: { settingKey: string; value: number; min: number; max: number; unit: string; label: string }) {
  const [v, setV] = useState(String(value));
  const [base, setBase] = useState(String(value));
  const { pending, run } = useRun();
  const n = Number(v);
  const valid = Number.isInteger(n) && n >= min && n <= max;
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Input aria-label={label} type="number" inputMode="numeric" min={min} max={max} value={v} onChange={(e) => setV(e.target.value)} className={cn("w-[7.5rem] pe-14 tabular-nums", !valid && "border-danger")} />
        <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-xs text-text-2">{unit}</span>
      </div>
      <Button size="sm" variant={v !== base ? "primary" : "quiet"} disabled={v === base || !valid} loading={pending} icon={<Save size={14} />}
        onClick={() => run(() => saveSetting(settingKey, n), () => setBase(v))}>حفظ</Button>
    </div>
  );
}

export function SpecialtyRow({ code, name, nameEn, sort }: { code: string; name: string; nameEn: string; sort: number }) {
  const [v, setV] = useState({ name, name_en: nameEn, sort });
  const [base, setBase] = useState(JSON.stringify(v));
  const { pending, run } = useRun();
  const dirty = JSON.stringify(v) !== base;
  return (
    <tr className="border-b border-line-soft last:border-0">
      <td className="py-2.5 pe-3 font-mono text-xs text-text-2" dir="ltr">{code}</td>
      <td className="py-2.5 pe-3"><Input aria-label={`الاسم العربي ${code}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></td>
      <td className="py-2.5 pe-3"><Input aria-label={`الاسم الإنجليزي ${code}`} dir="ltr" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} /></td>
      <td className="py-2.5 pe-3"><Input aria-label={`ترتيب ${code}`} type="number" className="w-20" value={v.sort} onChange={(e) => setV({ ...v, sort: Number(e.target.value) })} /></td>
      <td className="py-2.5 text-end"><div className="flex items-center justify-end gap-1"><Button size="sm" variant={dirty ? "primary" : "quiet"} disabled={!dirty} loading={pending} onClick={() => run(() => saveSpecialty(code, v), () => setBase(JSON.stringify(v)))}>حفظ</Button><RemoveButton kind="specialty" id={code} name={name} iconOnly /></div></td>
    </tr>
  );
}

export function NewSpecialty() {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ code: "", name: "", name_en: "" });
  const { pending, run } = useRun();
  const valid = /^[a-z][a-z0-9_]{1,15}$/.test(v.code) && v.name.trim() && v.name_en.trim();
  return (
    <>
      <Button size="sm" variant="secondary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>تخصص جديد</Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="sm" title="إضافة تخصص" description="يظهر في ملفات الفريق والخدمات والتوزيع."
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button><Button disabled={!valid} loading={pending} onClick={() => run(() => saveSpecialty(v.code, { name: v.name.trim(), name_en: v.name_en.trim(), sort: 99 }, true), () => { setOpen(false); setV({ code: "", name: "", name_en: "" }); })}>إضافة</Button></>}>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-ink">الرمز<Input dir="ltr" className="mt-1.5" placeholder="cardio" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toLowerCase() })} /></label>
          <label className="block text-sm font-medium text-ink">الاسم العربي<Input className="mt-1.5" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
          <label className="block text-sm font-medium text-ink">الاسم الإنجليزي<Input dir="ltr" className="mt-1.5" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} /></label>
        </div>
      </Dialog>
    </>
  );
}
