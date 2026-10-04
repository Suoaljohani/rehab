"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { Checkbox, ChoiceCard, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitRequest } from "@/lib/actions/public";

export function RequestForm({ specialties, defaultService, journey }: { specialties: { code: string; name: string }[]; defaultService?: string; journey?: string }) {
  const [state, action] = useActionState(submitRequest, null);
  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="journey_type" value={journey === "referral" ? "referral" : "new_appointment"} />
      {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-ink">بياناتك</h2>
        <Field label="الاسم الكامل" htmlFor="full_name" required>
          <Input id="full_name" name="full_name" autoComplete="name" required minLength={3} />
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="رقم الجوال" htmlFor="phone" required hint="سنستخدمه للتواصل ومتابعة الطلب.">
            <Input id="phone" name="phone" type="tel" dir="ltr" inputMode="tel" placeholder="05XXXXXXXX" required className="text-end" pattern="^(05\d{8}|\+?9665\d{8})$" />
          </Field>
          <Field label="رقم الهوية / الإقامة" htmlFor="national_id" hint="اختياري — يساعد على ربط طلبك بملفك.">
            <Input id="national_id" name="national_id" dir="ltr" inputMode="numeric" maxLength={10} className="text-end" />
          </Field>
        </div>
      </section>
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-ink">الخدمة</h2>
        <Field label="الخدمة المطلوبة" htmlFor="specialty_code">
          <Select id="specialty_code" name="specialty_code" defaultValue={defaultService ?? ""}>
            <option value="">لست متأكدًا — ساعدوني في الاختيار</option>
            {specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </Select>
        </Field>
        <Checkbox name="has_referral" label="لدي إحالة من طبيب" description="أحضرها معك في الموعد الأول." defaultChecked={journey === "referral"} />
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">الفترة المناسبة</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ChoiceCard name="preferred_period" value="صباحًا" label="صباحًا" description="٧:٣٠ – ١٢:٠٠" defaultChecked />
            <ChoiceCard name="preferred_period" value="ظهرًا" label="ظهرًا" description="١٢:٠٠ – ٢:٠٠" />
            <ChoiceCard name="preferred_period" value="أي وقت" label="أي وقت" description="الأقرب المتاح" />
          </div>
        </fieldset>
        <Field label="ملاحظات" htmlFor="notes" hint="صف حالتك باختصار — لا تكتب معلومات حساسة غير ضرورية.">
          <Textarea id="notes" name="notes" maxLength={1500} rows={4} />
        </Field>
      </section>
      <Checkbox name="consent" required label="أوافق على معالجة بياناتي لغرض تنظيم الموعد وفق سياسة الخصوصية." />
      <Notice tone="neutral">هذا طلب موعد وليس حجزًا مؤكدًا. سيراجعه القسم ويتواصل معك لتحديد الموعد.</Notice>
      <SubmitButton size="lg" block icon={<Send size={18} />} pendingLabel="جارٍ الإرسال…">إرسال الطلب</SubmitButton>
    </form>
  );
}
