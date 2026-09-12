import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { routes } from "@/config/routes";
import { cn } from "@/shared/utils/cn";

import type { AdminAchievementSetWorkspace, AdminGameContext } from "../../contracts";

type AchievementSetWorkspaceProps = Readonly<{
  game: AdminGameContext;
  achievementSet: AdminAchievementSetWorkspace;
  view: "overview" | "groups" | "achievements";
  children: ReactNode;
}>;

function isPlayStation(achievementSet: AdminAchievementSetWorkspace): boolean {
  return achievementSet.linkedReleases.length > 0 && achievementSet.linkedReleases.every((release) =>
    /playstation|^ps\d/i.test(`${release.platform.name} ${release.platform.shortName}`),
  );
}

export function AchievementSetWorkspace({ game, achievementSet, view, children }: AchievementSetWorkspaceProps) {
  const base = routes.adminGameAchievementSet(game.id, achievementSet.id);
  const tabs = [
    { id: "overview", label: "Overview", href: base },
    { id: "groups", label: "Groups", href: `${base}?view=groups` },
    { id: "achievements", label: isPlayStation(achievementSet) ? "Troféus" : "Achievements", href: `${base}?view=achievements` },
  ] as const;

  return (
    <div>
      <Link href={routes.adminGameAchievementSets(game.id)} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <ArrowLeft className="size-4" aria-hidden="true" /> {game.name}
      </Link>
      <header className="mt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achievement Set</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{achievementSet.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {achievementSet.linkedReleases.length > 0
                ? [...new Set(achievementSet.linkedReleases.map((release) => release.platform.name))].join(" · ")
                : "Sem release associada"}
              <span aria-hidden="true"> · </span>{achievementSet.achievementCount} {isPlayStation(achievementSet) ? "troféus" : "conquistas"}
              {!isPlayStation(achievementSet) && achievementSet.pointsTotal > 0 ? <><span aria-hidden="true"> · </span>{achievementSet.pointsTotal} pontos</> : null}
              {achievementSet.hiddenCount > 0 ? <><span aria-hidden="true"> · </span>{achievementSet.hiddenCount} ocultas</> : null}
            </p>
          </div>
          <Badge tone={achievementSet.status === "active" ? "success" : "warning"}>{achievementSet.status === "active" ? "Ativa" : "Arquivada"}</Badge>
        </div>
        <nav aria-label="Áreas da lista" className="mt-6 flex flex-wrap gap-1 border-b border-border">
          {tabs.map((tab) => (
            <Link key={tab.id} href={tab.href} aria-current={view === tab.id ? "page" : undefined} className={cn("border-b-2 px-3 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50", view === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {tab.label}
            </Link>
          ))}
          <span aria-disabled="true" className="cursor-not-allowed border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground/60">Coverage <span className="ml-1 text-[0.65rem] uppercase">Em breve</span></span>
        </nav>
      </header>
      <div className="py-7">{children}</div>
    </div>
  );
}
