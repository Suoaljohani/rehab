import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "متابعة طلب" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <>
      <PageHero eyebrow="متابعة طلب" title="أين وصل طلبك؟" description="أدخل رقم الطلب ورقم الجوال المستخدم عند التقديم — لا تحتاج إلى حساب." />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-8"><TrackForm initialRef={ref} /></section>
    </>
  );
}
