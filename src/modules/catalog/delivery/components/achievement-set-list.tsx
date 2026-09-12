import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes } from "@/config/routes";

import type {
  AdminAchievementSetListItem,
  AdminGameContext,
  AdminGameRelease,
  CatalogCapabilities,
} from "../../contracts";
import { AchievementSetForm } from "./achievement-set-form.client";

function platformContext(achievementSet: AdminAchievementSetListItem): string {
  const names = [...new Set(achievementSet.linkedReleases.map((release) => release.platform.name))];
  if (names.length === 0) return "Sem release associada";
  return names.length === 1 ? names[0] : "Multiplataforma";
}

function isPlayStation(achievementSet: AdminAchievementSetListItem): boolean {
  return achievementSet.linkedReleases.length > 0 && achievementSet.linkedReleases.every((release) =>
    /playstation|^ps\d/i.test(`${release.platform.name} ${release.platform.shortName}`),
  );
}

function summary(achievementSet: AdminAchievementSetListItem): string {
  if (!isPlayStation(achievementSet)) {
    const points = achievementSet.typeCounts.standard > 0
      ? achievementSet.achievementCount
      : achievementSet.achievementCount;
    return `${points} ${points === 1 ? "conquista" : "conquistas"}`;
  }
  const counts = achievementSet.typeCounts;
  return [
    `${counts.platinum} Platina`,
    `${counts.gold} Ouro`,
    `${counts.silver} Prata`,
    `${counts.bronze} Bronze`,
  ].join(" · ");
}

type AchievementSetListProps = Readonly<{
  game: AdminGameContext;
  releases: readonly AdminGameRelease[];
  achievementSets: readonly AdminAchievementSetListItem[];
  capabilities: CatalogCapabilities;
}>;

export function AchievementSetList({ game, releases, achievementSets, capabilities }: AchievementSetListProps) {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Achievement Sets</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Listas concretas de troféus e conquistas deste jogo.
          </p>
        </div>
      </div>

      {capabilities.canManageAchievements && game.status === "active" ? (
        <details className="mt-6 rounded-xl border border-border bg-card p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Plus className="size-4" aria-hidden="true" />
            Nova lista
          </summary>
          <div className="mt-6 border-t border-border pt-6">
            <AchievementSetForm gameId={game.id} releases={releases} />
          </div>
        </details>
      ) : null}

      {achievementSets.length === 0 ? (
        <Card className="mt-6 px-6 py-12 text-center">
          <h3 className="font-semibold">Nenhuma lista cadastrada para este jogo.</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Crie uma lista para começar a organizar troféus e conquistas no LOCKED:0.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {achievementSets.map((achievementSet) => (
            <article key={achievementSet.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{platformContext(achievementSet)}</p>
                  <h3 className="mt-2 text-lg font-semibold">{achievementSet.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{summary(achievementSet)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {achievementSet.linkedReleases.map((release) => (
                      <Badge key={release.id}>{release.name ?? release.key}</Badge>
                    ))}
                    <Badge tone={achievementSet.status === "active" ? "success" : "warning"}>
                      {achievementSet.status === "active" ? "Ativa" : "Arquivada"}
                    </Badge>
                  </div>
                </div>
                <Button render={<Link href={routes.adminGameAchievementSet(game.id, achievementSet.id)} />} variant="outline">
                  Abrir
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
