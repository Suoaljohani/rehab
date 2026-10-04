import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LibCard } from "@/components/exercise/library-grid";

/** Server-side filtering (§111). Versions are filtered in SQL; search on names. */
export async function searchLibrary(opts: { q?: string; region?: string; specialty?: string; difficulty?: string; status?: string; approvedOnly?: boolean }) {
  const supabase = await createClient();
  let q = supabase.from("exercise_versions")
    .select("id, exercise_id, version, status, name, name_en, body_region, difficulty, specialty_code, equipment, video_path, exercise:exercises!exercise_versions_exercise_id_fkey(id, code, status, current_version_id, latest_version_id)")
    .order("name");
  if (opts.region) q = q.eq("body_region", opts.region);
  if (opts.specialty) q = q.eq("specialty_code", opts.specialty);
  if (opts.difficulty) q = q.eq("difficulty", opts.difficulty);
  if (opts.q) q = q.or(`name.ilike.%${opts.q.replace(/[%,()]/g, "")}%,name_en.ilike.%${opts.q.replace(/[%,()]/g, "")}%`);
  const { data } = await q.limit(500);
  const rows = (data ?? []) as unknown as { id: string; exercise_id: string; status: string; name: string; name_en: string | null; body_region: string | null; difficulty: string | null; specialty_code: string | null; equipment: string[]; video_path: string | null; exercise: { id: string; code: string; status: string; current_version_id: string | null; latest_version_id: string | null } }[];
  // one card per exercise: the version that represents it (current approved, else latest)
  const out: LibCard[] = [];
  for (const r of rows) {
    const ex = r.exercise;
    const representative = ex.current_version_id ?? ex.latest_version_id;
    if (r.id !== representative) continue;
    if (opts.approvedOnly && ex.status !== "approved") continue;
    if (opts.status && ex.status !== opts.status) continue;
    const pendingNew = ex.latest_version_id && ex.latest_version_id !== ex.current_version_id && ex.current_version_id ? "نسخة جديدة قيد الإعداد" : null;
    out.push({ id: ex.id, code: ex.code, status: ex.status, name: r.name, name_en: r.name_en, region: r.body_region, difficulty: r.difficulty, specialty: r.specialty_code, equipment: r.equipment, hasVideo: !!r.video_path, pending: pendingNew });
  }
  return out;
}
