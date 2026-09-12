import { Card } from "@/components/ui/card";

import type {
  AdminAchievementSetWorkspace,
  AdminGameRelease,
} from "../../contracts";
import {
  AchievementSetForm,
  AchievementSetReleaseForm,
} from "./achievement-set-form.client";

type AchievementSetOverviewProps = Readonly<{
  gameId: string;
  achievementSet: AdminAchievementSetWorkspace;
  releases: readonly AdminGameRelease[];
  canManage: boolean;
}>;

export function AchievementSetOverview({ gameId, achievementSet, releases, canManage }: AchievementSetOverviewProps) {
  if (!canManage) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5"><h2 className="font-semibold">Metadados</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">Nome</dt><dd>{achievementSet.name}</dd></div><div><dt className="text-muted-foreground">Chave interna</dt><dd className="font-mono">{achievementSet.key}</dd></div><div><dt className="text-muted-foreground">Região</dt><dd>{achievementSet.regionCode ?? "Não informada"}</dd></div><div><dt className="text-muted-foreground">Status</dt><dd>{achievementSet.status === "active" ? "Ativa" : "Arquivada"}</dd></div></dl></Card>
        <Card className="p-5"><h2 className="font-semibold">Releases associadas</h2><ul className="mt-4 space-y-2 text-sm">{achievementSet.linkedReleases.map((release) => <li key={release.id}>{release.name ?? release.key} · {release.platform.name}</li>)}</ul></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 font-semibold">Metadados</h2>
        <AchievementSetForm gameId={gameId} releases={releases} achievementSet={achievementSet} />
      </Card>
      <Card className="p-5 sm:p-6">
        <AchievementSetReleaseForm gameId={gameId} releases={releases} achievementSet={achievementSet} />
      </Card>
    </div>
  );
}
