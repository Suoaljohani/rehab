"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, ImageUp, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { BrandLockup, type BrandProps } from "@/components/brand/co-brand";
import { cn } from "@/lib/cn";
import { removeHospitalLogo, saveHospitalIdentity, uploadHospitalLogo } from "@/lib/actions/brand";

export function IdentityEditor({ brand }: { brand: BrandProps }) {
  const [names, setNames] = useState({ hospital_name: brand.hospitalName ?? "", hospital_name_en: brand.hospitalNameEn ?? "" });
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const router = useRouter();

  const shown: BrandProps = { hospitalName: names.hospital_name || brand.hospitalName, hospitalNameEn: names.hospital_name_en || null, logoUrl: preview ?? brand.logoUrl };
  const dirtyNames = names.hospital_name !== (brand.hospitalName ?? "") || names.hospital_name_en !== (brand.hospitalNameEn ?? "");

  function pick(file?: File | null) {
    setError(null);
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileRef.current) fileRef.current.files = dt.files;
  }

  function upload() {
    setError(null);
    start(async () => {
      const r = await uploadHospitalLogo(new FormData(formRef.current!));
      if (!r.ok) return setError(r.error);
      toast({ tone: "success", title: r.message ?? "تم" });
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <figure className="overflow-hidden rounded-[18px] ring-1 ring-line">
          <div className="flex h-28 items-center justify-center bg-page px-6"><BrandLockup brand={shown} /></div>
          <figcaption className="border-t border-line-soft bg-surface px-4 py-2 text-xs text-text-2">الموقع العام وشاشات الدخول</figcaption>
        </figure>
        <figure className="overflow-hidden rounded-[18px] ring-1 ring-line">
          <div className="surface-ink flex h-36 items-center justify-center px-6"><div className="w-[232px]"><BrandLockup brand={shown} tone="light" stacked logoClassName="h-9 max-w-[12rem]" /></div></div>
          <figcaption className="border-t border-line-soft bg-surface px-4 py-2 text-xs text-text-2">مساحة الموظفين وتذييل الموقع</figcaption>
        </figure>
      </div>

      <form ref={formRef} onSubmit={(e) => { e.preventDefault(); upload(); }}>
        <label
          htmlFor="logo-file"
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed px-6 py-8 text-center transition", drag ? "border-slate-400 bg-slate-50" : "border-line bg-surface-soft/60 hover:border-slate-300")}
        >
          <ImageUp size={26} className="text-slate-600" />
          <span className="font-medium text-ink">{preview ? "تم اختيار الشعار — راجع المعاينة ثم اعتمده" : "اسحب شعار المستشفى هنا أو اختر ملفًا"}</span>
          <span className="text-xs text-text-2">SVG مفضّل (يبقى حادًا بكل الأحجام) · PNG أو WEBP بخلفية شفافة · حتى ١ ميغابايت</span>
          <input ref={fileRef} id="logo-file" name="logo" type="file" accept=".svg,image/svg+xml,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {error && <Notice tone="danger" className="mt-3">{error}</Notice>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-text-2"><ShieldCheck size={14} /> يُفحص ملف SVG ويُرفض إن احتوى على نصوص برمجية أو روابط خارجية.</span>
          <div className="flex gap-2">
            {brand.logoUrl && !preview && (
              <Button type="button" variant="quiet" size="sm" icon={<EyeOff size={15} />} loading={pending}
                onClick={() => start(async () => { const r = await removeHospitalLogo(); toast(r.ok ? { tone: "success", title: r.message ?? "تم" } : { tone: "danger", title: "تعذّر", body: r.error }); router.refresh(); })}>
                إخفاء الشعار
              </Button>
            )}
            <Button type="submit" size="sm" icon={<ImageUp size={15} />} loading={pending} disabled={!preview}>اعتماد الشعار الرسمي</Button>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 border-t border-line-soft pt-6 sm:grid-cols-2">
        <Field label="اسم المستشفى" htmlFor="hn" hint="يظهر في التذييل ونص بديل الشعار.">
          <Input id="hn" value={names.hospital_name} onChange={(e) => setNames({ ...names, hospital_name: e.target.value })} />
        </Field>
        <Field label="Hospital name (English)" htmlFor="hne">
          <Input id="hne" dir="ltr" value={names.hospital_name_en} onChange={(e) => setNames({ ...names, hospital_name_en: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant={dirtyNames ? "primary" : "quiet"} disabled={!dirtyNames} loading={pending} icon={<Save size={15} />}
          onClick={() => start(async () => { const r = await saveHospitalIdentity({ hospital_name: names.hospital_name, hospital_name_en: names.hospital_name_en }); toast(r.ok ? { tone: "success", title: r.message ?? "تم" } : { tone: "danger", title: "تعذّر الحفظ", body: r.error }); if (r.ok) router.refresh(); })}>
          حفظ الاسم
        </Button>
      </div>
    </div>
  );
}
