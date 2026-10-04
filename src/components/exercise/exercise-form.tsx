"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, ImageIcon, Save, Send, Upload } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { createExercise, saveExerciseDraft, setExerciseMedia } from "@/lib/actions/exercises";
import { REGION_LABEL, DIFFICULTY_LEVEL } from "@/lib/format";

export type ExerciseValues = {
  name?: string; name_en?: string | null; description?: string | null; instructions?: string[]; specialty_code?: string | null; body_region?: string | null; category?: string | null;
  exercise_type?: string | null; difficulty?: string | null; equipment?: string[]; position?: string | null; est_duration_sec?: number | null; default_reps?: number | null;
  default_sets?: number | null; default_hold_sec?: number | null; default_duration_sec?: number | null; safety_notes?: string | null; contraindications?: string | null; tags?: string[]; change_note?: string | null;
};

export function ExerciseForm({ mode, versionId, exerciseId, initial, specialties, back }: { mode: "create" | "edit"; versionId?: string; exerciseId?: string; initial?: ExerciseValues; specialties: { code: string; name: string }[]; back: string }) {
  const [state, action] = useActionState(mode === "create" ? createExercise : saveExerciseDraft, null);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { if (state?.ok) { toast({ tone: "success", title: state.message ?? "تم الحفظ" }); router.refresh(); } }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = initial ?? {};
  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="back" value={back} />
      {versionId && <input type="hidden" name="version_id" value={versionId} />}
      {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم بالعربية" htmlFor="name" required><Input id="name" name="name" defaultValue={v.name} required /></Field>
        <Field label="الاسم بالإنجليزية" htmlFor="name_en"><Input id="name_en" name="name_en" dir="ltr" defaultValue={v.name_en ?? ""} /></Field>
        <Field label="وصف مختصر" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" rows={2} defaultValue={v.description ?? ""} /></Field>
        <Field label="خطوات التنفيذ (سطر لكل خطوة)" htmlFor="instructions" className="sm:col-span-2" required><Textarea id="instructions" name="instructions" rows={5} defaultValue={(v.instructions ?? []).join("\n")} /></Field>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Field label="التخصص" htmlFor="sp" required><Select id="sp" name="specialty_code" defaultValue={v.specialty_code ?? ""}><option value="">—</option>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></Field>
        <Field label="منطقة الجسم" htmlFor="br" required><Select id="br" name="body_region" defaultValue={v.body_region ?? ""}><option value="">—</option>{Object.entries(REGION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="المستوى" htmlFor="df"><Select id="df" name="difficulty" defaultValue={v.difficulty ?? ""}><option value="">—</option>{Object.entries(DIFFICULTY_LEVEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="الفئة" htmlFor="ct"><Input id="ct" name="category" defaultValue={v.category ?? ""} placeholder="تقوية، إطالة، توازن…" /></Field>
        <Field label="نوع التمرين" htmlFor="et"><Input id="et" name="exercise_type" dir="ltr" defaultValue={v.exercise_type ?? ""} placeholder="strengthening" /></Field>
        <Field label="الوضعية" htmlFor="po"><Input id="po" name="position" defaultValue={v.position ?? ""} /></Field>
        <Field label="الأدوات (مفصولة بفاصلة)" htmlFor="eq" className="sm:col-span-2"><Input id="eq" name="equipment" defaultValue={(v.equipment ?? []).join("، ")} /></Field>
        <Field label="الكلمات المفتاحية" htmlFor="tg"><Input id="tg" name="tags" defaultValue={(v.tags ?? []).join("، ")} /></Field>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">الوصفة الافتراضية</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Field label="تكرارات" htmlFor="dr"><Input id="dr" name="default_reps" type="number" min={0} defaultValue={v.default_reps ?? ""} /></Field>
          <Field label="مجموعات" htmlFor="ds"><Input id="ds" name="default_sets" type="number" min={0} defaultValue={v.default_sets ?? ""} /></Field>
          <Field label="ثبات (ث)" htmlFor="dh"><Input id="dh" name="default_hold_sec" type="number" min={0} defaultValue={v.default_hold_sec ?? ""} /></Field>
          <Field label="مدة (ث)" htmlFor="dd"><Input id="dd" name="default_duration_sec" type="number" min={0} defaultValue={v.default_duration_sec ?? ""} /></Field>
          <Field label="المدة التقديرية (ث)" htmlFor="es"><Input id="es" name="est_duration_sec" type="number" min={10} defaultValue={v.est_duration_sec ?? 120} /></Field>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="ملاحظات السلامة" htmlFor="sn"><Textarea id="sn" name="safety_notes" rows={3} defaultValue={v.safety_notes ?? ""} /></Field>
        <Field label="موانع الاستخدام" htmlFor="ci"><Textarea id="ci" name="contraindications" rows={3} defaultValue={v.contraindications ?? ""} /></Field>
        {mode === "edit" && <Field label="ملاحظة التغيير (لهذه النسخة)" htmlFor="cn" className="sm:col-span-2"><Input id="cn" name="change_note" defaultValue={v.change_note ?? ""} /></Field>}
      </section>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line-soft pt-5">
        {mode === "create" ? <SubmitButton icon={<Save size={17} />}>إنشاء كمسودة</SubmitButton> : (
          <>
            <SubmitButton variant="secondary" icon={<Save size={17} />}>حفظ المسودة</SubmitButton>
            <SubmitButton name="submit" value="1" icon={<Send size={17} />}>حفظ وإرسال للمراجعة</SubmitButton>
          </>
        )}
      </div>
      {mode === "edit" && versionId && exerciseId && <span className="hidden" data-exercise={exerciseId} />}
    </form>
  );
}

/** Uploads to the PRIVATE exercise-media bucket; the path is stored, never a public URL. */
export function MediaUploader({ versionId, exerciseId, videoPath, thumbPath, videoUrl }: { versionId: string; exerciseId: string; videoPath: string | null; thumbPath: string | null; videoUrl: string | null }) {
  const [busy, setBusy] = useState<null | "video" | "thumb">(null);
  const [progress, setProgress] = useState<string | null>(null);
  const vRef = useRef<HTMLInputElement>(null);
  const tRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();
  async function upload(file: File, kind: "video" | "thumb") {
    const max = kind === "video" ? 500 : 5;
    if (file.size > max * 1024 * 1024) return toast({ tone: "danger", title: "الملف كبير جدًا", body: `الحد الأقصى ${max} ميغابايت.` });
    const okTypes = kind === "video" ? ["video/mp4", "video/webm", "video/quicktime"] : ["image/jpeg", "image/png", "image/webp"];
    if (!okTypes.includes(file.type)) return toast({ tone: "danger", title: "نوع الملف غير مدعوم" });
    setBusy(kind);
    setProgress("جارٍ الرفع…");
    let duration: number | null = null;
    if (kind === "video") {
      duration = await new Promise<number | null>((res) => { const el = document.createElement("video"); el.preload = "metadata"; el.onloadedmetadata = () => res(Math.round(el.duration)); el.onerror = () => res(null); el.src = URL.createObjectURL(file); });
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `exercises/${exerciseId}/${versionId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("exercise-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) { setBusy(null); setProgress(null); return toast({ tone: "danger", title: "تعذّر الرفع", body: error.message }); }
    const r = await setExerciseMedia(versionId, kind === "video" ? { video_path: path, video_duration_sec: duration } : { thumbnail_path: path });
    setBusy(null);
    setProgress(null);
    if (!r.ok) return toast({ tone: "danger", title: "تعذّر الحفظ", body: r.error });
    toast({ tone: "success", title: kind === "video" ? "تم رفع الفيديو" : "تم رفع الصورة المصغّرة" });
    router.refresh();
  }
  return (
    <div className="space-y-4">
      {videoUrl ? <video src={videoUrl} controls preload="metadata" className="aspect-video w-full rounded-[18px] bg-ink" /> : (
        <div className="grid aspect-video place-items-center rounded-[18px] border-2 border-dashed border-line bg-surface-soft/50 text-center text-sm text-text-2"><div><Film className="mx-auto mb-2 text-text-3" />لا يوجد فيديو بعد</div></div>
      )}
      <div className="flex flex-wrap gap-2">
        <input ref={vRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "video")} />
        <input ref={tRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "thumb")} />
        <Button type="button" variant="secondary" size="sm" loading={busy === "video"} onClick={() => vRef.current?.click()} icon={<Upload size={15} />}>{videoPath ? "استبدال الفيديو" : "رفع فيديو"}</Button>
        <Button type="button" variant="quiet" size="sm" loading={busy === "thumb"} onClick={() => tRef.current?.click()} icon={<ImageIcon size={15} />}>{thumbPath ? "استبدال الصورة" : "صورة مصغّرة"}</Button>
      </div>
      {progress && <p className="text-xs text-text-2" aria-live="polite">{progress}</p>}
      <p className="text-xs text-text-3">يُخزّن المحتوى في مساحة خاصة ويُعرض بروابط مؤقتة موقّعة فقط. الحد ٥٠٠ ميغابايت (MP4/WebM).</p>
    </div>
  );
}
