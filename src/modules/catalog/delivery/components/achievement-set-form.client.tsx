"use client";

import { useActionState, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type {
  AdminAchievementSetListItem,
  AdminGameRelease,
} from "../../contracts";
import {
  createAchievementSetAction,
  replaceAchievementSetReleasesAction,
  updateAchievementSetAction,
} from "../actions/achievement-actions";
import { initialCatalogFormState } from "../action-state";
import { Field, fieldA11y, firstError, FormMessage } from "./form-controls";
import { useRefreshAfterSuccess } from "./use-refresh-after-success.client";
import { useUnsavedChanges } from "./use-unsaved-changes.client";

type AchievementSetFormProps = Readonly<{
  gameId: string;
  releases: readonly AdminGameRelease[];
  achievementSet?: AdminAchievementSetListItem;
}>;

export function AchievementSetForm({ gameId, releases, achievementSet }: AchievementSetFormProps) {
  const action = useMemo(
    () =>
      achievementSet
        ? updateAchievementSetAction.bind(null, gameId, achievementSet.id)
        : createAchievementSetAction.bind(null, gameId),
    [achievementSet, gameId],
  );
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  const { dirty, markDirty, markClean } = useUnsavedChanges();
  const errors = state.fieldErrors;
  const revisionKey = JSON.stringify([
    achievementSet?.id,
    achievementSet?.name,
    achievementSet?.key,
    achievementSet?.regionCode,
    achievementSet?.status,
  ]);
  useRefreshAfterSuccess(state);

  useEffect(() => {
    if (state.status === "success") markClean();
  }, [markClean, state]);

  return (
    <form key={revisionKey} action={formAction} onInput={markDirty} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor={`set-name-${achievementSet?.id ?? "new"}`} label="Nome" required error={firstError(errors, "name")}>
          <Input
            id={`set-name-${achievementSet?.id ?? "new"}`}
            name="name"
            defaultValue={achievementSet?.name ?? ""}
            placeholder="Elden Ring — PS5"
            disabled={pending}
            required
            {...fieldA11y(`set-name-${achievementSet?.id ?? "new"}`, false, firstError(errors, "name"))}
          />
        </Field>
        <Field
          htmlFor={`set-key-${achievementSet?.id ?? "new"}`}
          label="Chave interna"
          required
          description="Única dentro do jogo, como ps5-global."
          error={firstError(errors, "key")}
        >
          <Input
            id={`set-key-${achievementSet?.id ?? "new"}`}
            name="key"
            defaultValue={achievementSet?.key ?? ""}
            placeholder="ps5-global"
            disabled={pending}
            spellCheck={false}
            required
            {...fieldA11y(`set-key-${achievementSet?.id ?? "new"}`, true, firstError(errors, "key"))}
          />
        </Field>
        <Field htmlFor={`set-region-${achievementSet?.id ?? "new"}`} label="Região" error={firstError(errors, "regionCode")}>
          <Input
            id={`set-region-${achievementSet?.id ?? "new"}`}
            name="regionCode"
            defaultValue={achievementSet?.regionCode ?? ""}
            placeholder="Opcional"
            disabled={pending}
            {...fieldA11y(`set-region-${achievementSet?.id ?? "new"}`, false, firstError(errors, "regionCode"))}
          />
        </Field>
        <Field htmlFor={`set-status-${achievementSet?.id ?? "new"}`} label="Status" required error={firstError(errors, "status")}>
          <Select
            id={`set-status-${achievementSet?.id ?? "new"}`}
            name="status"
            defaultValue={achievementSet?.status ?? "active"}
            disabled={pending}
          >
            <option value="active">Ativa</option>
            <option value="archived">Arquivada</option>
          </Select>
        </Field>
      </div>

      {!achievementSet ? (
        <fieldset className="rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">Releases associadas</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {releases.map((release) => (
              <label key={release.id} className="flex items-start gap-3 text-sm">
                <input className="mt-0.5 size-4" type="checkbox" name="releaseIds" value={release.id} disabled={pending} />
                <span>
                  <span className="block font-medium">{release.name ?? release.key}</span>
                  <span className="text-xs text-muted-foreground">{release.platform.name}</span>
                </span>
              </label>
            ))}
            {releases.length === 0 ? <p className="text-sm text-muted-foreground">Este jogo ainda não possui releases.</p> : null}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending || (Boolean(achievementSet) && !dirty)}>
          {pending ? "Salvando…" : achievementSet ? "Salvar metadados" : "Criar lista"}
        </Button>
        <FormMessage status={state.status} message={state.message} />
      </div>
    </form>
  );
}

export function AchievementSetReleaseForm({
  gameId,
  releases,
  achievementSet,
}: Required<AchievementSetFormProps>) {
  const action = useMemo(
    () => replaceAchievementSetReleasesAction.bind(null, gameId, achievementSet.id),
    [achievementSet.id, gameId],
  );
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  const linkedIds = new Set(achievementSet.linkedReleases.map((release) => release.id));

  return (
    <form action={formAction} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium">Releases associadas</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {releases.map((release) => (
            <label key={release.id} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <input
                className="mt-0.5 size-4"
                type="checkbox"
                name="releaseIds"
                value={release.id}
                defaultChecked={linkedIds.has(release.id)}
                disabled={pending}
              />
              <span>
                <span className="block font-medium">{release.name ?? release.key}</span>
                <span className="text-xs text-muted-foreground">{release.platform.name}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar associações"}</Button>
        <FormMessage status={state.status} message={state.message} />
      </div>
    </form>
  );
}
