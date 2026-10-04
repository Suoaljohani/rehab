import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function TableShell({ children, className, toolbar, footer }: { children: ReactNode; className?: string; toolbar?: ReactNode; footer?: ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-xl)] border border-line/80 bg-surface shadow-[var(--shadow-sm)]", className)}>
      {toolbar && <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-3.5">{toolbar}</div>}
      <div className="scrollbar-calm overflow-x-auto">{children}</div>
      {footer && <div className="border-t border-line-soft px-5 py-3 text-sm text-text-2">{footer}</div>}
    </div>
  );
}

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full min-w-[640px] border-collapse text-start text-sm", className)} {...rest} />;
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-[#FBF8F4] text-text-2", className)} {...rest} />;
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("whitespace-nowrap border-b border-line-soft px-5 py-3 text-start text-xs font-medium tracking-wide", className)} {...rest} />;
}

export function Tr({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-line-soft transition-colors last:border-0 hover:bg-[#FCFAF7]", className)} {...rest} />;
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-5 py-3.5 align-middle text-text", className)} {...rest} />;
}
