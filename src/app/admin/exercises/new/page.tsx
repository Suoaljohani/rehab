import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { ExerciseForm } from "@/components/exercise/exercise-form";

export const metadata: Metadata = { title: "تمرين جديد" };

export default async function NewExercise() {
  await requireRole(["content_reviewer", "supervisor", "admin", "super_admin"]);
  const supabase = await createClient();
  const { data: specs } = await supabase.from("specialties").select("code, name").order("sort");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="تمرين جديد" description="يُنشأ كمسودة (النسخة ١). بعد رفع الفيديو أرسله للمراجعة." />
      <Card className="p-6 sm:p-8"><ExerciseForm mode="create" specialties={specs ?? []} back="/admin/exercises" /></Card>
    </div>
  );
}
