import type { Metadata } from "next";
import Link from "next/link";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProgramBuilder, type LibEx, type Line } from "@/components/provider/program-builder";
import { ErrorState } from "@/components/ui/states";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "منشئ البرنامج" };

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(PROVIDER_AREA_ROLES);
  const { id } = await params;
  const supabase = await createClient();
  const { data: program } = await supabase.from("home_programs").select("id, title, status, start_date, end_date, instructions, episode_id, current_version_id, patient:patients(full_name)").eq("id", id).maybeSingle();
  if (!program) return <ErrorState kind="denied" title="البرنامج غير متاح" description="البرنامج غير موجود أو لا تملك صلاحية الوصول إليه." action={<Link href="/provider/patients" className={buttonClasses("primary")}>مراجعيّ</Link>} />;
  const { data: draft } = await supabase.from("program_versions").select("id, version, instructions").eq("program_id", id).eq("status", "draft").maybeSingle();
  if (!draft) {
    return <ErrorState kind="archived" title="لا توجد مسودة مفتوحة" description="هذا البرنامج منشور. لتعديله افتح نسخة جديدة من ملف المراجع — التعديل لا يغيّر السجل السابق." action={<Link href={`/provider/patients/${program.episode_id}?tab=program`} className={buttonClasses("primary")}>العودة لملف المراجع</Link>} />;
  }
  const [{ data: pes }, { data: lib }, { data: specs }] = await Promise.all([
    supabase.from("program_exercises").select("*").eq("program_version_id", draft.id).order("order_index"),
    supabase.from("exercises").select("id, cur:exercise_versions!exercises_current_fk(id, version, name, name_en, body_region, specialty_code, category, exercise_type, difficulty, equipment, position, est_duration_sec, default_reps, default_sets, default_hold_sec, default_duration_sec, tags)").eq("status", "approved"),
    supabase.from("specialties").select("code, name").order("sort"),
  ]);
  const library: LibEx[] = (lib ?? []).filter((e) => e.cur).map((e) => {
    const c = e.cur as unknown as { id: string; version: number; name: string; name_en: string | null; body_region: string | null; specialty_code: string | null; category: string | null; exercise_type: string | null; difficulty: string | null; equipment: string[]; position: string | null; est_duration_sec: number; default_reps: number | null; default_sets: number | null; default_hold_sec: number | null; default_duration_sec: number | null; tags: string[] };
    return { id: e.id, versionId: c.id, version: c.version, name: c.name, name_en: c.name_en, region: c.body_region, specialty: c.specialty_code, category: c.category, type: c.exercise_type, difficulty: c.difficulty, equipment: c.equipment, position: c.position, est: c.est_duration_sec, reps: c.default_reps, sets: c.default_sets, hold: c.default_hold_sec, dur: c.default_duration_sec, tags: c.tags };
  }).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  // exercises already prescribed but no longer approved still need a name in the workspace
  const missing = (pes ?? []).filter((p) => !library.some((l) => l.id === p.exercise_id));
  if (missing.length) {
    const { data: extra } = await supabase.from("exercise_versions").select("id, exercise_id, version, name, name_en, body_region, est_duration_sec").in("id", missing.map((m) => m.exercise_version_id));
    (extra ?? []).forEach((x) => library.push({ id: x.exercise_id, versionId: x.id, version: x.version, name: `${x.name} (غير معتمد حاليًا)`, name_en: x.name_en, region: x.body_region, specialty: null, category: null, type: null, difficulty: null, equipment: [], position: null, est: x.est_duration_sec, reps: null, sets: null, hold: null, dur: null, tags: [] }));
  }
  return (
    <ProgramBuilder
      program={{ id: program.id, title: program.title, status: program.status, start_date: program.start_date, end_date: program.end_date, instructions: program.instructions, episode_id: program.episode_id }}
      version={draft}
      isRevision={!!program.current_version_id}
      patientName={(program.patient as unknown as { full_name: string }).full_name}
      lines={(pes ?? []) as Line[]}
      library={library}
      specialties={specs ?? []}
    />
  );
}
