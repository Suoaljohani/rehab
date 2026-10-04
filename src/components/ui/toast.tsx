"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Toast = { id: number; tone: "success" | "info" | "warning" | "danger"; title: string; body?: string };
const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 5200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite" role="status">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-[rise_0.4s_var(--ease-calm)] items-start gap-3 rounded-[16px] border border-line bg-surface px-4 py-3.5 shadow-[var(--shadow-lg)]"
          >
            <span className={cn("mt-0.5", { success: "text-success", info: "text-info", warning: "text-warning", danger: "text-danger" }[t.tone])}>
              {t.tone === "success" ? <CheckCircle2 size={20} /> : t.tone === "info" ? <Info size={20} /> : <TriangleAlert size={20} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{t.title}</div>
              {t.body && <div className="mt-0.5 text-[0.8125rem] text-text-2">{t.body}</div>}
            </div>
            <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} className="text-text-3 hover:text-ink" aria-label="إغلاق">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
