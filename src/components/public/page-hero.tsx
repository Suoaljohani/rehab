import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, description, children }: { eyebrow?: string; title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <section className="surface-travertine border-b border-line/60">
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-8 sm:pt-20">
        {eyebrow && <div className="text-sm font-medium text-sage-700">{eyebrow}</div>}
        <h1 className="mt-2 max-w-3xl font-display text-[2.4rem] font-semibold leading-tight text-ink sm:text-[3rem]">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-text-2">{description}</p>}
        {children}
      </div>
    </section>
  );
}
