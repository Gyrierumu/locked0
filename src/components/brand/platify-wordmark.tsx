import Link from "next/link";

import { routes } from "@/config/routes";

export function PlatifyWordmark() {
  return (
    <Link
      href={routes.home}
      className="inline-flex w-fit items-center gap-3 text-2xl font-bold tracking-tight"
      aria-label="Platify — início"
    >
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"
      >
        P
      </span>
      <span>Platify</span>
    </Link>
  );
}
