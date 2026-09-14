import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes } from "@/config/routes";

import type {
  AdminAchievement,
  AdminAchievementGroup,
  AdminAchievementListQuery,
  PaginatedResult,
} from "../../contracts";
import { AchievementCreateForm } from "./achievement-create-form.client";
import { AchievementFilters } from "./achievement-filters.client";
import { AchievementPaste } from "./achievement-paste.client";
import { AchievementRow } from "./achievement-row.client";

type AchievementManagerProps = Readonly<{
  gameId: string;
  gameName: string;
  achievementSetId: string;
  groups: readonly AdminAchievementGroup[];
  achievements: PaginatedResult<AdminAchievement>;
  query: AdminAchievementListQuery;
  canManage: boolean;
  iconPreviewUrls: Readonly<Record<string, string>>;
}>;

function pageHref(gameId: string, achievementSetId: string, query: AdminAchievementListQuery, page: number): string {
  const params = new URLSearchParams({ view: "achievements", page: String(page) });
  if (query.q) params.set("q", query.q);
  if (query.groupId) params.set("groupId", query.groupId);
  if (query.type !== "all") params.set("type", query.type);
  if (query.status !== "all") params.set("status", query.status);
  if (query.hidden !== "all") params.set("hidden", query.hidden);
  return `${routes.adminGameAchievementSet(gameId, achievementSetId)}?${params}`;
}

export function AchievementManager({ gameId, gameName, achievementSetId, groups, achievements, query, canManage, iconPreviewUrls }: AchievementManagerProps) {
  return (
    <section aria-labelledby="achievements-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="achievements-heading" className="text-xl font-semibold">Conquistas</h2>
          <p className="mt-2 text-sm text-muted-foreground">{achievements.total} no resultado atual · ordem canônica por grupo e posição</p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <AchievementPaste gameId={gameId} achievementSetId={achievementSetId} groups={groups} />
          </div>
        ) : null}
      </div>

      <AchievementFilters
        pathname={routes.adminGameAchievementSet(gameId, achievementSetId)}
        groups={groups}
        query={query}
      />

      {canManage ? (
        <details className="mt-4 rounded-xl border border-border bg-card p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Plus className="size-4" aria-hidden="true" /> Adicionar
          </summary>
          <div className="mt-5 border-t border-border pt-5">
            <AchievementCreateForm gameId={gameId} achievementSetId={achievementSetId} groups={groups} />
          </div>
        </details>
      ) : null}

      {achievements.items.length === 0 ? (
        <Card className="mt-5 px-6 py-12 text-center">
          <h3 className="font-semibold">Nenhuma conquista cadastrada.</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Adicione manualmente ou cole uma lista completa.</p>
        </Card>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[70rem] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-3">#</th><th scope="col" className="px-3 py-3">Nome</th><th scope="col" className="px-3 py-3">Tipo</th><th scope="col" className="px-3 py-3">Hidden</th><th scope="col" className="px-3 py-3">Pontos</th><th scope="col" className="px-3 py-3">Grupo</th><th scope="col" className="px-3 py-3">Status</th><th scope="col" className="px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {achievements.items.map((achievement, index) => (
                <AchievementRow
                  key={achievement.id}
                  achievement={achievement}
                  groups={groups}
                  gameId={gameId}
                  gameName={gameName}
                  achievementSetId={achievementSetId}
                  canManage={canManage}
                  iconPreviewUrl={achievement.iconPath ? iconPreviewUrls[achievement.iconPath] ?? null : null}
                  displayPosition={(achievements.page - 1) * achievements.pageSize + index + 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {achievements.totalPages > 1 ? (
        <nav aria-label="Paginação de conquistas" className="mt-5 flex items-center justify-between">
          <Button
            render={<Link href={pageHref(gameId, achievementSetId, query, Math.max(1, achievements.page - 1))} />}
            variant="outline"
            aria-disabled={achievements.page === 1}
          >Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {achievements.page} de {achievements.totalPages}</span>
          <Button
            render={<Link href={pageHref(gameId, achievementSetId, query, Math.min(achievements.totalPages, achievements.page + 1))} />}
            variant="outline"
            aria-disabled={achievements.page === achievements.totalPages}
          >Próxima</Button>
        </nav>
      ) : null}
    </section>
  );
}
