"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { sendMessage } from "@/lib/actions/patient";

export function Composer({ threadId, disabled, templates }: { threadId: string; disabled?: boolean; templates?: { id: string; name: string; body: string }[] }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const toast = useToast();
  function send() {
    if (!text.trim()) return;
    start(async () => {
      const r = await sendMessage(threadId, text);
      if (!r.ok) return toast({ tone: "danger", title: "لم تُرسل الرسالة", body: r.error });
      setText("");
      router.refresh();
    });
  }
  if (disabled) return <div className="rounded-[18px] bg-sand-50 p-4 text-center text-sm text-text-2 ring-1 ring-sand-200">هذه المحادثة مؤرشفة.</div>;
  return (
    <div className="rounded-[22px] border border-line bg-surface p-2 shadow-[var(--shadow-sm)] focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-100">
      {templates && templates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
          {templates.map((t) => (
            <button key={t.id} type="button" onClick={() => { setText(t.body); ref.current?.focus(); }} className="rounded-full bg-sand-50 px-3 py-1 text-xs text-text-2 ring-1 ring-sand-200 hover:text-ink">{t.name}</button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <label htmlFor="composer" className="sr-only">اكتب رسالتك</label>
        <textarea id="composer" ref={ref} value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000} placeholder="اكتب رسالتك…"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
          className="max-h-48 min-h-12 flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.9375rem] outline-none placeholder:text-text-3" />
        <Button onClick={send} loading={pending} disabled={!text.trim()} aria-label="إرسال" icon={<SendHorizontal size={18} className="-scale-x-100" />}>إرسال</Button>
      </div>
    </div>
  );
}
