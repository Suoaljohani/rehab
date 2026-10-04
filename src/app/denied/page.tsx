import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { buttonClasses } from "@/components/ui/button";
import { getViewer, homeFor } from "@/lib/auth";

export default async function Denied() {
  const viewer = await getViewer();
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <ErrorState
        kind="denied"
        title="لا تملك صلاحية الوصول"
        description="هذه الصفحة غير متاحة لدورك الحالي. إذا كنت تعتقد أن هذا خطأ، تواصل مع مشرف القسم."
        action={<Link href={viewer ? homeFor(viewer.role) : "/"} className={buttonClasses("primary")}>العودة للصفحة الرئيسية</Link>}
      />
    </main>
  );
}
