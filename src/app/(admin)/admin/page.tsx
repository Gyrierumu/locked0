import { Check, Database, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/config/routes";

const foundations = [
  {
    title: "Database baseline",
    status: "Ready",
    description: "Schema PostgreSQL/Drizzle congelado na Etapa 10A.",
    icon: Database,
  },
  {
    title: "Identity",
    status: "Ready",
    description: "Identidade Supabase verificada no servidor.",
    icon: KeyRound,
  },
  {
    title: "Authorization",
    status: "Active",
    description: "Acesso calculado a partir de public.user_roles.",
    icon: ShieldCheck,
  },
] as const;

export default function AdminOverviewPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Overview
      </p>
      <div className="mt-3 flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin ativo</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            A identidade e a função efetiva desta sessão estão confirmadas no cabeçalho. Games,
            Platforms, Releases e Content Packs já podem ser operados conforme sua permissão.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium">
          <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
          Ambiente operacional
        </span>
      </div>

      <section aria-labelledby="foundation-heading" className="mt-8">
        <h2 id="foundation-heading" className="text-sm font-semibold">
          Estado da fundação
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {foundations.map(({ title, status, description, icon: Icon }) => (
            <article key={title} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <span
                  aria-hidden="true"
                  className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground"
                >
                  <Icon className="size-4" />
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <Check className="size-3.5" aria-hidden="true" />
                  {status}
                </span>
              </div>
              <h3 className="mt-6 font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="catalog-heading" className="mt-8 border-t border-border pt-8">
        <h2 id="catalog-heading" className="text-sm font-semibold">
          Catalog Admin
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Comece pela lista de jogos ou configure as plataformas disponíveis para releases.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={routes.adminGames} className={buttonVariants()}>
            Abrir jogos
          </Link>
          <Link href={routes.adminPlatforms} className={buttonVariants({ variant: "outline" })}>
            Abrir plataformas
          </Link>
        </div>
      </section>
    </div>
  );
}
