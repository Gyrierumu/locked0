import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type FieldProps = Readonly<{
  children: ReactNode;
  description?: string;
  error?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
}>;

export function Field({
  children,
  description,
  error,
  htmlFor,
  label,
  required,
}: FieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {description ? (
        <p id={descriptionId} className="text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function fieldA11y(name: string, description: boolean, error?: string) {
  return {
    "aria-describedby": [description ? `${name}-description` : null, error ? `${name}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined,
    "aria-invalid": error ? true : undefined,
  } as const;
}

export function FormMessage({
  message,
  status,
}: Readonly<{ message: string | null; status: "idle" | "success" | "error" }>) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "min-h-5 text-sm",
        status === "error" && "text-destructive",
        status === "success" && "text-emerald-300",
      )}
    >
      {message}
    </p>
  );
}

export function firstError(
  errors: Readonly<Record<string, readonly string[]>> | undefined,
  field: string,
): string | undefined {
  return errors?.[field]?.[0];
}

