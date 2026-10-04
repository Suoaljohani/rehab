import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search, UserPlus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Table, TableShell, THead, Th, Tr, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";
import { EPISODE_STATUS } from "@/lib/status";
import { fDate, fRelative } from "@/lib/format";

export const metadata: Metadata = { title: "المراجعين" };
const PAGE = 20;

export default async function AdminPatients({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; specialty?: string; page?: string }> }) {
  await requireRole(["supervisor", "admin", "super_admin"]);
  const { q = "", status = "", specialty = "", page = "1" } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const supabase = await createClient();
  let query = supabase.from("episodes").select("id, code, title, status, specialty_code, created_at, patient:patients!inner(id, full_name, mrn, access_id, created_at, status), specialty:specialties(name), care_team:care_team_members(role, ended_at, provider:profiles!care_team_members_provider_id_fkey(full_name))", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (specialty) query = query.eq("specialty_code", specialty);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,mrn.ilike.%${term}%,access_id.ilike.%${term}%`, { referencedTable: "patients" });
  const [{ data, count }, { data: specs }] = await Promise.all([
    query.order("created_at", { ascending: false }).range((p - 1) * PAGE, p * PAGE - 1),
    supabase.from("specialties").select("code, name").order("sort"),
  ]);
  const ids = (data ?? []).map((e) => e.id);
  const { data: acts } = ids.length ? await supabase.from("exercise_completions").select("episode_id, completed_at").in("episode_id", ids).order("completed_at", { ascending: false }).limit(500) : { data: [] };
  const last = new Map<string, string>();
  (acts ?? []).forEach((a) => { if (!last.has(a.episode_id)) last.set(a.episode_id, a.completed_at); });
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (np: number) => `/admin/patients?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), ...(specialty && { specialty }), page: String(np) })}`;
  const sel = "h-10 rounded-[12px] border border-line bg-surface px-3 text-sm outline-none focus:border-slate-300";
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="المراجعين" description="كل ملف مراجع واحد قد يحتوي عدة رحلات تأهيلية — تظهر هنا الرحلات." actions={<>
        <a href={`/admin/patients/export?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), ...(specialty && { specialty }) })}`} className={buttonClasses("quiet")}><Download size={17} /> تصدير CSV</a>
        <ButtonLink href="/admin/patients/new" icon={<UserPlus size={17} />}>مراجع جديد</ButtonLink>
      </>} />
      <TableShell
        toolbar={<form className="flex w-full flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1"><Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-3" /><input name="q" defaultValue={q} placeholder="الاسم، رقم الملف، أو رقم الدخول" aria-label="بحث" className="h-10 w-full rounded-[12px] border border-line bg-page/40 ps-9 pe-3 text-sm outline-none focus:border-slate-300" /></div>
          <select name="status" defaultValue={status} aria-label="الحالة" className={sel}><option value="">كل الحالات</option>{Object.entries(EPISODE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <select name="specialty" defaultValue={specialty} aria-label="التخصص" className={sel}><option value="">كل التخصصات</option>{(specs ?? []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
          <button className={buttonClasses("primary", "sm", "h-10")}>تصفية</button>
        </form>}
        footer={<div className="flex items-center justify-between"><span>{count ?? 0} رحلة · صفحة {p} من {pages}</span><div className="flex gap-2">{p > 1 && <Link href={qs(p - 1)} className={buttonClasses("quiet", "sm")}>السابق</Link>}{p < pages && <Link href={qs(p + 1)} className={buttonClasses("quiet", "sm")}>التالي</Link>}</div></div>}>
        {(data ?? []).length === 0 ? <EmptyState title="لا توجد نتائج" description="جرّب تغيير الفلاتر." /> : (
          <Table>
            <THead><tr><Th>المراجع</Th><Th>رقم الملف</Th><Th>الرحلة</Th><Th>التخصص</Th><Th>مقدم الرعاية الرئيسي</Th><Th>الحالة</Th><Th>آخر نشاط</Th><Th>تاريخ الإنشاء</Th></tr></THead>
            <tbody>{(data ?? []).map((e) => {
              const pt = e.patient as unknown as { id: string; full_name: string; mrn: string; access_id: string };
              const pr = (e.care_team as unknown as { role: string; ended_at: string | null; provider: { full_name: string } }[]).find((m) => m.role === "primary" && !m.ended_at);
              return (
                <Tr key={e.id}>
                  <Td><Link href={`/admin/patients/${pt.id}`} className="flex items-center gap-3 font-medium text-ink hover:underline"><Avatar name={pt.full_name} size="sm" />{pt.full_name}</Link></Td>
                  <Td className="text-text-2 tabular" dir="ltr">{pt.mrn}</Td>
                  <Td><div className="text-ink">{e.title}</div><div className="text-xs text-text-3" dir="ltr">{e.code}</div></Td>
                  <Td>{(e.specialty as unknown as { name: string })?.name}</Td>
                  <Td>{pr?.provider.full_name ?? <span className="text-clay-600">غير معيّن</span>}</Td>
                  <Td><StatusBadge map={EPISODE_STATUS} value={e.status} size="sm" /></Td>
                  <Td className="text-text-2">{last.get(e.id) ? fRelative(last.get(e.id)) : "—"}</Td>
                  <Td className="text-text-2">{fDate(e.created_at)}</Td>
                </Tr>
              );
            })}</tbody>
          </Table>
        )}
      </TableShell>
    </div>
  );
}
