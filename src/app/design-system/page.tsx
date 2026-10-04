import type { Metadata } from "next";
import { Activity, CalendarDays, Dumbbell, HeartPulse, Inbox, LayoutGrid, MessageCircle, Play, Search, Sparkles, Users } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, Input, Select, Textarea, Checkbox, ChoiceCard } from "@/components/ui/field";
import { ProgressBar, ProgressRing, StepDots } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui/states";
import { Notice, EmergencyNotice } from "@/components/ui/notice";
import { Table, TableShell, THead, Th, Tr, Td } from "@/components/ui/table";
import { LinkTabs } from "@/components/ui/tabs";
import { Stat } from "@/components/ui/stat";
import { HBarList, Sparkline } from "@/components/ui/charts";
import { ExerciseArt } from "@/components/exercise/exercise-art";
import { EPISODE_STATUS, PROGRAM_STATUS, EXERCISE_STATUS, APPOINTMENT_STATUS } from "@/lib/status";
import { ChartDemos, OverlayDemos } from "./demos";

export const metadata: Metadata = { title: "نظام التصميم" };

const core = [
  { name: "Deep Slate Blue", ar: "أزرق الأردواز العميق", hex: "#44556B", role: "اللون الرئيسي — الأزرار الأساسية، التنقل، التسلسل البصري", fg: "#F7F3EE" },
  { name: "Midnight Ink", ar: "حبر منتصف الليل", hex: "#29323D", role: "أعمق درجة — الترويسات، مناطق التنقل الفاخرة، النص القوي", fg: "#F7F3EE" },
  { name: "Soft Sage", ar: "المريمية الهادئة", hex: "#97A88B", role: "التعافي، التوازن، التقدم، الحركة", fg: "#29323D" },
  { name: "Clay Beige", ar: "الطين الدافئ", hex: "#C98D6B", role: "لمسة إنسانية دافئة — تُستخدم باعتدال", fg: "#29323D" },
  { name: "Sand Mist", ar: "ضباب الرمل", hex: "#E6D5C7", role: "خلفيات ثانوية، بطاقات هادئة، فواصل", fg: "#29323D" },
  { name: "Warm Ivory", ar: "العاجي الدافئ", hex: "#F7F3EE", role: "خلفية الصفحة الأساسية", fg: "#29323D" },
];

const neutrals = [
  ["Page Background", "#F7F3EE"],
  ["Surface / Cards", "#FFFFFF"],
  ["Soft Surface", "#F1EAE2"],
  ["Borders", "#DED6CC"],
  ["Primary Text", "#2F3540"],
  ["Secondary Text", "#6F7680"],
  ["Muted Text", "#A4A8AD"],
];

const semantic = [
  ["Success", "نجاح", "#5E8B6F", "#E9F1EB", "#3F6B50"],
  ["Warning", "تنبيه", "#D39A44", "#FBF1E1", "#8A5E1E"],
  ["Danger", "خطر", "#C85C5C", "#F8E7E5", "#9B3B3B"],
  ["Information", "معلومة", "#6C8AA8", "#EAF0F5", "#46617D"],
  ["Disabled", "غير نشط", "#CFC8C0", "#F4F1ED", "#A4A8AD"],
];

const scales: [string, string[]][] = [
  ["Slate", ["#F1F3F6", "#E3E7EC", "#C9D0D9", "#A3AEBC", "#7A889A", "#5A6A80", "#44556B", "#374659", "#2F3B4B", "#29323D"]],
  ["Sage", ["#F3F5F0", "#E6EBE1", "#D0DAC7", "#B4C2A8", "#97A88B", "#7D8F71", "#66785B", "#526149", "#414D3B"]],
  ["Clay", ["#FBF4EF", "#F5E6DC", "#EBCDB9", "#DDAE91", "#C98D6B", "#B47552", "#9A5F40", "#7C4C34"]],
  ["Sand", ["#FAF6F2", "#F1EAE2", "#E6D5C7", "#D6BFAC", "#C2A58E"]],
];

function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line/70 py-16 first:border-0">
      <div className="mb-8 max-w-2xl">
        <div className="mb-2 text-[0.8125rem] font-medium text-sage-700">{eyebrow}</div>
        <h2 className="font-display text-[2rem] font-semibold leading-tight text-ink">{title}</h2>
        {intro && <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-2">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

const nav = [
  ["palette", "الألوان"],
  ["distribution", "التوزيع"],
  ["material", "الخامة"],
  ["type", "الطباعة"],
  ["buttons", "الأزرار"],
  ["forms", "النماذج"],
  ["status", "الحالات"],
  ["cards", "البطاقات"],
  ["data", "البيانات"],
  ["navigation", "التنقل"],
  ["feedback", "التغذية الراجعة"],
  ["patterns", "أنماط المراجع"],
  ["principles", "المبادئ"],
];

export default function DesignSystemPage() {
  return (
    <div className="min-h-dvh">
      {/* Hero */}
      <header className="surface-ink relative overflow-hidden text-ivory">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-8">
          <div className="flex items-center justify-between">
            <Logo tone="light" />
            <Badge tone="sage" className="!border-white/10 !bg-white/10 !text-ivory">Design System · v1.0</Badge>
          </div>
          <div className="mt-20 max-w-3xl">
            <div className="mb-4 text-sm text-sage-300">الهوية البصرية ونظام الألوان</div>
            <h1 className="font-display text-[2.75rem] font-semibold leading-[1.15] text-ivory sm:text-[3.75rem]">
              هدوءٌ يُشبه الشفاء،
              <br />
              ودقّةٌ تُشبه العيادة.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ivory/75">
              نظام تصميم مستوحى من الحجر الجيري، الترافرتين، الجص الناعم، الكتان الطبيعي، أوراق المريمية، وخشب البلوط الفاتح تحت ضوء شمس دافئ غير مباشر.
            </p>
          </div>
          <div className="mt-14 flex flex-wrap gap-2">
            {["الشفاء", "الحركة", "الثقة", "الدفء الإنساني", "الهدوء", "التعافي", "الاحترافية", "رعاية فاخرة"].map((w) => (
              <span key={w} className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-ivory/80">{w}</span>
            ))}
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-b border-line/70 bg-page/90 backdrop-blur">
        <nav className="scrollbar-calm mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2.5 sm:px-8" aria-label="أقسام نظام التصميم">
          {nav.map(([id, l]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-3.5 py-1.5 text-sm text-text-2 transition hover:bg-surface hover:text-ink">{l}</a>
          ))}
        </nav>
      </div>

      <main id="main" className="mx-auto max-w-7xl px-4 sm:px-8">
        <Section id="palette" eyebrow="01 — Core palette" title="لوحة الألوان الأساسية" intro="ستة ألوان تُشكّل الهوية. الأردواز والحبر يمنحان الثقة والوضوح المهني، المريمية تحمل معنى التعافي، والطين والرمل يضيفان الدفء الإنساني.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {core.map((c) => (
              <div key={c.hex} className="overflow-hidden rounded-[var(--radius-2xl)] border border-line/70 bg-surface shadow-[var(--shadow-sm)]">
                <div className="flex h-40 flex-col justify-between p-5" style={{ background: c.hex, color: c.fg }}>
                  <span className="text-xs opacity-75" dir="ltr">{c.name}</span>
                  <span className="font-display text-2xl font-semibold">{c.ar}</span>
                </div>
                <div className="flex items-start justify-between gap-3 p-5">
                  <p className="text-sm leading-relaxed text-text-2">{c.role}</p>
                  <code className="shrink-0 rounded-md bg-sand-50 px-2 py-1 text-xs text-ink" dir="ltr">{c.hex}</code>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 font-semibold text-ink">محايدات الواجهة</h3>
              <div className="overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface">
                {neutrals.map(([n, h]) => (
                  <div key={n} className="flex items-center gap-4 border-b border-line-soft px-4 py-3 last:border-0">
                    <span className="size-9 shrink-0 rounded-[10px] border border-line" style={{ background: h }} />
                    <span className="flex-1 text-sm text-text" dir="ltr">{n}</span>
                    <code className="text-xs text-text-2" dir="ltr">{h}</code>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-ink">الألوان الدلالية</h3>
              <div className="space-y-3">
                {semantic.map(([n, ar, base, bg, fg]) => (
                  <div key={n} className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-3">
                    <span className="size-9 shrink-0 rounded-[10px]" style={{ background: base }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-ink">{ar} <span className="text-text-2" dir="ltr">· {n}</span></div>
                      <code className="text-xs text-text-2" dir="ltr">{base}</code>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: bg, color: fg }}>نص على خلفية</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-text-2">لكل لون دلالي رفيق داكن للنص على خلفيته الفاتحة لضمان تباين ≥ 4.5:1، ولا تُستخدم الألوان وحدها لنقل المعنى؛ تُرفق دائمًا بأيقونة أو نص.</p>
            </div>
          </div>

          <div className="mt-12">
            <h3 className="mb-1 font-semibold text-ink">السلالم اللونية المشتقة</h3>
            <p className="mb-5 text-sm text-text-2">درجات مشتقة من الألوان الأساسية للحالات التفاعلية والنص الملوّن الذي يحقق معايير التباين.</p>
            <div className="space-y-3">
              {scales.map(([name, steps]) => (
                <div key={name} className="flex items-center gap-4">
                  <span className="w-14 shrink-0 text-sm text-text-2" dir="ltr">{name}</span>
                  <div className="flex flex-1 overflow-hidden rounded-[12px] border border-line/70">
                    {steps.map((s) => (
                      <div key={s} className="group relative h-12 flex-1" style={{ background: s }} title={s}>
                        <span className="absolute inset-x-0 bottom-1 hidden text-center text-[0.625rem] opacity-80 sm:group-hover:block" dir="ltr" style={{ color: parseInt(s.slice(1, 3), 16) > 160 ? "#29323D" : "#F7F3EE" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="distribution" eyebrow="02 — Color distribution" title="توزيع الألوان في الواجهة" intro="الفخامة تأتي من الاعتدال. المساحات الهادئة تسود، والألوان القوية تظهر حيث يجب أن تقود الانتباه فقط.">
          <div className="flex h-24 overflow-hidden rounded-[var(--radius-xl)] border border-line shadow-[var(--shadow-sm)]">
            <div className="flex flex-col justify-end p-4" style={{ width: "34%", background: "#F7F3EE" }}><b className="text-ink">٣٤٪</b><span className="text-xs text-text-2">Warm Ivory</span></div>
            <div className="flex flex-col justify-end border-s border-line-soft p-4" style={{ width: "34%", background: "#FFFFFF" }}><b className="text-ink">٣٤٪</b><span className="text-xs text-text-2">White</span></div>
            <div className="flex flex-col justify-end p-4 text-ivory" style={{ width: "11%", background: "#44556B" }}><b>١١٪</b><span className="text-xs opacity-75">Slate</span></div>
            <div className="flex flex-col justify-end p-4 text-ivory" style={{ width: "7%", background: "#29323D" }}><b>٧٪</b><span className="text-xs opacity-75">Ink</span></div>
            <div className="flex flex-col justify-end p-3 text-ink" style={{ width: "9%", background: "#97A88B" }}><b>٩٪</b></div>
            <div className="flex-1" style={{ background: "#E6D5C7" }} />
            <div style={{ width: "2%", background: "#C98D6B" }} />
          </div>
          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
            <div><b className="text-ink">٦٥–٧٠٪</b><p className="text-text-2">العاجي والأبيض: المساحات والسطوح.</p></div>
            <div><b className="text-ink">١٥–٢٠٪</b><p className="text-text-2">الأردواز والحبر: الأفعال والهيكل والنص.</p></div>
            <div><b className="text-ink">٨–١٠٪</b><p className="text-text-2">المريمية: التقدم والتعافي والتحديد.</p></div>
            <div><b className="text-ink">الباقي</b><p className="text-text-2">الطين والرمل: لمسات داعمة محسوبة.</p></div>
          </div>
        </Section>

        <Section id="material" eyebrow="03 — Material" title="الخامة والسطوح" intro="سطوح ملموسة ومعمارية بدل الزجاج اللامع: ظلال دافئة خافتة، حبيبات ورق مطفأ، وتدرجات ضوء الشمس غير المباشر.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["surface-travertine", "ترافرتين", "الأقسام الرئيسية والبطاقات الترحيبية"],
              ["surface-plaster", "جص ناعم", "البطاقات الثانوية والمناطق الهادئة"],
              ["surface-sage", "أوراق المريمية", "التقدم والإنجاز والتعافي"],
              ["surface-ink text-ivory", "حبر عميق", "الترويسات الفاخرة ولحظات التركيز"],
            ].map(([c, t, d]) => (
              <div key={t} className={`${c} flex h-48 flex-col justify-end rounded-[var(--radius-2xl)] border border-line/50 p-5`}>
                <div className="font-display text-xl font-semibold">{t}</div>
                <div className="mt-1 text-xs opacity-75">{d}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[["xs", "var(--shadow-xs)"], ["sm", "var(--shadow-sm)"], ["md", "var(--shadow-md)"], ["lg", "var(--shadow-lg)"]].map(([n, s]) => (
              <div key={n} className="grid h-28 place-items-center rounded-[var(--radius-xl)] bg-surface text-sm text-text-2" style={{ boxShadow: s }}>shadow-{n}</div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-end gap-4">
            {[["sm", 8], ["md", 12], ["lg", 16], ["xl", 22], ["2xl", 28], ["3xl", 36]].map(([n, r]) => (
              <div key={n} className="text-center">
                <div className="size-20 border border-slate-200 bg-slate-50" style={{ borderRadius: Number(r) }} />
                <div className="mt-2 text-xs text-text-2" dir="ltr">{n} · {r}px</div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" eyebrow="04 — Typography" title="الطباعة" intro="خط «نوتو نسخ» للعناوين التحريرية يمنح طابعًا فاخرًا وإنسانيًا، و«آي بي إم بلكس سانس العربي» للواجهة والبيانات بوضوح عالٍ على كل الأحجام.">
          <div className="space-y-6 rounded-[var(--radius-2xl)] border border-line bg-surface p-6 sm:p-10">
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line-soft pb-6"><span className="font-display text-[3.5rem] font-semibold leading-tight text-ink">رحلة تعافٍ مستمرة</span><code className="text-xs text-text-2" dir="ltr">Display · Naskh 600 · 56</code></div>
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line-soft pb-6"><span className="font-display text-[2.5rem] font-semibold text-ink">برنامجك المنزلي اليوم</span><code className="text-xs text-text-2" dir="ltr">H1 · Naskh 600 · 40</code></div>
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line-soft pb-6"><span className="font-display text-[1.875rem] font-semibold text-ink">ملف المراجع</span><code className="text-xs text-text-2" dir="ltr">H2 · Naskh 600 · 30</code></div>
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line-soft pb-6"><span className="text-[1.375rem] font-semibold text-ink">تمرين رفع الساق المستقيمة</span><code className="text-xs text-text-2" dir="ltr">H3 · Plex 600 · 22</code></div>
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line-soft pb-6"><p className="max-w-xl text-base leading-[1.8] text-text">استلقِ على ظهرك مع ثني الركبة الأخرى. شدّ عضلة الفخذ وارفع الساق ببطء حتى مستوى الركبة المثنية، ثم أنزلها بهدوء.</p><code className="text-xs text-text-2" dir="ltr">Body · Plex 400 · 16 / 1.8</code></div>
            <div className="flex flex-wrap items-baseline justify-between gap-4"><span className="text-sm text-text-2">آخر تحديث قبل ٣ ساعات بواسطة أ. نورة العتيبي</span><code className="text-xs text-text-2" dir="ltr">Caption · Plex 400 · 14 · Secondary</code></div>
          </div>
        </Section>

        <Section id="buttons" eyebrow="05 — Actions" title="الأزرار" intro="الزر الأساسي بالأردواز العميق مع نص عاجي، ويتحول إلى الحبر عند التمرير. الزر الثانوي شفاف بحدود أردوازية.">
          <Card className="space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <Button>ابدأ تمارين اليوم</Button>
              <Button variant="secondary">معاينة كمراجع</Button>
              <Button variant="quiet">تصدير</Button>
              <Button variant="ghost">إلغاء</Button>
              <Button variant="sage">تم التمرين</Button>
              <Button variant="clay">واجهت مشكلة</Button>
              <Button variant="danger">إيقاف الحساب</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xl" icon={<Play size={20} />}>ابدأ الجلسة</Button>
              <Button size="lg">نشر للمراجع</Button>
              <Button size="md">حفظ</Button>
              <Button size="sm">تعديل</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button loading>جارٍ الحفظ</Button>
              <Button disabled>غير متاح</Button>
              <Button variant="secondary" disabled>غير متاح</Button>
            </div>
            <div className="surface-ink flex flex-wrap gap-3 rounded-[var(--radius-xl)] p-5">
              <Button variant="ink-light">على خلفية داكنة</Button>
              <Button variant="sage">متابعة الجلسة</Button>
            </div>
          </Card>
        </Section>

        <Section id="forms" eyebrow="06 — Inputs" title="النماذج والمدخلات" intro="حقول هادئة بحدود رفيعة، تركيز واضح بحلقة أردوازية ناعمة، ورسائل خطأ إنسانية.">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-5">
              <Field label="الاسم الكامل" required htmlFor="n"><Input id="n" placeholder="مثال: سارة محمد" /></Field>
              <Field label="رقم الجوال" htmlFor="p" hint="سنرسل رمز التحقق إلى هذا الرقم."><Input id="p" dir="ltr" placeholder="05X XXX XXXX" className="text-end" /></Field>
              <Field label="الخدمة المطلوبة" htmlFor="s"><Select id="s"><option>العلاج الطبيعي</option><option>العلاج الوظيفي</option><option>النطق والتخاطب</option></Select></Field>
              <Field label="رقم الهوية" htmlFor="e" error="رقم الهوية يجب أن يتكون من ١٠ أرقام."><Input id="e" aria-invalid defaultValue="10234" dir="ltr" className="text-end" /></Field>
              <Field label="ملاحظات"><Textarea placeholder="أي معلومات تساعد الفريق…" /></Field>
              <Checkbox label="لدي إحالة من طبيب" description="سنطلب منك إحضارها في الموعد الأول." defaultChecked />
              <Field label="بحث"><div className="relative"><Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-text-3" size={18} /><Input className="ps-10" placeholder="ابحث عن تمرين أو مراجع" /></div></Field>
            </Card>
            <Card className="space-y-3">
              <div className="mb-2 font-semibold text-ink">كيف يمكننا مساعدتك؟</div>
              <ChoiceCard name="demo" value="1" defaultChecked label="لدي إحالة للتأهيل" description="أحضر إحالتك وسنساعدك في تحديد الخدمة." icon={<Inbox size={20} />} />
              <ChoiceCard name="demo" value="2" label="أريد موعدًا جديدًا" description="قدّم طلبًا وسيتواصل معك القسم." icon={<CalendarDays size={20} />} />
              <ChoiceCard name="demo" value="3" label="أريد معرفة الخدمة المناسبة" icon={<Sparkles size={20} />} />
            </Card>
          </div>
        </Section>

        <Section id="status" eyebrow="07 — Status system" title="نظام الحالات الموحد" intro="كل حالة لها اسم واحد ولون واحد ونقطة دلالية في كل المنصة — من الرحلة التأهيلية إلى التمرين والموعد.">
          <div className="grid gap-4 md:grid-cols-2">
            {[["الرحلة التأهيلية", EPISODE_STATUS], ["البرنامج المنزلي", PROGRAM_STATUS], ["مكتبة التمارين", EXERCISE_STATUS], ["المواعيد", APPOINTMENT_STATUS]].map(([t, m]) => (
              <Card key={t as string}>
                <div className="mb-3 text-sm font-medium text-ink">{t as string}</div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(m as object).map((k) => (<StatusBadge key={k} map={m as typeof EPISODE_STATUS} value={k} />))}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section id="cards" eyebrow="08 — Surfaces" title="البطاقات" intro="بطاقات بيضاء فوق العاجي الدافئ بحدود خافتة جدًا، مع ظلال دافئة تظهر عند التفاعل فقط.">
          <div className="grid gap-5 md:grid-cols-3">
            <Card interactive>
              <CardHeader eyebrow="الرحلة الحالية" title="تأهيل الركبة بعد الرباط الصليبي" action={<StatusBadge map={EPISODE_STATUS} value="active" />} />
              <div className="flex items-center gap-3"><Avatar name="نورة العتيبي" /><div><div className="text-sm font-medium text-ink">أ. نورة العتيبي</div><div className="text-xs text-text-2">أخصائية علاج طبيعي</div></div></div>
              <div className="mt-5"><div className="mb-1.5 flex justify-between text-xs text-text-2"><span>الالتزام هذا الأسبوع</span><b className="text-ink tabular">87٪</b></div><ProgressBar value={87} /></div>
            </Card>
            <Card tone="sage">
              <div className="flex items-center gap-5">
                <ProgressRing value={3} max={4} size={96}><div><div className="font-display text-2xl font-semibold text-ink">٣/٤</div></div></ProgressRing>
                <div><div className="font-semibold text-ink">أكملت ٣ من ٤</div><p className="text-sm text-sage-800">تمرين واحد متبقٍ لإنهاء برنامج اليوم.</p></div>
              </div>
            </Card>
            <Card tone="ink">
              <div className="text-sm text-ivory/70">الأحد ٤ أكتوبر</div>
              <div className="mt-2 font-display text-2xl font-semibold">لديك ٤ تمارين اليوم</div>
              <div className="mt-1 text-sm text-ivory/70">المدة المتوقعة ١٨ دقيقة</div>
              <div className="mt-5"><StepDots total={4} current={0} tone="light" /></div>
            </Card>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="المراجعون النشطون" value="128" icon={<Users size={18} />} hint="+٦ هذا الأسبوع" />
            <Stat label="بحاجة إلى انتباه" value="7" tone="attention" icon={<HeartPulse size={18} />} hint="٣ بلاغات ألم" />
            <Stat label="متوسط الالتزام" value="82٪" tone="sage" icon={<Activity size={18} />} trend={<Sparkline values={[70, 74, 72, 78, 80, 82]} />} />
            <Stat label="مواعيد اليوم" value="24" tone="ink" icon={<CalendarDays size={18} />} hint="٤ طلبات جديدة" />
          </div>
        </Section>

        <Section id="data" eyebrow="09 — Data" title="الجداول والرسوم البيانية" intro="كثافة معلومات عالية بلا فوضى. الرسوم أحادية السلسلة دائمًا — ألوان العلامة الهادئة لا تفصل بين فئات متعددة بوضوح، لذا نستخدم الأشرطة المعنونة والمضاعفات الصغيرة.">
          <TableShell toolbar={<><div className="relative w-64 max-w-full"><Search className="absolute start-3 top-1/2 -translate-y-1/2 text-text-3" size={16} /><Input className="h-9 ps-9 text-sm" placeholder="بحث" /></div><LinkTabs variant="pill" items={[{ href: "#data", label: "الكل", active: true, count: 128 }, { href: "#data", label: "بحاجة لانتباه", count: 7 }]} /></>}>
            <Table>
              <THead><tr><Th>المراجع</Th><Th>الرحلة</Th><Th>مقدم الرعاية</Th><Th>الالتزام</Th><Th>الحالة</Th></tr></THead>
              <tbody>
                {[["محمد أحمد", "تأهيل الركبة", "نورة العتيبي", 92, "active"], ["سارة القحطاني", "آلام أسفل الظهر", "فيصل الحربي", 64, "active"], ["خالد الدوسري", "تأهيل الكتف", "نورة العتيبي", 18, "on_hold"]].map(([n, e, p, a, s]) => (
                  <Tr key={n as string}>
                    <Td><div className="flex items-center gap-3"><Avatar name={n as string} size="sm" /><span className="font-medium text-ink">{n}</span></div></Td>
                    <Td className="text-text-2">{e}</Td><Td>{p}</Td>
                    <Td><div className="flex w-32 items-center gap-2"><ProgressBar value={a as number} size="sm" /><span className="text-xs tabular">{a}٪</span></div></Td>
                    <Td><StatusBadge map={EPISODE_STATUS} value={s as string} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableShell>
          <Card className="mt-6"><ChartDemos /></Card>
          <Card className="mt-6"><div className="mb-4 text-sm font-medium text-ink">عبء الحالات لكل مقدم رعاية</div><HBarList title="عبء الحالات" data={[{ label: "نورة العتيبي", value: 18, hint: "السعة ٢٠" }, { label: "فيصل الحربي", value: 14, hint: "السعة ٢٠" }, { label: "هدى الشمري", value: 9, hint: "السعة ١٥" }]} /></Card>
        </Section>

        <Section id="navigation" eyebrow="10 — Navigation" title="التنقل" intro="المراجع: تنقل سفلي بالمهام. مقدم الرعاية والإدارة: شريط جانبي بحبر عميق، والعنصر المحدد بخلفية مريمية ناعمة — لا أزرق ساطع أبدًا.">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="surface-ink rounded-[var(--radius-2xl)] p-4 text-ivory">
              <div className="mb-6 px-2 pt-2"><Logo tone="light" /></div>
              {[[LayoutGrid, "مركز القيادة", true], [Users, "المراجعين"], [Dumbbell, "Exercise Studio"], [CalendarDays, "المواعيد"], [MessageCircle, "التواصل"]].map(([I, l, a]) => {
                const Icon = I as typeof Users;
                return (<div key={l as string} className={`mb-1 flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm ${a ? "bg-sage-400/20 text-ivory" : "text-ivory/65"}`}><Icon size={18} className={a ? "text-sage-300" : ""} />{l as string}</div>);
              })}
            </div>
            <div className="flex items-end justify-center rounded-[var(--radius-2xl)] border border-line bg-surface-soft p-6">
              <div className="w-full max-w-sm rounded-[24px] border border-line bg-surface/95 p-2 shadow-[var(--shadow-md)]">
                <div className="grid grid-cols-5">
                  {[[Sparkles, "اليوم", true], [CalendarDays, "خطتي"], [Activity, "تقدمي"], [MessageCircle, "الرسائل"], [Users, "حسابي"]].map(([I, l, a]) => {
                    const Icon = I as typeof Users;
                    return (<div key={l as string} className={`flex flex-col items-center gap-1 rounded-[16px] py-2 text-[0.6875rem] ${a ? "bg-sage-100 font-semibold text-ink" : "text-text-2"}`}><Icon size={20} className={a ? "text-sage-700" : ""} />{l as string}</div>);
                  })}
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="feedback" eyebrow="11 — Feedback" title="الحالات الفارغة والأخطاء والتحميل" intro="كل قائمة لها حالة فارغة إنسانية، وكل خطأ يشرح ما حدث وما يمكن فعله، دون لغة تقنية أو لوم.">
          <div className="grid gap-5 md:grid-cols-2">
            <Card><EmptyState title="لا توجد تمارين منزلية اليوم" description="استمتع بيوم الراحة. موعدك القادم يوم الخميس الساعة ١٠:٣٠ صباحًا." action={<Button variant="secondary" size="sm">عرض خطتي</Button>} /></Card>
            <Card><ErrorState kind="video" title="الفيديو غير متاح حاليًا" description="يمكنك متابعة التمرين من خلال التعليمات المكتوبة، أو المحاولة لاحقًا." action={<Button variant="secondary" size="sm">إعادة المحاولة</Button>} /></Card>
            <Card><ErrorState kind="denied" title="لا تملك صلاحية الوصول" description="هذا الملف غير مرتبط بفريق رعايتك. إذا كنت تعتقد أن هذا خطأ تواصل مع مشرف القسم." /></Card>
            <SkeletonCard lines={4} />
          </div>
          <div className="mt-6 space-y-3">
            <Notice tone="sage" title="تم تسجيل ملاحظتك">سيطّلع عليها فريق الرعاية في أقرب وقت.</Notice>
            <Notice tone="warning" title="البرنامج سينتهي خلال ٣ أيام">راجع الخطة وقرر التمديد أو الإنهاء.</Notice>
            <Notice tone="internal" title="ملاحظة داخلية — غير مرئية للمراجع">يُفضّل تقليل الحمل في الأسبوع القادم.</Notice>
            <EmergencyNotice />
          </div>
          <div className="mt-6"><OverlayDemos /></div>
        </Section>

        <Section id="patterns" eyebrow="12 — Patient patterns" title="أنماط تجربة المراجع" intro="شاشة «اليوم» أولًا: الفعل قبل المعلومة، أزرار كبيرة، وأقل قدر من النص.">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[40px] border-[10px] border-ink bg-page shadow-[var(--shadow-lg)]">
              <div className="p-5">
                <div className="flex items-center justify-between"><div><div className="text-xs text-text-2">صباح الخير</div><div className="font-semibold text-ink">محمد</div></div><Avatar name="محمد أحمد" size="sm" /></div>
                <div className="surface-ink mt-5 rounded-[26px] p-5 text-ivory">
                  <div className="text-sm text-ivory/70">برنامج اليوم</div>
                  <div className="mt-1 font-display text-2xl font-semibold">لديك ٤ تمارين اليوم</div>
                  <div className="mt-1 text-sm text-ivory/70">المدة المتوقعة ١٨ دقيقة</div>
                  <div className="mt-4"><StepDots total={4} current={0} tone="light" /></div>
                  <Button variant="ink-light" block size="lg" className="mt-5" icon={<Play size={18} />}>ابدأ تمارين اليوم</Button>
                </div>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[40px] border-[10px] border-ink bg-page shadow-[var(--shadow-lg)]">
              <ExerciseArt region="knee" className="aspect-[4/3]" />
              <div className="p-5">
                <StepDots total={4} current={1} completed={[0]} />
                <div className="mt-4 text-lg font-semibold text-ink">رفع الساق المستقيمة</div>
                <div className="mt-3 flex gap-2"><Badge tone="slate">١٠ تكرارات</Badge><Badge tone="slate">٣ مجموعات</Badge></div>
                <div className="mt-5 grid grid-cols-2 gap-2"><Button variant="sage" size="lg">تم التمرين</Button><Button variant="clay" size="lg">واجهت مشكلة</Button></div>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[40px] border-[10px] border-ink bg-page shadow-[var(--shadow-lg)]">
              <div className="surface-sage p-6 text-center">
                <ProgressRing value={4} max={4} size={120}><div className="font-display text-3xl font-semibold text-ink">✓</div></ProgressRing>
                <div className="mt-4 font-display text-2xl font-semibold text-ink">أحسنت، أنهيت برنامج اليوم</div>
                <p className="mt-1 text-sm text-sage-800">٤ تمارين · ١٧ دقيقة</p>
              </div>
              <div className="p-5"><div className="mb-3 text-sm font-medium text-ink">كيف تشعر بعد البرنامج؟</div><div className="grid grid-cols-3 gap-2">{["أفضل", "كما هو", "أسوأ"].map((f) => <button key={f} className="rounded-[14px] border border-line bg-surface py-3 text-sm hover:border-sage-400">{f}</button>)}</div></div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <LogoMark className="size-14" />
            <p className="text-sm text-text-2">العلامة: مسار واحد متصل يرتفع بقوس — رحلة التعافي — وينتهي بنقطة مريمية: الهدف المتحقق.</p>
          </div>
        </Section>

        <Section id="principles" eyebrow="13 — Principles" title="مبادئ التصميم">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["رعاية هادئة", "مساحات واسعة، حركة ناعمة، وألوان منخفضة التشبع تُخفّض التوتر."],
              ["حمل معرفي منخفض", "الفعل المطلوب أولًا، والتفاصيل عند الحاجة فقط (Progressive Disclosure)."],
              ["تسلسل واضح", "الأردواز للأفعال، الحبر للعناوين، المريمية للتقدم — لكل لون وظيفة."],
              ["عربي أولًا", "اتجاه RTL أصيل، مصطلحات مبسطة للمراجع ومهنية لمقدم الرعاية."],
              ["إتاحة شاملة", "تباين ≥ 4.5:1 للنص، مؤشرات تركيز واضحة، ولا معنى يعتمد على اللون وحده."],
              ["كثافة بلا فوضى", "مساحات العمل السريرية غنية بالبيانات ومنظمة بخطوط رفيعة وتجميع ذكي."],
            ].map(([t, d]) => (
              <Card key={t} tone="soft"><div className="font-semibold text-ink">{t}</div><p className="mt-1.5 text-sm leading-relaxed text-text-2">{d}</p></Card>
            ))}
          </div>
        </Section>
      </main>
      <footer className="border-t border-line/70 py-10 text-center text-sm text-text-2">مَسار · نظام التصميم ١.٠</footer>
    </div>
  );
}
