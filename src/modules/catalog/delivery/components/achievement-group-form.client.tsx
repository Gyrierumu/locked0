"use client";

import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type { AdminAchievementGroup, AdminContentPack } from "../../contracts";
import {
  createAchievementGroupAction,
  updateAchievementGroupAction,
} from "../actions/achievement-actions";
import { initialCatalogFormState } from "../action-state";
import { Field, fieldA11y, firstError, FormMessage } from "./form-controls";

type AchievementGroupFormProps = Readonly<{
  gameId: string;
  achievementSetId: string;
  contentPacks: readonly AdminContentPack[];
  group?: AdminAchievementGroup;
}>;

export function AchievementGroupForm({ gameId, achievementSetId, contentPacks, group }: AchievementGroupFormProps) {
  const action = useMemo(
    () => group
      ? updateAchievementGroupAction.bind(null, gameId, achievementSetId, group.id)
      : createAchievementGroupAction.bind(null, gameId, achievementSetId),
    [achievementSetId, gameId, group],
  );
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  const [type, setType] = useState(group?.type ?? "expansion");
  const errors = state.fieldErrors;
  const availablePacks = contentPacks.filter(
    (pack) => pack.status === "active" || pack.id === group?.contentPack?.id,
  );
  const isBase = group?.type === "base";

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor={`group-name-${group?.id ?? "new"}`} label="Nome" required error={firstError(errors, "name")}>
          <Input id={`group-name-${group?.id ?? "new"}`} name="name" defaultValue={group?.name ?? ""} required disabled={pending} {...fieldA11y(`group-name-${group?.id ?? "new"}`, false, firstError(errors, "name"))} />
        </Field>
        <Field htmlFor={`group-type-${group?.id ?? "new"}`} label="Tipo" required error={firstError(errors, "type")}>
          <Select
            id={`group-type-${group?.id ?? "new"}`}
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            disabled={pending || isBase}
            {...fieldA11y(`group-type-${group?.id ?? "new"}`, false, firstError(errors, "type"))}
          >
            {isBase ? <option value="base">Base</option> : null}
            <option value="expansion">Expansão</option>
            <option value="dlc">DLC</option>
            <option value="update">Atualização</option>
            <option value="mode">Modo</option>
            <option value="other">Outro</option>
          </Select>
          {isBase ? <input type="hidden" name="type" value="base" /> : null}
        </Field>
        <div className="sm:col-span-2">
          <Field htmlFor={`group-pack-${group?.id ?? "new"}`} label="Content Pack" error={firstError(errors, "contentPackId")}>
            <Select
              id={`group-pack-${group?.id ?? "new"}`}
              name="contentPackId"
              defaultValue={group?.contentPack?.id ?? ""}
              disabled={pending || type === "base"}
              {...fieldA11y(`group-pack-${group?.id ?? "new"}`, false, firstError(errors, "contentPackId"))}
            >
              <option value="">Sem associação</option>
              {availablePacks.map((pack) => (
                <option key={pack.id} value={pack.id}>{pack.name}{pack.status === "archived" ? " — arquivado" : ""}</option>
              ))}
            </Select>
            {type === "base" ? <input type="hidden" name="contentPackId" value="" /> : null}
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : group ? "Salvar grupo" : "Criar grupo"}</Button>
        <FormMessage status={state.status} message={state.message} />
      </div>
    </form>
  );
}
