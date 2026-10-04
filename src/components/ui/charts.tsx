"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/*
 * Chart rules (validated against the brand palette):
 * - The muted earth palette does not separate categorically (ΔE < 15), so every
 *   chart in the product is SINGLE-SERIES. Comparisons use small multiples or
 *   labelled horizontal bars, never colour-coded stacks.
 * - Fill = sage-500 (#7D8F71) or slate-600; contrast relief comes from hover
 *   tooltips, selective direct labels and a screen-reader data table.
 * - Thin marks, 4px rounded data ends anchored to the baseline, recessive grid.
 */

export type Datum = { label: string; value: number | null; hint?: string };

const FILL = { sage: "#7D8F71", slate: "#44556B", clay: "#B47552" } as const;

export function BarChart({
  data,
  max,
  height = 180,
  tone = "sage",
  unit = "",
  title,
  highlightLast,
  className,
}: {
  data: Datum[];
  max?: number;
  height?: number;
  tone?: keyof typeof FILL;
  unit?: string;
  title: string;
  highlightLast?: boolean;
  className?: string;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value ?? 0));
  const [active, setActive] = useState<number | null>(null);
  return (
    <figure className={cn("w-full", className)}>
      <div className="relative" style={{ height }}>
        {/* recessive grid */}
        {[0, 0.5, 1].map((g) => (
          <div key={g} className="absolute inset-x-0 border-t border-dashed border-line-soft" style={{ bottom: `${g * 100}%` }} aria-hidden="true" />
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] sm:gap-1.5" aria-hidden="true">
          {data.map((d, i) => {
            const v = d.value ?? 0;
            const h = top > 0 ? (v / top) * 100 : 0;
            const isActive = active === i;
            const emphasise = highlightLast && i === data.length - 1;
            return (
              <div
                key={i}
                className="relative flex h-full flex-1 items-end justify-center"
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
              >
                {d.value === null ? (
                  <div className="h-1 w-full max-w-9 rounded-full bg-sand-200" />
                ) : (
                  <div
                    className="w-full max-w-9 rounded-t-[4px] transition-[opacity,height] duration-500"
                    style={{
                      height: `${Math.max(h, v > 0 ? 2 : 0.8)}%`,
                      background: FILL[tone],
                      opacity: active === null ? (highlightLast && !emphasise ? 0.55 : 1) : isActive ? 1 : 0.45,
                    }}
                  />
                )}
                {isActive && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-xs shadow-[var(--shadow-md)]">
                    <div className="text-text-2">{d.label}</div>
                    <div className="font-semibold text-ink tabular">
                      {d.value === null ? "—" : `${d.value}${unit}`}
                    </div>
                    {d.hint && <div className="text-text-2">{d.hint}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-[2px] sm:gap-1.5" aria-hidden="true">
        {data.map((d, i) => (
          <div key={i} className={cn("flex-1 truncate text-center text-[0.6875rem] text-text-2", data.length > 14 && i % 2 === 1 && "invisible")}>
            {d.label}
          </div>
        ))}
      </div>
      <SrTable title={title} data={data} unit={unit} />
    </figure>
  );
}

export function LineChart({
  data,
  min = 0,
  max,
  height = 180,
  unit = "",
  title,
  tone = "slate",
  area = true,
  className,
}: {
  data: Datum[];
  min?: number;
  max?: number;
  height?: number;
  unit?: string;
  title: string;
  tone?: keyof typeof FILL;
  area?: boolean;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const pad = 8;
  const top = max ?? Math.max(1, ...data.map((d) => d.value ?? 0));
  const n = data.length;
  // RTL: time flows right → left, so first datum sits on the right.
  const x = (i: number) => (n <= 1 ? W / 2 : W - pad - (i * (W - pad * 2)) / (n - 1));
  const y = (v: number) => H - pad - ((v - min) / (top - min || 1)) * (H - pad * 2);
  const pts = data.map((d, i) => (d.value === null ? null : ([x(i), y(d.value)] as const)));
  const segs: string[] = [];
  let cur = "";
  pts.forEach((p) => {
    if (!p) {
      if (cur) segs.push(cur);
      cur = "";
      return;
    }
    cur += `${cur ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)} `;
  });
  if (cur) segs.push(cur);
  const valid = pts.filter(Boolean) as (readonly [number, number])[];
  const areaPath =
    area && valid.length > 1
      ? `M${valid[0][0]},${H - pad} ` + valid.map((p) => `L${p[0]},${p[1]}`).join(" ") + ` L${valid[valid.length - 1][0]},${H - pad} Z`
      : "";
  const color = FILL[tone];

  function onMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || n === 0) return;
    const r = el.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width; // 0..1 left→right
    const idx = Math.round((1 - rel) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, idx)));
  }

  const a = active !== null ? data[active] : null;
  const ap = active !== null ? pts[active] : null;

  return (
    <figure className={cn("w-full", className)}>
      <div ref={ref} className="relative" style={{ height }} onPointerMove={onMove} onPointerLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((g) => (
            <line key={g} x1={0} x2={W} y1={pad + g * (H - pad * 2)} y2={pad + g * (H - pad * 2)} stroke="#EAE3DA" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          {areaPath && <path d={areaPath} fill={`url(#g${id})`} />}
          {segs.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ))}
          {ap && <line x1={ap[0]} x2={ap[0]} y1={pad} y2={H - pad} stroke="#A4A8AD" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />}
        </svg>
        {/* markers in HTML so they stay round regardless of aspect ratio */}
        {pts.map((p, i) =>
          p ? (
            <span
              key={i}
              className="absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-surface"
              style={{ left: `${(p[0] / W) * 100}%`, bottom: `${((H - p[1]) / H) * 100}%`, background: color, transform: `translate(-50%, 50%) scale(${active === i ? 1.4 : 1})` }}
              aria-hidden="true"
            />
          ) : null,
        )}
        {a && ap && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-xs shadow-[var(--shadow-md)]"
            style={{ left: `${(ap[0] / W) * 100}%`, bottom: `calc(${((H - ap[1]) / H) * 100}% + 14px)` }}
          >
            <div className="text-text-2">{a.label}</div>
            <div className="font-semibold text-ink tabular">{a.value === null ? "—" : `${a.value}${unit}`}</div>
            {a.hint && <div className="text-text-2">{a.hint}</div>}
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[0.6875rem] text-text-2" aria-hidden="true">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <SrTable title={title} data={data} unit={unit} />
    </figure>
  );
}

/** Labelled horizontal bars — used for comparisons instead of multi-colour stacks. */
export function HBarList({ data, unit = "", title, tone = "slate", max }: { data: Datum[]; unit?: string; title: string; tone?: keyof typeof FILL; max?: number }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value ?? 0));
  return (
    <figure className="w-full">
      <ul className="space-y-3" aria-hidden="true">
        {data.map((d, i) => (
          <li key={i} className="group">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-text">{d.label}</span>
              <span className="shrink-0 font-semibold text-ink tabular">
                {d.value ?? "—"}
                {unit}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sand-100">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${((d.value ?? 0) / top) * 100}%`, background: FILL[tone] }} />
            </div>
            {d.hint && <div className="mt-1 text-xs text-text-2">{d.hint}</div>}
          </li>
        ))}
      </ul>
      <SrTable title={title} data={data} unit={unit} />
    </figure>
  );
}

export function Sparkline({ values, tone = "sage", width = 96, height = 28 }: { values: number[]; tone?: keyof typeof FILL; width?: number; height?: number }) {
  if (values.length < 2) return <span className="inline-block h-px w-24 bg-line" aria-hidden="true" />;
  const mx = Math.max(...values, 1);
  const mn = Math.min(...values, 0);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - mn) / (mx - mn || 1)) * (height - 4)}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="-scale-x-100" aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" stroke={FILL[tone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SrTable({ title, data, unit }: { title: string; data: Datum[]; unit: string }) {
  return (
    <>
      <figcaption className="sr-only">{title}</figcaption>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.label}</th>
              <td>{d.value === null ? "لا توجد بيانات" : `${d.value}${unit}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
