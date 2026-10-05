"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, ImageUp, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { BrandLockup, type BrandProps } from "@/components/brand/co-brand";
import { cn } from "@/lib/cn";
import { removeHospitalLogo, saveHospitalIdentity, uploadHospitalLogo } from "@/lib/actions/brand";

type Kind = "logo" | "mark" | "full";
type Stored = { logo: boolean; mark: boolean; full: boolean };

const SLOTS: { kind: Kind; title: string; use: string; box: string }[] = [
  { kind: "logo", title: "الشعار الأفقي", use: "الرئيسي — رأس الموقع، شاشات الدخول، مساحة الموظفين", box: "h-24" },
  { kind: "mark", title: "الرمز", use: "الأماكن الضيقة — الجوال وتطبيق المراجع", box: "h-24" },
  { kind: "full", title: "الشعار الكامل", use: "تذييل الموقع", box: "h-24" },
];

export function IdentityEditor({ brand, stored }: { brand: BrandProps; stored: Stored }) {
  const [names, setNames] = useState({ hospital_name: brand.hospitalName ?? "", hospital_name_en: brand.hospitalNameEn ?? "", hospital_cluster: brand.cluster ?? "" });
  const [previews, setPreviews] = useState<Partial<Record<Kind, string>>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const shown: BrandProps = {
    hospitalName: names.hospital_name || brand.hospitalName,
    hospitalNameEn: names.hospital_name_en || null,
    logoUrl: previews.logo ?? brand.logoUrl,
    markUrl: previews.mark ?? brand.markUrl,
    fullUrl: previews.full ?? brand.fullUrl,
  };
  const dirtyNames = names.hospital_name !== (brand.hospitalName ?? "") || names.hospital_name_en !== (brand.hospitalNameEn ?? "") || names.hospital_cluster !== (brand.cluster ?? "");

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <figure className="overflow-hidden rounded-[18px] ring-1 ring-line">
          <div className="flex h-28 items-center justify-center bg-page px-6"><BrandLockup brand={shown} shortPlatform logoClassName="h-11" /></div>
          <figcaption className="border-t border-line-soft bg-surface px-4 py-2 text-xs text-text-2">رأس الموقع وشاشات الدخول</figcaption>
        </figure>
        <figure className="overflow-hidden rounded-[18px] ring-1 ring-line">
          <div className="surface-ink flex h-28 items-center justify-center px-6"><div className="w-[232px]"><BrandLockup brand={shown} tone="light" stacked logoClassName="h-9 max-w-[12rem]" /></div></div>
          <figcaption className="border-t border-line-soft bg-surface px-4 py-2 text-xs text-text-2">الشريط الجانبي لمساحة الموظفين</figcaption>
        </figure>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SLOTS.map((s) => (
          <Slot key={s.kind} slot={s} current={s.kind === "logo" ? brand.logoUrl : s.kind === "mark" ? (stored.mark ? brand.markUrl : null) : stored.full ? brand.fullUrl : null}
            preview={previews[s.kind]} onPreview={(url) => setPreviews((p) => ({ ...p, [s.kind]: url ?? undefined }))}
            onDone={() => { setPreviews((p) => ({ ...p, [s.kind]: undefined })); router.refresh(); }} />
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-text-2"><ShieldCheck size={14} /> SVG مفضّل، أو PNG / WEBP بخلفية شفافة حتى ١ ميغابايت. يُفحص ملف SVG ويُرفض إن احتوى على نصوص برمجية أو روابط خارجية.</p>

      <div className="grid grid-cols-1 gap-4 border-t border-line-soft pt-6 sm:grid-cols-3">
        <Field label="اسم المستشفى" htmlFor="hn" hint="نص بديل للشعار وفي حقوق النشر.">
          <Input id="hn" value={names.hospital_name} onChange={(e) => setNames({ ...names, hospital_name: e.target.value })} />
        </Field>
        <Field label="Hospital name (English)" htmlFor="hne">
          <Input id="hne" dir="ltr" value={names.hospital_name_en} onChange={(e) => setNames({ ...names, hospital_name_en: e.target.value })} />
        </Field>
        <Field label="التجمع الصحي" htmlFor="hc">
          <Input id="hc" value={names.hospital_cluster} onChange={(e) => setNames({ ...names, hospital_cluster: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant={dirtyNames ? "primary" : "quiet"} disabled={!dirtyNames} loading={pending} icon={<Save size={15} />}
          onClick={() => start(async () => { const r = await saveHospitalIdentity(names); toast(r.ok ? { tone: "success", title: r.message ?? "تم" } : { tone: "danger", title: "تعذّر الحفظ", body: r.error }); if (r.ok) router.refresh(); })}>
          حفظ البيانات
        </Button>
      </div>
    </div>
  );
}

function Slot({ slot, current, preview, onPreview, onDone }: { slot: (typeof SLOTS)[number]; current: string | null | undefined; preview?: string; onPreview: (url: string | null) => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const id = `logo-file-${slot.kind}`;
  const src = preview ?? current;

  function pick(file?: File | null) {
    setError(null);
    if (!file) return;
    onPreview(URL.createObjectURL(file));
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileRef.current) fileRef.current.files = dt.files;
  }

  return (
    <form ref={formRef} className="flex flex-col rounded-[18px] bg-surface ring-1 ring-line" onSubmit={(e) => {
      e.preventDefault(); setError(null);
      start(async () => {
        const r = await uploadHospitalLogo(new FormData(formRef.current!));
        if (!r.ok) return setError(r.error);
        toast({ tone: "success", title: r.message ?? "تم" });
        if (fileRef.current) fileRef.current.value = "";
        onDone();
      });
    }}>
      <input type="hidden" name="kind" value={slot.kind} />
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div><div className="font-medium text-ink">{slot.title}</div><div className="mt-0.5 text-xs text-text-2">{slot.use}</div></div>
        {preview ? <Badge size="sm" tone="warning">غير معتمد</Badge> : current ? <Badge size="sm" tone="success" dot>معتمد</Badge> : <Badge size="sm" tone="muted">{slot.kind === "logo" ? "غير مرفوع" : "يستخدم الأفقي"}</Badge>}
      </div>
      <label htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={cn("m-4 grid cursor-pointer place-items-center overflow-hidden rounded-[14px] border-2 border-dashed p-3 transition", slot.box, drag ? "border-slate-400 bg-slate-50" : "border-line bg-page hover:border-slate-300")}>
        {src
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={src} alt="" className="h-[4.5rem] w-full object-contain" />
          : <span className="flex flex-col items-center gap-1 text-xs text-text-2"><ImageUp size={20} className="text-slate-600" /> اسحب الملف أو اختره</span>}
        <input ref={fileRef} id={id} name="logo" type="file" accept=".svg,image/svg+xml,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {error && <Notice tone="danger" className="mx-4 mb-3">{error}</Notice>}
      <div className="mt-auto flex justify-end gap-2 border-t border-line-soft px-4 py-3">
        {current && !preview && (
          <Button type="button" variant="quiet" size="sm" icon={<EyeOff size={14} />} loading={pending}
            onClick={() => start(async () => { const r = await removeHospitalLogo(slot.kind); toast(r.ok ? { tone: "success", title: r.message ?? "تم" } : { tone: "danger", title: "تعذّر", body: r.error }); onDone(); })}>إخفاء</Button>
        )}
        {preview && <Button type="button" variant="ghost" size="sm" onClick={() => { onPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>إلغاء</Button>}
        <Button type="submit" size="sm" icon={<ImageUp size={14} />} loading={pending} disabled={!preview}>اعتماد</Button>
      </div>
    </form>
  );
}
