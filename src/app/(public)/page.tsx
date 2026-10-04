import Link from "next/link";
import { ArrowLeft, CalendarCheck2, ClipboardList, HeartHandshake, LineChart, MessageCircleHeart, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { HeroVisual } from "@/components/public/hero-visual";
import { ServiceIcon } from "@/components/public/service-icon";
import { getCms, getFaqs, getServices } from "@/lib/public-data";

export default async function HomePage() {
  const [cms, services, faqs] = await Promise.all([getCms(), getServices(), getFaqs()]);
  const hero = cms.home_hero ?? {};
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="surface-travertine relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 linen-lines opacity-50" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-20">
          <div className="animate-[rise_0.7s_var(--ease-calm)_both]">
            <span className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-surface/70 px-3.5 py-1.5 text-[0.8125rem] font-medium text-sage-700">
              <span className="size-1.5 rounded-full bg-sage-500" /> {hero.eyebrow ?? "قسم التأهيل الطبي"}
            </span>
            <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.18] text-ink sm:text-[3.6rem]">
              {hero.title ?? "رعايتك التأهيلية لا تتوقف بانتهاء الجلسة."}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-2">{hero.subtitle}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/start" size="lg" iconEnd={<ArrowLeft size={18} />}>{hero.primary_cta ?? "ابدأ رحلتك"}</ButtonLink>
              <ButtonLink href="/login" size="lg" variant="secondary">{hero.secondary_cta ?? "تسجيل الدخول"}</ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line/70 pt-6">
              {[["فيديو", "تمارين موجّهة"], ["يومي", "برنامج واضح"], ["آمن", "تواصل داخل المنصة"]].map(([a, b]) => (
                <div key={a}><dt className="font-display text-2xl font-semibold text-ink">{a}</dt><dd className="mt-1 text-sm text-text-2">{b}</dd></div>
              ))}
            </dl>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* ---------- Services ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8" aria-labelledby="services-title">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-sm font-medium text-sage-700">خدمات التأهيل</div>
            <h2 id="services-title" className="mt-2 font-display text-[2.25rem] font-semibold leading-tight text-ink">رعاية متخصصة لكل مرحلة من رحلة التعافي</h2>
          </div>
          <ButtonLink href="/services" variant="ghost" iconEnd={<ArrowLeft size={16} />}>كل الخدمات</ButtonLink>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {services.map((s, i) => (
            <Link key={s.id} href={`/services/${s.slug}`}
              className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-[28px] border border-line/80 bg-surface p-7 shadow-[var(--shadow-sm)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
              <div className={`absolute -end-16 -top-16 size-48 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100 ${["bg-sage-100", "bg-sand-200", "bg-slate-100"][i % 3]} opacity-60`} aria-hidden="true" />
              <span className="relative grid size-14 place-items-center rounded-[18px] bg-page text-slate-600 ring-1 ring-line"><ServiceIcon name={s.icon} size={24} /></span>
              <h3 className="relative mt-8 font-display text-2xl font-semibold text-ink">{s.name}</h3>
              <p className="relative mt-3 flex-1 leading-relaxed text-text-2">{s.summary}</p>
              <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600">تعرّف على الخدمة <ArrowLeft size={16} className="transition group-hover:-translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="surface-plaster scroll-mt-20 border-y border-line/60" aria-labelledby="how-title">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-sm font-medium text-sage-700">كيف تعمل المنصة</div>
            <h2 id="how-title" className="mt-2 font-display text-[2.25rem] font-semibold leading-tight text-ink">رحلة واحدة متصلة — من العيادة إلى منزلك</h2>
            <p className="mt-4 text-text-2">كل جلسة حضورية تتحول إلى خطة منزلية واضحة، وكل تمرين تنفذه يصل إلى فريقك ليتابع تقدمك ويعدّل خطتك.</p>
          </div>
          <ol className="relative mt-16 grid gap-6 md:grid-cols-4">
            <div className="absolute inset-x-[12%] top-8 hidden h-px bg-gradient-to-l from-transparent via-sage-300 to-transparent md:block" aria-hidden="true" />
            {[
              [ClipboardList, "جلسة حضورية", "يقيّم أخصائيك حالتك ويحدد أهدافك التأهيلية."],
              [PlayCircle, "برنامج منزلي", "تمارين بالفيديو مع التكرارات والأيام المحددة لك."],
              [LineChart, "تنفيذ ومتابعة", "تسجّل ما أنجزته، ويرى فريقك التزامك وملاحظاتك."],
              [HeartHandshake, "تعديل وتقدم", "يُحدَّث برنامجك حسب تقدمك حتى تحقق هدفك."],
            ].map(([Icon, t, d], i) => {
              const I = Icon as typeof ClipboardList;
              return (
                <li key={t as string} className="relative text-center">
                  <span className="relative mx-auto grid size-16 place-items-center rounded-full border border-sage-200 bg-surface text-sage-700 shadow-[var(--shadow-sm)]"><I size={24} /></span>
                  <div className="mt-5 text-xs font-medium text-text-3">الخطوة {i + 1}</div>
                  <h3 className="mt-1 text-lg font-semibold text-ink">{t as string}</h3>
                  <p className="mx-auto mt-2 max-w-[15rem] text-sm leading-relaxed text-text-2">{d as string}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ---------- Value pillars ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="surface-ink relative overflow-hidden rounded-[32px] p-10 text-ivory">
            <div className="text-sm text-sage-300">للمراجع</div>
            <h2 className="mt-3 font-display text-[2rem] font-semibold leading-snug">افتح المنصة… واعرف ما عليك فعله اليوم.</h2>
            <p className="mt-4 leading-relaxed text-ivory/70">لا قوائم معقدة ولا ملفات متفرقة. شاشة «اليوم» تخبرك بعدد التمارين، والمدة المتوقعة، وموعدك القادم، وأي رسالة جديدة من فريقك.</p>
            <ButtonLink href="/login/patient" variant="ink-light" className="mt-8">دخول المراجع</ButtonLink>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              [Sparkles, "تمارين بالفيديو", "شاهد طريقة الأداء الصحيحة لكل تمرين، مع التعليمات والتحذيرات."],
              [MessageCircleHeart, "تواصل منظم", "اسأل فريقك عن تمرين محدد داخل المنصة بدل الأرقام الشخصية."],
              [CalendarCheck2, "مواعيد واضحة", "تابع جلساتك القادمة واطلب التغيير عند الحاجة."],
              [ShieldCheck, "خصوصية أولًا", "بياناتك الصحية لا يطلع عليها إلا فريق رعايتك المصرح له."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Sparkles;
              return (
                <div key={t as string} className="rounded-[24px] border border-line/80 bg-surface p-6 shadow-[var(--shadow-sm)]">
                  <span className="grid size-11 place-items-center rounded-[14px] bg-sand-100 text-clay-600"><I size={20} /></span>
                  <h3 className="mt-5 font-semibold text-ink">{t as string}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-2">{d as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="border-t border-line/60 bg-surface/50">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <div className="text-sm font-medium text-sage-700">الأسئلة الشائعة</div>
            <h2 className="mt-2 font-display text-[2.25rem] font-semibold leading-tight text-ink">إجابات واضحة قبل أن تبدأ</h2>
            <ButtonLink href="/faq" variant="secondary" className="mt-8">كل الأسئلة</ButtonLink>
          </div>
          <div className="divide-y divide-line rounded-[24px] border border-line bg-surface">
            {faqs.slice(0, 5).map((f) => (
              <details key={f.id} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                  {f.question}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sand-100 text-text-2 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-text-2">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
        <div className="surface-sage relative overflow-hidden rounded-[36px] border border-sage-200 px-8 py-16 text-center sm:px-16">
          <h2 className="mx-auto max-w-2xl font-display text-[2.25rem] font-semibold leading-tight text-ink">جاهز لتبدأ رحلتك التأهيلية؟</h2>
          <p className="mx-auto mt-4 max-w-xl text-sage-800">أجب عن سؤال واحد وسنوجّهك إلى الخطوة المناسبة — طلب موعد، متابعة إحالة، أو معرفة الخدمة الأنسب.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/start" size="lg">ابدأ رحلتك</ButtonLink>
            <ButtonLink href="/track" size="lg" variant="secondary">متابعة طلب سابق</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
