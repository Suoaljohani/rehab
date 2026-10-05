import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, Quote } from "../auth-shell";
import { PatientLogin } from "./patient-login";
import { EmergencyNotice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "دخول المراجع" };

export default async function PatientLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell aside={<Quote />}>
      <div className="mb-2 text-sm font-medium text-sage-700">بوابة المراجع</div>
      <h1 className="font-display text-[2.125rem] font-semibold leading-tight text-ink">أهلًا بعودتك</h1>
      <p className="mb-8 mt-2 text-text-2">أدخل رقم هويتك الوطنية أو الإقامة، وسنرسل رمز تحقق إلى جوالك المسجّل.</p>
      <PatientLogin next={next} />
      <EmergencyNotice compact className="mt-8" />
      <p className="mt-6 text-sm text-text-2">لست مراجعًا؟ <Link href="/login/staff" className="font-medium text-slate-600 hover:underline">دخول الموظفين</Link></p>
    </AuthShell>
  );
}
