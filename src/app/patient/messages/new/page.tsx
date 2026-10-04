import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPrograms } from "@/lib/patient-data";
import { NewThread } from "./new-thread";

export const metadata: Metadata = { title: "رسالة جديدة" };

export default async function NewMessage({ searchParams }: { searchParams: Promise<{ exercise?: string }> }) {
  const viewer = await requireRole(["patient"], "patient");
  const { exercise } = await searchParams;
  const programs = await getPrograms(viewer.patientId!);
  const live = programs.find((p) => ["active", "paused", "scheduled"].includes(p.status));
  const supabase = await createClient();
  const { data } = live?.current_version_id
    ? await supabase.from("program_exercises").select("id, exercise_version:exercise_versions(name)").eq("program_version_id", live.current_version_id).order("order_index")
    : { data: [] };
  const exercises = (data ?? []).map((d) => ({ id: d.id, name: (d.exercise_version as unknown as { name: string }).name }));
  return (
    <div className="space-y-5">
      <Link href="/patient/messages" className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> الرسائل</Link>
      <h1 className="font-display text-[1.875rem] font-semibold text-ink">رسالة إلى فريق رعايتك</h1>
      <div className="rounded-[26px] border border-line/80 bg-surface p-5 sm:p-7"><NewThread exercises={exercises} preselect={exercise} /></div>
    </div>
  );
}
