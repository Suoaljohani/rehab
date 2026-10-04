"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-4">
      <ErrorState
        kind={offline ? "offline" : "error"}
        title={offline ? "لا يوجد اتصال بالإنترنت" : "حدث خطأ غير متوقع"}
        description={offline ? "تحقق من اتصالك ثم أعد المحاولة. لن نفقد أي بيانات سجّلتها." : "نعتذر عن ذلك. أعد المحاولة، وإذا استمرت المشكلة تواصل مع القسم."}
        action={<Button onClick={reset}>إعادة المحاولة</Button>}
      />
    </main>
  );
}
