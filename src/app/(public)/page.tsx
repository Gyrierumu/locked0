import { Locked0Wordmark } from "@/components/brand/locked0-wordmark";
import { PageShell } from "@/components/layout/page-shell";
import { brand } from "@/config/brand";

export default function HomePage() {
  return (
    <PageShell>
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center py-20">
        <Locked0Wordmark />
        <p className="mt-4 text-sm text-muted-foreground">{brand.tagline}</p>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.28em] text-primary">
          Etapa 9
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          Fundação técnica em construção.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
          A arquitetura modular está pronta para receber catálogo, guias e
          progresso nas próximas etapas, sem antecipar as funcionalidades do
          produto.
        </p>
      </section>
    </PageShell>
  );
}
