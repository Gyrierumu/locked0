import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { routes } from "@/config/routes";

export default function NotFoundPage() {
  return (
    <PageShell>
      <section className="grid min-h-screen place-items-center py-20 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            404
          </p>
          <h1 className="mt-4 text-4xl font-bold">Página não encontrada.</h1>
          <p className="mt-4 text-muted-foreground">
            O endereço pode ter mudado ou ainda não está disponível.
          </p>
          <Link className="mt-8 inline-block underline underline-offset-4" href={routes.home}>
            Voltar ao início
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
