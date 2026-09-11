import { ArrowLeft, ShieldX } from "lucide-react";
import Link from "next/link";

import { brand } from "@/config/brand";
import { routes } from "@/config/routes";

export function AccessDenied() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-16">
      <section className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-sm">
        <span
          aria-hidden="true"
          className="grid size-11 place-items-center rounded-lg bg-destructive/10 text-destructive"
        >
          <ShieldX className="size-5" />
        </span>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {brand.name} Admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Acesso restrito</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Sua conta está autenticada, mas não possui permissão para acessar o {brand.name} Admin.
        </p>
        <Link
          href={routes.home}
          className="mt-8 inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao {brand.name}
        </Link>
      </section>
    </main>
  );
}
