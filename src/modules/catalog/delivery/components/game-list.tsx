import { ImageIcon, Plus, Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { routes } from "@/config/routes";
import { cn } from "@/shared/utils/cn";

import type {
  AdminGameListQuery,
  CatalogCapabilities,
  PaginatedResult,
  AdminGameListItem,
} from "../../contracts";

function gamesHref(query: AdminGameListQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "all") params.set("status", query.status);
  if (query.page > 1) params.set("page", String(query.page));
  const suffix = params.toString();
  return suffix ? `${routes.adminGames}?${suffix}` : routes.adminGames;
}

function yearOf(date: string | null): string | null {
  return date?.slice(0, 4) ?? null;
}

type GameListProps = Readonly<{
  capabilities: CatalogCapabilities;
  data: PaginatedResult<AdminGameListItem>;
  query: AdminGameListQuery;
}>;

export function GameList({ capabilities, data, query }: GameListProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Jogos
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Catálogo de jogos</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Gerencie o catálogo principal do LOCKED:0.
          </p>
        </div>
        {capabilities.canManageGames ? (
          <Link
            href={routes.adminGameNew}
            className={cn(buttonVariants({ size: "lg" }), "w-fit")}
          >
            <Plus aria-hidden="true" />
            Novo jogo
          </Link>
        ) : null}
      </div>

      <form action={routes.adminGames} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="game-search" className="sr-only">
          Buscar jogo
        </label>
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="game-search"
            name="q"
            defaultValue={query.q}
            placeholder="Buscar jogo..."
            className="pl-9"
          />
        </div>
        {query.status !== "all" ? <input type="hidden" name="status" value={query.status} /> : null}
        <button className={buttonVariants({ variant: "outline", size: "lg" })} type="submit">
          Buscar
        </button>
      </form>

      <nav aria-label="Filtrar jogos por status" className="mt-4 flex flex-wrap gap-2">
        {(["all", "active", "archived"] as const).map((status) => (
          <Link
            key={status}
            href={gamesHref({ ...query, status, page: 1 })}
            aria-current={query.status === status ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: query.status === status ? "secondary" : "ghost", size: "sm" }),
            )}
          >
            {status === "all" ? "Todos" : status === "active" ? "Ativos" : "Arquivados"}
          </Link>
        ))}
      </nav>

      {data.items.length === 0 ? (
        <Card className="mt-7 px-6 py-14 text-center">
          <h2 className="text-lg font-semibold">Nenhum jogo cadastrado.</h2>
          {query.q || query.status !== "all" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Ajuste a busca ou os filtros para encontrar outros jogos.
            </p>
          ) : capabilities.canManageGames ? (
            <>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Crie o primeiro jogo para começar a estruturar o catálogo do LOCKED:0.
              </p>
              <Link
                href={routes.adminGameNew}
                className={cn(buttonVariants({ size: "lg" }), "mt-6")}
              >
                <Plus aria-hidden="true" />
                Novo jogo
              </Link>
            </>
          ) : null}
        </Card>
      ) : (
        <div className="mt-7 space-y-3">
          {data.items.map((game) => (
            <article
              key={game.id}
              className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <div
                aria-label="Jogo sem capa cadastrada"
                className="grid aspect-[4/5] w-16 place-items-center rounded-lg border border-border bg-muted text-muted-foreground sm:w-20"
              >
                <ImageIcon className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">{game.name}</h2>
                  <Badge tone={game.status === "active" ? "success" : "warning"}>
                    {game.status === "active" ? "Ativo" : "Arquivado"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[game.developerName, yearOf(game.releaseDate)].filter(Boolean).join(" • ") ||
                    game.slug}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {game.releaseCount} {game.releaseCount === 1 ? "release" : "releases"}
                  <span aria-hidden="true"> · </span>
                  {game.contentPackCount} {game.contentPackCount === 1 ? "conteúdo adicional" : "conteúdos adicionais"}
                </p>
              </div>
              <Link
                href={routes.adminGame(game.id)}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Abrir
              </Link>
            </article>
          ))}
        </div>
      )}

      {data.totalPages > 1 ? (
        <nav
          aria-label="Paginação de jogos"
          className="mt-7 flex items-center justify-between gap-4 border-t border-border pt-5"
        >
          <Link
            href={gamesHref({ ...query, page: Math.max(1, data.page - 1) })}
            aria-disabled={data.page <= 1}
            className={cn(
              buttonVariants({ variant: "outline" }),
              data.page <= 1 && "pointer-events-none opacity-50",
            )}
          >
            Anterior
          </Link>
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {data.totalPages} · {data.total} jogos
          </p>
          <Link
            href={gamesHref({ ...query, page: Math.min(data.totalPages, data.page + 1) })}
            aria-disabled={data.page >= data.totalPages}
            className={cn(
              buttonVariants({ variant: "outline" }),
              data.page >= data.totalPages && "pointer-events-none opacity-50",
            )}
          >
            Próxima
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

