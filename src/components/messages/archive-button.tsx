"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setThreadArchived } from "@/lib/actions/patient";

export function ArchiveButton({ threadId, archived }: { threadId: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button variant="ghost" size="sm" loading={pending} icon={archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
      onClick={() => start(async () => { await setThreadArchived(threadId, !archived); router.refresh(); })}>
      {archived ? "إلغاء الأرشفة" : "أرشفة"}
    </Button>
  );
}
