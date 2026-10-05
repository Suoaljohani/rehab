"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { humanError, type ActionResult } from "@/lib/errors";
import { getViewer } from "@/lib/auth";

const MAX_BYTES = 1024 * 1024;
const TYPES: Record<string, string> = { "image/svg+xml": "svg", "image/png": "png", "image/webp": "webp" };

/**
 * Uploaded SVGs are rendered through <img> only, but are still rejected if they
 * carry anything active or external — scripts, handlers, foreign content, remote refs.
 */
const SVG_FORBIDDEN: [RegExp, string][] = [
  [/<script[\s>]/i, "سكربت"],
  [/\son[a-z]+\s*=/i, "أحداث تفاعلية"],
  [/javascript:/i, "روابط برمجية"],
  [/<foreignObject[\s>]/i, "محتوى أجنبي"],
  [/<(iframe|embed|object|audio|video|use)\b[^>]*\bhref\s*=\s*["'](?!#)/i, "عناصر خارجية"],
  [/<!ENTITY/i, "تعريفات XML"],
  [/(?:xlink:)?href\s*=\s*["'](?!#|data:image\/(?:png|jpe?g|webp|gif);)/i, "روابط خارجية"],
  [/@import|url\(\s*["']?(?!#|data:image\/)/i, "موارد خارجية"],
];

async function requireAdmin() {
  const viewer = await getViewer();
  return viewer && (viewer.role === "admin" || viewer.role === "super_admin") ? viewer : null;
}

async function saveBrand(patch: Record<string, unknown>) {
  const supabase = await createClient();
  const viewer = await requireAdmin();
  const { data: cur } = await supabase.from("cms_blocks").select("content").eq("key", "brand").maybeSingle();
  const content = { ...((cur?.content as Record<string, unknown>) ?? {}), ...patch };
  const { error } = await supabase.from("cms_blocks").upsert({ key: "brand", content, updated_by: viewer!.id, updated_at: new Date().toISOString() });
  if (error) return { ok: false as const, error: humanError(error) };
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function uploadHospitalLogo(fd: FormData): Promise<ActionResult<string>> {
  if (!(await requireAdmin())) return { ok: false, error: humanError("forbidden") };
  const file = fd.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "اختر ملف الشعار." };
  const ext = TYPES[file.type] ?? (file.name.toLowerCase().endsWith(".svg") ? "svg" : null);
  if (!ext) return { ok: false, error: "الصيغ المدعومة: SVG (مفضّل)، PNG، WEBP." };
  if (file.size > MAX_BYTES) return { ok: false, error: "حجم الشعار يجب ألا يتجاوز ١ ميغابايت." };

  let body: Blob = file;
  if (ext === "svg") {
    const text = await file.text();
    if (!/<svg[\s>]/i.test(text)) return { ok: false, error: "الملف ليس صورة SVG صالحة." };
    const hit = SVG_FORBIDDEN.find(([re]) => re.test(text));
    if (hit) return { ok: false, error: `رُفض الملف لاحتوائه على ${hit[1]}. صدّر الشعار كـ SVG نظيف (بدون نصوص برمجية أو روابط خارجية).` };
    body = new Blob([text], { type: "image/svg+xml" });
  }

  const supabase = await createClient();
  const path = `hospital-logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("brand").upload(path, body, { contentType: ext === "svg" ? "image/svg+xml" : file.type, cacheControl: "31536000", upsert: false });
  if (error) return { ok: false, error: humanError(error) };
  const { data } = supabase.storage.from("brand").getPublicUrl(path);
  const saved = await saveBrand({ logo_url: data.publicUrl });
  if (!saved.ok) return saved;
  return { ok: true, data: data.publicUrl, message: "اعتُمد الشعار الرسمي وظهر في كل واجهات المنصة." };
}

export async function saveHospitalIdentity(patch: { hospital_name: string | null; hospital_name_en: string | null }): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: humanError("forbidden") };
  const saved = await saveBrand({ hospital_name: patch.hospital_name?.trim() || null, hospital_name_en: patch.hospital_name_en?.trim() || null });
  return saved.ok ? { ok: true, message: "تم حفظ اسم المستشفى." } : saved;
}

/** Hides the logo everywhere; the file itself is kept for the audit trail. */
export async function removeHospitalLogo(): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: humanError("forbidden") };
  const saved = await saveBrand({ logo_url: null });
  return saved.ok ? { ok: true, message: "أُخفي الشعار. يمكنك رفع شعار جديد في أي وقت." } : saved;
}
