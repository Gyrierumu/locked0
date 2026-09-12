import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type {
  AdminAchievementGroup,
  AdminContentPack,
} from "../../contracts";
import { AchievementGroupForm } from "./achievement-group-form.client";
import { AchievementGroupReorder } from "./achievement-group-reorder.client";

const typeLabels = {
  base: "Base",
  dlc: "DLC",
  expansion: "Expansão",
  update: "Atualização",
  mode: "Modo",
  other: "Outro",
} as const;

type AchievementGroupListProps = Readonly<{
  gameId: string;
  achievementSetId: string;
  groups: readonly AdminAchievementGroup[];
  contentPacks: readonly AdminContentPack[];
  canManage: boolean;
}>;

function movedIds(groups: readonly AdminAchievementGroup[], index: number, offset: -1 | 1): string[] {
  const ids = groups.map((group) => group.id);
  [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
  return ids;
}

export function AchievementGroupList({ gameId, achievementSetId, groups, contentPacks, canManage }: AchievementGroupListProps) {
  return (
    <section aria-labelledby="groups-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="groups-heading" className="text-xl font-semibold">Grupos</h2>
          <p className="mt-2 text-sm text-muted-foreground">Organize Base Game, DLCs, expansões, atualizações e modos.</p>
        </div>
      </div>

      {canManage ? (
        <details className="mt-6 rounded-xl border border-border bg-card p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Plus className="size-4" aria-hidden="true" /> Novo grupo
          </summary>
          <div className="mt-5 border-t border-border pt-5">
            <AchievementGroupForm gameId={gameId} achievementSetId={achievementSetId} contentPacks={contentPacks} />
          </div>
        </details>
      ) : null}

      <div className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {groups.map((group, index) => (
          <article key={group.id} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{group.name}</h3>
                  <Badge>{typeLabels[group.type]}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {group.achievementCount} {group.achievementCount === 1 ? "conquista" : "conquistas"} · Posição {group.position + 1}
                </p>
                {group.contentPack ? <p className="mt-1 text-sm text-muted-foreground">Content Pack: {group.contentPack.name}</p> : null}
              </div>
              {canManage ? (
                <div className="flex items-center gap-1">
                  {index > 0 ? (
                    <AchievementGroupReorder
                      gameId={gameId}
                      achievementSetId={achievementSetId}
                      orderedGroupIds={movedIds(groups, index, -1)}
                      direction="up"
                      label={`Mover ${group.name} para cima`}
                    />
                  ) : null}
                  {index < groups.length - 1 ? (
                    <AchievementGroupReorder
                      gameId={gameId}
                      achievementSetId={achievementSetId}
                      orderedGroupIds={movedIds(groups, index, 1)}
                      direction="down"
                      label={`Mover ${group.name} para baixo`}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
            {canManage ? (
              <details className="mt-4">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Pencil className="size-4" aria-hidden="true" /> Editar
                </summary>
                <div className="mt-4 border-t border-border pt-4">
                  <AchievementGroupForm gameId={gameId} achievementSetId={achievementSetId} contentPacks={contentPacks} group={group} />
                </div>
              </details>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
