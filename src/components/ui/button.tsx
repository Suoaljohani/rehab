import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "quiet" | "sage" | "clay" | "danger" | "ink-light";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-calm)] disabled:cursor-not-allowed disabled:opacity-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-600 text-ivory shadow-[var(--shadow-sm)] hover:bg-ink focus-visible:outline-slate-600 disabled:bg-disabled disabled:text-white disabled:shadow-none",
  secondary:
    "bg-surface/70 text-slate-600 border border-slate-600 hover:bg-slate-50 focus-visible:outline-slate-600 disabled:border-disabled disabled:text-text-3 disabled:bg-transparent",
  ghost:
    "text-slate-600 hover:bg-slate-50 focus-visible:outline-slate-600 disabled:text-text-3",
  quiet:
    "bg-surface text-text border border-line hover:border-slate-300 hover:bg-sand-50 focus-visible:outline-slate-600 disabled:text-text-3",
  sage:
    "bg-sage-600 text-white shadow-[var(--shadow-sm)] hover:bg-sage-700 focus-visible:outline-sage-600 disabled:bg-disabled",
  clay:
    "bg-clay-100 text-clay-700 hover:bg-clay-200 focus-visible:outline-clay-500 disabled:text-text-3",
  danger:
    "bg-danger-bg text-danger-fg border border-danger/30 hover:bg-danger hover:text-white focus-visible:outline-danger disabled:opacity-60",
  "ink-light":
    "bg-ivory text-ink hover:bg-white shadow-[var(--shadow-sm)] focus-visible:outline-ivory",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem] rounded-[10px]",
  md: "h-11 px-5 text-[0.9375rem] rounded-[12px]",
  lg: "h-13 px-7 text-base rounded-[14px]",
  xl: "h-16 px-8 text-lg rounded-[18px]",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & CommonProps>(
  function Button({ variant = "primary", size = "md", loading, icon, iconEnd, block, className, children, disabled, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={buttonClasses(variant, size, cn(block && "w-full", className))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? <Spinner /> : icon}
        {children}
        {iconEnd}
      </button>
    );
  },
);

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  block,
  className,
  children,
  ...rest
}: CommonProps & { href: string; className?: string; children?: ReactNode; prefetch?: boolean; "aria-label"?: string }) {
  return (
    <Link href={href} className={buttonClasses(variant, size, cn(block && "w-full", className))} {...rest}>
      {icon}
      {children}
      {iconEnd}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
