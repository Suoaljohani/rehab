import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[12px] border border-line bg-surface px-3.5 text-[0.9375rem] text-text placeholder:text-text-3 shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-200 hover:border-sand-300 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:bg-surface-soft disabled:text-text-3 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger-bg";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-11", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(control, "py-3 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, "h-11 appearance-none ps-3.5 pe-10", className)} {...rest}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-text-2"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

export function Label({ htmlFor, children, required, className }: { htmlFor?: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-medium text-ink", className)}>
      {children}
      {required && <span className="ms-1 text-clay-500" aria-hidden="true">*</span>}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-[0.8125rem] text-danger-fg" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.8125rem] text-text-2">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, description, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input
        type="checkbox"
        className="mt-1 size-[18px] shrink-0 cursor-pointer appearance-none rounded-[6px] border border-slate-300 bg-surface transition checked:border-slate-600 checked:bg-slate-600 checked:bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22><path%20d=%22m5%2010.5%203.2%203L15%206.5%22%20stroke=%22%23F7F3EE%22%20stroke-width=%222.2%22%20fill=%22none%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/></svg>')] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
        {...rest}
      />
      <span>
        <span className="block text-[0.9375rem] text-text">{label}</span>
        {description && <span className="block text-[0.8125rem] text-text-2">{description}</span>}
      </span>
    </label>
  );
}

/** Large selectable cards — used for wizards and patient-friendly choices. */
export function ChoiceCard({
  name,
  value,
  label,
  description,
  icon,
  defaultChecked,
  type = "radio",
  required,
}: {
  name: string;
  value: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  defaultChecked?: boolean;
  type?: "radio" | "checkbox";
  required?: boolean;
}) {
  return (
    <label className="group relative flex cursor-pointer items-start gap-3 rounded-[16px] border border-line bg-surface p-4 transition-[border-color,background-color,box-shadow] hover:border-sand-300 has-[:checked]:border-slate-500 has-[:checked]:bg-slate-50 has-[:checked]:shadow-[0_0_0_3px_var(--color-slate-100)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-slate-600">
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} required={required} className="peer sr-only" />
      {icon && (
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-sand-100 text-slate-600 transition group-has-[:checked]:bg-slate-600 group-has-[:checked]:text-ivory">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-text-2">{description}</span>}
      </span>
      <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full border border-slate-300 transition group-has-[:checked]:border-slate-600 group-has-[:checked]:bg-slate-600">
        <span className="size-2 rounded-full bg-ivory opacity-0 transition group-has-[:checked]:opacity-100" />
      </span>
    </label>
  );
}
