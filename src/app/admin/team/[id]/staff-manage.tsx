"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { resetPassword, setUserRole } from "@/lib/actions/admin";
import { ROLE_LABEL } from "@/lib/status";

export function StaffManage({ userId, role, self }: { userId: string; role: string; self: boolean }) {
  const [r, setR] = useState(role);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const done = (res: { ok: boolean; error?: string }, msg: string) => { if (!res.ok) toast({ tone: "danger", title: "تعذّر الحفظ", body: res.error }); else { toast({ tone: "success", title: msg }); router.refresh(); } };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="الدور (يُطبّق فورًا ويُسجّل)" htmlFor="r" hint={self ? "لا يمكنك تغيير دورك بنفسك." : undefined}>
          <Select id="r" value={r} disabled={self} onChange={(e) => setR(e.target.value)}>{["provider", "supervisor", "content_reviewer", "admin"].map((x) => <option key={x} value={x}>{ROLE_LABEL[x]}</option>)}</Select>
        </Field>
        <Button variant="secondary" disabled={self || r === role} loading={pending} onClick={() => start(async () => done(await setUserRole(userId, r, `/admin/team/${userId}`), "تم تغيير الدور"))}>تغيير الدور</Button>
      </div>
      <div className="border-t border-line-soft pt-6">
        <Button variant="quiet" icon={<KeyRound size={16} />} onClick={() => setPwOpen(true)}>إعادة تعيين كلمة المرور</Button>
      </div>
      <Dialog open={pwOpen} onClose={() => setPwOpen(false)} title="إعادة تعيين كلمة المرور" size="sm"
        footer={<><Button variant="ghost" onClick={() => setPwOpen(false)}>إلغاء</Button><Button disabled={pw.length < 10 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)} loading={pending} onClick={() => start(async () => { const res = await resetPassword(userId, pw); done(res, "تم تعيين كلمة المرور"); if (res.ok) setPwOpen(false); })}>تعيين</Button></>}>
        <Field label="كلمة مرور مؤقتة جديدة" htmlFor="np" hint="١٠ أحرف على الأقل بحروف وأرقام. سيُطلب من الموظف تغييرها عند دخوله التالي."><Input id="np" dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} className="font-mono" /></Field>
      </Dialog>
    </div>
  );
}
