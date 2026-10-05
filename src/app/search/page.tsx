import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, Stethoscope, Users } from "lucide-react";
import { requireRole, STAFF_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Avatar } from "@/components/ui/avatar";
import { REGION_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "بحث" };

/** Global staff search — every result set is filtered server-side by RLS (§98). */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireRole(STAFF_ROLES);
  const { q = "" } = await searchParams;
  const term = q.trim().replace(/[%,()]/g, "");
  const supabase = await createClient();
  const isProviderArea = viewer.role === "provider";
  const [patients, exercises, providers] = term.length < 2 ? [{ data: [] }, { data: [] }, { data: [] }] : await Promise.all([
    viewer.role === "content_reviewer" ? Promise.resolve({ data: [] as never[] }) :
      supabase.from("patients").select("id, full_name, mrn, access_id, episodes(id, title, status)").is("removed_at", null).or(/^\d{10}$/.test(term) ? `national_id.eq.${term}` : `full_name.ilike.%${term}%,mrn.ilike.%${term}%`).limit(15),
    supabase.from("exercises").select("id, code, status, current:exercise_versions!exercises_current_fk(name, name_en, body_region)").neq("status", "archived").limit(200),
    supabase.from("profiles").select("id, full_name, role, staff:staff_profiles(title)").neq("role", "patient").is("removed_at", null).ilike("full_name", `%${term}%`).limit(10),
  ]);
  const exMatches = ((exercises.data ?? []) as unknown as { id: string; code: string; current: { name: string; name_en: string | null; body_region: string | null } | null }[])
    .filter((e) => e.current && (e.current.name.includes(term) || (e.current.name_en ?? "").toLowerCase().includes(term.toLowerCase()) || e.code.toLowerCase().includes(term.toLowerCase())))
    .slice(0, 12);
  const pts = (patients.data ?? []) as unknown as { id: string; full_name: string; mrn: string; access_id: string; episodes: { id: string; title: string; status: string }[] }[];
  const none = term.length >= 2 && pts.length === 0 && exMatches.length === 0 && (providers.data ?? []).length === 0;
  return (
    <div className="max-w-4xl">
      <PageHeader title={term ? `نتائج البحث: «${term}»` : "البحث"} description="تظهر النتائج حسب صلاحياتك فقط." />
      {term.length < 2 ? <Card><EmptyState title="اكتب كلمتين على الأقل للبحث" /></Card> : none ? <Card><EmptyState title="لا توجد نتائج" description="جرّب الاسم أو رقم الملف أو رقم الهوية." /></Card> : (
        <div className="space-y-5">
          {pts.length > 0 && (
            <Card>
              <CardHeader title={<span className="inline-flex items-center gap-2"><Users size={18} /> المراجعون</span>} />
              <ul className="divide-y divide-line-soft">
                {pts.map((p) => {
                  const ep = p.episodes.find((e) => e.status === "active") ?? p.episodes[0];
                  const href = isProviderArea ? (ep ? `/provider/patients/${ep.id}` : "#") : `/admin/patients/${p.id}`;
                  return (
                    <li key={p.id}><Link href={href} className="flex items-center gap-3 py-3 hover:opacity-80">
                      <Avatar name={p.full_name} size="sm" /><div className="flex-1"><div className="font-medium text-ink">{p.full_name}</div><div className="text-xs text-text-2" dir="ltr">{p.mrn}</div></div>
                      <span className="text-sm text-text-2">{ep?.title}</span>
                    </Link></li>
                  );
                })}
              </ul>
            </Card>
          )}
          {exMatches.length > 0 && (
            <Card>
              <CardHeader title={<span className="inline-flex items-center gap-2"><Dumbbell size={18} /> التمارين</span>} />
              <ul className="divide-y divide-line-soft">
                {exMatches.map((e) => (
                  <li key={e.id}><Link href={isProviderArea ? `/provider/library/${e.id}` : `/admin/exercises/${e.id}`} className="flex justify-between py-3 hover:opacity-80">
                    <span className="font-medium text-ink">{e.current?.name}</span><span className="text-sm text-text-2">{REGION_LABEL[e.current?.body_region ?? ""] ?? ""} · <span dir="ltr">{e.code}</span></span>
                  </Link></li>
                ))}
              </ul>
            </Card>
          )}
          {(providers.data ?? []).length > 0 && (
            <Card>
              <CardHeader title={<span className="inline-flex items-center gap-2"><Stethoscope size={18} /> فريق التأهيل</span>} />
              <ul className="divide-y divide-line-soft">
                {(providers.data ?? []).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3"><Avatar name={p.full_name} size="sm" /><div><div className="font-medium text-ink">{p.full_name}</div><div className="text-xs text-text-2">{(p.staff as unknown as { title: string } | null)?.title}</div></div></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
