import type { ComponentProps } from "react";

import { cn } from "@/shared/utils/cn";

type BadgeProps = ComponentProps<"span"> &
  Readonly<{ tone?: "neutral" | "success" | "warning" }>;

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex w-fit items-center rounded-md border px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wider",
        tone === "neutral" && "border-border bg-muted text-muted-foreground",
        tone === "success" && "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        tone === "warning" && "border-amber-400/30 bg-amber-400/10 text-amber-200",
        className,
      )}
      {...props}
    />
  );
}

