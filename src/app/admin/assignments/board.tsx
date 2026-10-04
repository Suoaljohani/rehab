"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Search, UserX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Field, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { assignCare, endCare } from "@/lib/actions/admin";
import { fRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

export type BoardCard = { episodeId: string; memberId: string | null; patient: string; title: string; specialty: string; specialtyName: string; providerId: string | null; since: string; status: string };
export type BoardCol = { id: string; name: string; title: string | null; specialty: string | null; capacity: number; active: number };

export function AssignmentBoard({ cards: initial, cols, specialties }: { cards: BoardCard[]; cols: BoardCol[]; specialties: { code: string; name: string }[] }) {
  const [cards, setCards] = useState(initial);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [move, setMove] = useState<{ card: BoardCard; to: string | null } | null>(null);
  const [reason, setReason] = useState("");
  const [spec, setSpec] = useState("");
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const visible = useMemo(() => cards.filter((c) => (!spec || c.specialty === spec) && (!q || c.patient.includes(q))), [cards, spec, q]);
  const columns = [{ id: "__none", name: "غير موزّع", title: null, specialty: null, capacity: 0, active: 0 } as BoardCol, ...cols.filter((c) => !spec || c.specialty === spec)];

  function requestMove(card: BoardCard, to: string | null) {
    if ((card.providerId ?? null) === to) return;
    setReason("");
    setMove({ card, to });
  }
  function confirm() {
    if (!move) return;
    const { card, to } = move;
    start(async () => {
      const r = to ? await assignCare(card.episodeId, to, "primary", reason) : await endCare(card.memberId!, reason);
      if (!r.ok) return toast({ tone: "danger", title: "تعذّر التوزيع", body: r.error });
      setCards((cs) => cs.map((c) => (c.episodeId === card.episodeId ? { ...c, providerId: to, memberId: to ? (r.data as string) : null } : c)));
      toast({ tone: "success", title: to ? "تم التعيين" : "أُعيدت الحالة لغير الموزّعين", body: "تحدّثت الصلاحيات فورًا وسُجّل الإجراء." });
      setMove(null);
      router.refresh();
    });
  }
  const needsReason = move && (move.card.providerId !== null);
  const toCol = move ? cols.find((c) => c.id === move.to) : null;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative w-64 max-w-full"><Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-3" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث باسم المراجع" aria-label="بحث" className="h-10 w-full rounded-[12px] border border-line bg-surface ps-9 pe-3 text-sm outline-none focus:border-slate-300" /></div>
        <select value={spec} onChange={(e) => setSpec(e.target.value)} aria-label="التخصص" className="h-10 rounded-[12px] border border-line bg-surface px-3 text-sm"><option value="">كل التخصصات</option>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
        <span className="text-xs text-text-2">اسحب البطاقة إلى عمود مقدم الرعاية، أو استخدم قائمة «نقل إلى» في البطاقة.</span>
      </div>
      <div className="scrollbar-calm relative -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        {columns.map((col) => {
          const colCards = visible.filter((c) => (col.id === "__none" ? c.providerId === null : c.providerId === col.id));
          const load = col.id === "__none" ? 0 : cards.filter((c) => c.providerId === col.id).length;
          const pct = col.capacity ? Math.min(100, (load / col.capacity) * 100) : 0;
          return (
            <section key={col.id} aria-label={col.name}
              onDragOver={(e) => { e.preventDefault(); setOver(col.id); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); const c = cards.find((x) => x.episodeId === drag); if (c) requestMove(c, col.id === "__none" ? null : col.id); }}
              className={cn("flex w-[290px] shrink-0 flex-col rounded-[22px] border p-3 transition", col.id === "__none" ? "border-clay-200 bg-clay-50/60" : "border-line/80 bg-surface-soft/60", over === col.id && "border-slate-400 bg-slate-50 shadow-[0_0_0_3px_var(--color-slate-100)]")}>
              <header className="mb-3 px-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">{col.id === "__none" ? <UserX size={18} className="text-clay-600" /> : <Avatar name={col.name} size="sm" />}<div><div className="text-sm font-semibold text-ink">{col.name}</div>{col.title && <div className="text-[0.6875rem] text-text-2">{col.title}</div>}</div></div>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-line tabular">{col.id === "__none" ? colCards.length : `${load}/${col.capacity}`}</span>
                </div>
                {col.id !== "__none" && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-200"><div className={cn("h-full rounded-full", pct >= 100 ? "bg-clay-400" : pct >= 80 ? "bg-warning" : "bg-sage-500")} style={{ width: `${pct}%` }} /></div>}
              </header>
              <ul className="flex-1 space-y-2">
                {colCards.map((c) => (
                  <li key={c.episodeId} draggable onDragStart={() => setDrag(c.episodeId)} onDragEnd={() => setDrag(null)}
                    className={cn("group cursor-grab rounded-[16px] border border-line/80 bg-surface p-3 shadow-[var(--shadow-xs)] transition active:cursor-grabbing", drag === c.episodeId && "opacity-40")}>
                    <div className="flex items-start gap-2">
                      <GripVertical size={16} className="mt-0.5 shrink-0 text-text-3" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{c.patient}</div>
                        <div className="truncate text-xs text-text-2">{c.title}</div>
                        <div className="mt-1 text-[0.6875rem] text-text-3">{c.specialtyName} · {fRelative(c.since)}{c.status === "on_hold" ? " · معلّقة" : ""}</div>
                      </div>
                    </div>
                    <label className="sr-only" htmlFor={`mv-${c.episodeId}`}>نقل {c.patient} إلى</label>
                    <select id={`mv-${c.episodeId}`} value="" onChange={(e) => requestMove(c, e.target.value === "__none" ? null : e.target.value)} className="mt-2 h-8 w-full rounded-[10px] border border-line bg-page/40 px-2 text-xs text-text-2 opacity-70 focus:opacity-100 group-hover:opacity-100">
                      <option value="" disabled>نقل إلى…</option>
                      {c.providerId && <option value="__none">غير موزّع</option>}
                      {cols.filter((x) => x.id !== c.providerId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </li>
                ))}
                {colCards.length === 0 && <li className="rounded-[14px] border-2 border-dashed border-line py-8 text-center text-xs text-text-3">أفلت البطاقة هنا</li>}
              </ul>
            </section>
          );
        })}
      </div>
      <Dialog open={!!move} onClose={() => setMove(null)} title={move?.to ? `تعيين ${move.card.patient} إلى ${toCol?.name}` : `إلغاء تعيين ${move?.card.patient}`}
        description="يُسجَّل الإجراء: من نفّذ، ومتى، ومن، وإلى، والسبب."
        footer={<><Button variant="ghost" onClick={() => setMove(null)}>إلغاء</Button><Button loading={pending} disabled={!!needsReason && !reason.trim()} onClick={confirm}>تأكيد</Button></>}>
        <div className="space-y-4">
          {toCol && toCol.active >= toCol.capacity && <Notice tone="warning">وصل {toCol.name} إلى سعته ({toCol.capacity}). يمكنك المتابعة إن لزم.</Notice>}
          <Field label={needsReason ? "سبب النقل (إلزامي)" : "ملاحظة (اختياري)"} htmlFor="mr"><Textarea id="mr" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </div>
      </Dialog>
    </>
  );
}

