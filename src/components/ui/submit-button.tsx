"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  block,
  icon,
  className,
  name,
  value,
  pendingLabel,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
  className?: string;
  name?: string;
  value?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} block={block} loading={pending} icon={icon} className={className} name={name} value={value}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
