import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { StaffLogin } from "./staff-login";

export const metadata: Metadata = { title: "دخول الموظفين" };

export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell aside={<StaffAside />}>
      <div className="mb-2 text-sm font-medium text-slate-500">بوابة فريق التأهيل والإدارة</div>
      <h1 className="font-display text-[2.125rem] font-semibold leading-tight text-ink">مساحة العمل السريرية</h1>
      <p className="mb-8 mt-2 text-text-2">سجّل الدخول ببريدك الوظيفي الذي أنشأه لك مدير النظام. الحسابات شخصية ولا يجوز مشاركتها.</p>
      <StaffLogin next={next} />
      <p className="mt-5 text-sm text-text-2">نسيت كلمة المرور أو لا تملك حسابًا؟ تواصل مع مدير النظام في القسم — لا يوجد تسجيل ذاتي للموظفين.</p>
      <p className="mt-6 text-sm text-text-2">مراجع؟ <Link href="/login/patient" className="font-medium text-slate-600 hover:underline">الدخول برقم الهوية</Link></p>
    </AuthShell>
  );
}

function StaffAside() {
  return (
    <div className="max-w-md">
      <div className="mb-6 h-px w-16 bg-sage-300" />
      <p className="font-display text-[2rem] font-semibold leading-snug">كل مراجع، كل برنامج، كل تقدم — في مكان واحد هادئ.</p>
      <ul className="mt-6 space-y-2 text-ivory/70">
        <li>• مركز انتباه يُظهر ما يحتاج متابعتك فورًا</li>
        <li>• منشئ برامج منزلية بالإصدارات والمعاينة</li>
        <li>• صلاحيات مبنية على فريق الرعاية وسجل تدقيق كامل</li>
      </ul>
    </div>
  );
}
