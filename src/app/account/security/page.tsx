import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { MfaSetup } from "./mfa-setup";

export const metadata: Metadata = { title: "التحقق الثنائي" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const { required } = await searchParams;
  return (
    <div className="max-w-3xl">
      <PageHeader title="التحقق الثنائي (MFA)" description="أضف طبقة حماية ثانية لحسابك باستخدام تطبيق مصادقة على جوالك." />
      {required && <Notice tone="warning" title="التحقق الثنائي إلزامي" className="mb-5">تتطلب سياسة القسم تفعيل التحقق الثنائي قبل الوصول إلى بيانات المراجعين.</Notice>}
      <Card className="p-6 sm:p-8"><MfaSetup /></Card>
    </div>
  );
}
