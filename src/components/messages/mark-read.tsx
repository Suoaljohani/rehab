"use client";
import { useEffect } from "react";
import { markThreadRead } from "@/lib/actions/patient";

export function MarkRead({ threadId }: { threadId: string }) {
  useEffect(() => {
    markThreadRead(threadId);
  }, [threadId]);
  return null;
}
