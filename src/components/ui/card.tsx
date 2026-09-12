import type { ComponentProps } from "react";

import { cn } from "@/shared/utils/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn("rounded-xl border border-border bg-card", className)}
      {...props}
    />
  );
}

