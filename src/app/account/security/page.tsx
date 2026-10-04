import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { MfaSetup } from "./mfa-setup";

export const metadata: Metadata = { title: "التحقق الثنائي" };

export default function SecurityPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="التحقق الثنائي (MFA)" description="أضف طبقة حماية ثانية لحسابك باستخدام تطبيق مصادقة على جوالك." />
      <Card className="p-6 sm:p-8"><MfaSetup /></Card>
    </div>
  );
}
