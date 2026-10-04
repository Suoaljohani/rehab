import type { Metadata } from "next";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { ExerciseForm } from "@/components/exercise/exercise-form";

export const metadata: Metadata = { title: "اقتراح تمرين" };

export default async function ProposeExercise() {
  await requireRole(PROVIDER_AREA_ROLES);
  const supabase = await createClient();
  const { data: specs } = await supabase.from("specialties").select("code, name").order("sort");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="اقتراح تمرين جديد" description="يُحفظ كمسودة، ثم يُرسل للمراجعة. لا يظهر للمراجعين إلا بعد الاعتماد." />
      <Notice tone="info" className="mb-5">بعد الإنشاء يمكنك رفع الفيديو وإرسال التمرين لمراجعة المحتوى السريري.</Notice>
      <Card className="p-6 sm:p-8"><ExerciseForm mode="create" specialties={specs ?? []} back="/provider/library" /></Card>
    </div>
  );
}
