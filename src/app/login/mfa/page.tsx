import type { Metadata } from "next";
import { AuthShell, Quote } from "../auth-shell";
import { MfaChallenge } from "./mfa-challenge";

export const metadata: Metadata = { title: "التحقق الثنائي" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell aside={<Quote />}>
      <h1 className="font-display text-[2rem] font-semibold text-ink">التحقق الثنائي</h1>
      <p className="mb-8 mt-2 text-text-2">خطوة إضافية لحماية بيانات المراجعين.</p>
      <MfaChallenge next={next} />
    </AuthShell>
  );
}
