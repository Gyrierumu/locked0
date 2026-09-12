"use client";

import { useActionState, useMemo } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";

import { reorderAchievementGroupsAction } from "../actions/achievement-actions";
import { initialCatalogFormState } from "../action-state";

type AchievementGroupReorderProps = Readonly<{
  gameId: string;
  achievementSetId: string;
  orderedGroupIds: readonly string[];
  direction: "up" | "down";
  label: string;
}>;

export function AchievementGroupReorder({ gameId, achievementSetId, orderedGroupIds, direction, label }: AchievementGroupReorderProps) {
  const action = useMemo(
    () => reorderAchievementGroupsAction.bind(null, gameId, achievementSetId, orderedGroupIds),
    [achievementSetId, gameId, orderedGroupIds],
  );
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  const Icon = direction === "up" ? ArrowUp : ArrowDown;

  return (
    <form action={formAction}>
      <Button type="submit" variant="ghost" size="icon-sm" aria-label={label} title={label} disabled={pending}>
        <Icon aria-hidden="true" />
      </Button>
      <span className="sr-only" aria-live="polite">{state.message}</span>
    </form>
  );
}
