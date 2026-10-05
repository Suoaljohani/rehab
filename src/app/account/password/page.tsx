import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "كلمة المرور" };

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const { first } = await searchParams;
  const isFirst = first === "1";
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="حسابي" title={isFirst ? "اختر كلمة مرورك" : "تغيير كلمة المرور"}
        description={isFirst ? "أنشأ مدير النظام حسابك بكلمة مرور مؤقتة. اختر كلمة مرور خاصة بك قبل الوصول إلى بيانات المراجعين." : "يُسجَّل التغيير في سجل التدقيق. لن تُعرض كلمة المرور لأي شخص، بما في ذلك مدير النظام."} />
      {isFirst && <Notice tone="sage" icon={<ShieldCheck size={18} />} className="mb-5">هذه خطوة لمرة واحدة. بعدها ننصح بتفعيل التحقق الثنائي من صفحة «حسابي».</Notice>}
      <Card className="p-6 sm:p-8"><PasswordForm first={isFirst} /></Card>
    </div>
  );
}
