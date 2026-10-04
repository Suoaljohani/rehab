"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, Drawer } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { Field, Input, Textarea } from "@/components/ui/field";
import { BarChart, LineChart } from "@/components/ui/charts";

export function OverlayDemos() {
  const [d, setD] = useState(false);
  const [dr, setDr] = useState(false);
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => setD(true)}>فتح نافذة حوار</Button>
      <Button variant="secondary" onClick={() => setDr(true)}>فتح درج جانبي</Button>
      <Button variant="quiet" onClick={() => toast({ tone: "success", title: "تم حفظ البرنامج", body: "سيظهر للمراجع بعد النشر." })}>إشعار نجاح</Button>
      <Button variant="quiet" onClick={() => toast({ tone: "warning", title: "تنبيه", body: "انتهت صلاحية الجلسة قريبًا." })}>إشعار تنبيه</Button>
      <Dialog
        open={d}
        onClose={() => setD(false)}
        title="نشر البرنامج للمراجع"
        description="سيتم حفظ نسخة جديدة وإنشاء الجدول ابتداءً من تاريخ السريان."
        footer={
          <>
            <Button variant="ghost" onClick={() => setD(false)}>إلغاء</Button>
            <Button onClick={() => setD(false)}>نشر الآن</Button>
          </>
        }
      >
        <Field label="ملخص التغيير" hint="يظهر في سجل نسخ البرنامج.">
          <Textarea placeholder="مثال: زيادة عدد التكرارات لتمرين رفع الساق" />
        </Field>
      </Dialog>
      <Drawer open={dr} onClose={() => setDr(false)} title="إعدادات التمرين" footer={<Button onClick={() => setDr(false)}>حفظ</Button>}>
        <div className="space-y-4">
          <Field label="التكرارات"><Input type="number" defaultValue={10} /></Field>
          <Field label="المجموعات"><Input type="number" defaultValue={3} /></Field>
        </div>
      </Drawer>
    </div>
  );
}

export function ChartDemos() {
  const week = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const adh = [100, 67, 100, null, 100, 50, 100];
  const pain = [6, 6, 5, 5, 4, 4, 3, 3, 2];
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <div className="mb-3 text-sm font-medium text-ink">الالتزام اليومي هذا الأسبوع</div>
        <BarChart title="الالتزام اليومي" unit="٪" max={100} data={week.map((l, i) => ({ label: l, value: adh[i] }))} />
      </div>
      <div>
        <div className="mb-3 text-sm font-medium text-ink">اتجاه درجة الألم (٠–١٠)</div>
        <LineChart title="اتجاه الألم" max={10} data={pain.map((v, i) => ({ label: `الأسبوع ${i + 1}`, value: v }))} />
      </div>
    </div>
  );
}
