import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Cpu, Download, Filter, Lock, X } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Select } from "@/components/ui/field";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Notice } from "@/components/ui/notice";
import { ROLE_LABEL } from "@/lib/status";
import { fDateTime, fRelative } from "@/lib/format";
import { AUDIT_ACTION, AUDIT_ENTITY, applyAuditFilters, type AuditFilters } from "./shared";

export const metadata: Metadata = { title: "سجل التدقيق" };
const PAGE = 30;

type Ev = { id: number; actor_id: string | null; actor_role: string | null; action: string; entity_type: string; entity_id: string | null; summary: string | null; previous: Record<string, unknown> | null; new: Record<string, unknown> | null; metadata: Record<string, unknown> | null; created_at: string };

function show(v: unknown) {
  if (v === null || v === undefined) return <span className="text-text-3">—</span>;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return <span className="break-all">{s.length > 160 ? s.slice(0, 160) + "…" : s}</span>;
}

function Diff({ e }: { e: Ev }) {
  const keys = Array.from(new Set([...Object.keys(e.previous ?? {}), ...Object.keys(e.new ?? {})])).filter((k) => !["created_at", "updated_at"].includes(k) || e.action !== "create");
  return (
    <div className="space-y-3">
      {keys.length > 0 && (
        <div className="overflow-x-auto rounded-[12px] ring-1 ring-line-soft">
          <table className="w-full text-xs">
            <thead className="bg-surface-soft text-text-2"><tr><th className="px-3 py-2 text-start font-medium">الحقل</th>{e.action !== "create" && <th className="px-3 py-2 text-start font-medium">السابق</th>}<th className="px-3 py-2 text-start font-medium">{e.action === "create" ? "القيمة" : "الجديد"}</th></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k} className="border-t border-line-soft align-top">
                  <td className="px-3 py-2 font-mono text-text-2" dir="ltr">{k}</td>
                  {e.action !== "create" && <td className="bg-danger-bg/40 px-3 py-2 font-mono text-text" dir="auto">{show(e.previous?.[k])}</td>}
                  <td className="bg-success-bg/40 px-3 py-2 font-mono text-text" dir="auto">{show(e.new?.[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {e.metadata && Object.keys(e.metadata).length > 0 && <div className="text-xs text-text-2">بيانات إضافية: <span className="font-mono" dir="ltr">{JSON.stringify(e.metadata)}</span></div>}
      {e.entity_id && <div className="text-xs text-text-2">المعرّف: <Link className="font-mono text-slate-700 underline-offset-2 hover:underline" dir="ltr" href={`/admin/audit?q=${e.entity_id}`}>{e.entity_id}</Link></div>}
    </div>
  );
}

export default async function Audit({ searchParams }: { searchParams: Promise<AuditFilters & { page?: string }> }) {
  const viewer = await requireRole(["supervisor", "admin", "super_admin"]);
  const sp = await searchParams;
  const f: AuditFilters = { entity: sp.entity || undefined, action: sp.action || undefined, actor: sp.actor || undefined, from: sp.from || undefined, to: sp.to || undefined, q: sp.q || undefined };
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const base = supabase.from("audit_events").select("*", { count: "exact" });
  const [{ data, count }, { data: staff }] = await Promise.all([
    applyAuditFilters(base, f).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    supabase.from("profiles").select("id, full_name").neq("role", "patient").order("full_name"),
  ]);
  const events = (data ?? []) as Ev[];
  const ids = Array.from(new Set(events.map((e) => e.actor_id).filter(Boolean))) as string[];
  const { data: actors } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = new Map((actors ?? []).map((a) => [a.id, a.full_name]));
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ ...f, page, ...patch }).forEach(([k, v]) => v !== undefined && v !== "" && !(k === "page" && v === 1) && p.set(k, String(v)));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const active = Object.values(f).some(Boolean);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="الحوكمة" title="سجل التدقيق" description="سجل غير قابل للتعديل أو الحذف لكل اطلاع وتغيير حساس — من فعل ماذا، ومتى، وما القيمة السابقة."
        actions={<a href={`/admin/audit/export${qs({ page: undefined })}`} className={buttonClasses("secondary")}><Download size={16} /> تصدير CSV</a>} />

      {viewer.role === "supervisor" && <Notice tone="info" className="mb-5">بصفتك مشرفًا ترى الأحداث التشغيلية فقط (الحلقات، الفرق، البرامج، المواعيد، التمارين). أحداث الهوية والحسابات متاحة لمدير النظام.</Notice>}

      <Card className="mb-5 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]" action="/admin/audit">
          <Select name="entity" defaultValue={f.entity ?? ""} aria-label="الكيان"><option value="">كل الكيانات</option>{Object.entries(AUDIT_ENTITY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select name="action" defaultValue={f.action ?? ""} aria-label="الإجراء"><option value="">كل الإجراءات</option>{Object.entries(AUDIT_ACTION).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</Select>
          <Select name="actor" defaultValue={f.actor ?? ""} aria-label="المستخدم"><option value="">كل المستخدمين</option>{(staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select>
          <Input type="date" name="from" defaultValue={f.from} aria-label="من تاريخ" />
          <Input type="date" name="to" defaultValue={f.to} aria-label="إلى تاريخ" />
          <div className="flex gap-2">
            {f.q && <input type="hidden" name="q" value={f.q} />}
            <Button type="submit" icon={<Filter size={15} />}>تصفية</Button>
            {active && <Link href="/admin/audit" className={buttonClasses("quiet")} aria-label="مسح التصفية"><X size={16} /></Link>}
          </div>
        </form>
        {f.q && <div className="mt-3 text-xs text-text-2">مقيّد بالمعرّف <span className="font-mono" dir="ltr">{f.q}</span></div>}
      </Card>

      <div className="mb-3 flex items-center justify-between text-sm text-text-2">
        <span>{total.toLocaleString("ar-SA-u-nu-latn")} حدث</span>
        <span className="flex items-center gap-1.5 text-xs"><Lock size={13} /> للقراءة فقط</span>
      </div>

      {events.length === 0 ? <Card><EmptyState title="لا توجد أحداث مطابقة" description="جرّب توسيع نطاق التاريخ أو إزالة بعض عوامل التصفية." /></Card> : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-line-soft">
            {events.map((e) => {
              const a = AUDIT_ACTION[e.action] ?? { label: e.action, tone: "muted" as const };
              const who = e.actor_id ? name.get(e.actor_id) ?? "مستخدم" : "النظام";
              const expandable = !!(e.previous || e.new || e.metadata || e.entity_id);
              const row = (
                <div className="grid grid-cols-1 items-center gap-x-4 gap-y-1 px-5 py-3.5 sm:grid-cols-[11rem_1fr_auto]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {e.actor_id ? <Avatar name={who} size="xs" /> : <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sand-100 text-slate-600 ring-1 ring-sand-200"><Cpu size={13} /></span>}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">{who}</div>
                      <div className="text-[11px] text-text-3">{e.actor_role ? ROLE_LABEL[e.actor_role] ?? e.actor_role : "آلي"}</div>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge size="sm" tone={a.tone}>{a.label}</Badge>
                    <span className="text-sm text-text">{AUDIT_ENTITY[e.entity_type] ?? e.entity_type}</span>
                    {e.summary && <span className="truncate text-sm text-text-2">· {e.summary}</span>}
                  </div>
                  <time className="whitespace-nowrap text-xs text-text-2 tabular-nums" dateTime={e.created_at} title={fDateTime(e.created_at)}>{fRelative(e.created_at)}</time>
                </div>
              );
              return (
                <li key={e.id}>
                  {expandable ? (
                    <details className="group">
                      <summary className="cursor-pointer list-none hover:bg-sand-50/60 [&::-webkit-details-marker]:hidden">{row}</summary>
                      <div className="border-t border-dashed border-line-soft bg-[#FCFAF7] px-5 py-4">
                        <div className="mb-3 text-xs text-text-2">{fDateTime(e.created_at)} · رقم الحدث {e.id}</div>
                        <Diff e={e} />
                      </div>
                    </details>
                  ) : row}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-line-soft bg-surface-soft px-5 py-3 text-sm">
            <span className="text-text-2">صفحة {page} من {pages}</span>
            <div className="flex gap-2">
              {page > 1 ? <Link href={`/admin/audit${qs({ page: page - 1 })}`} className={buttonClasses("quiet", "sm")}><ChevronRight size={15} /> الأحدث</Link> : null}
              {page < pages ? <Link href={`/admin/audit${qs({ page: page + 1 })}`} className={buttonClasses("quiet", "sm")}>الأقدم <ChevronLeft size={15} /></Link> : null}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
