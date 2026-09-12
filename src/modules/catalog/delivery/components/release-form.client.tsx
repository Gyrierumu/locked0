"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type { AdminGameRelease, AdminPlatform } from "../../contracts";
import {
  createGameReleaseAction,
  updateGameReleaseAction,
} from "../actions/catalog-actions";
import { initialCatalogFormState } from "../action-state";
import { Field, fieldA11y, firstError, FormMessage } from "./form-controls";
import { useUnsavedChanges } from "./use-unsaved-changes.client";

type ReleaseFormProps = Readonly<{
  gameId: string;
  platforms: readonly AdminPlatform[];
  release?: AdminGameRelease;
}>;

export function ReleaseForm({ gameId, platforms, release }: ReleaseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = useMemo(
    () =>
      release
        ? updateGameReleaseAction.bind(null, gameId, release.id)
        : createGameReleaseAction.bind(null, gameId),
    [gameId, release],
  );
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  const { dirty, markDirty, markClean } = useUnsavedChanges();
  const errors = state.fieldErrors;
  const availablePlatforms = platforms.filter(
    (platform) => platform.isActive || platform.id === release?.platform.id,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    markClean();
    if (!release) formRef.current?.reset();
  }, [markClean, release, state.status]);

  return (
    <form ref={formRef} action={formAction} onInput={markDirty} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor={`platformId-${release?.id ?? "new"}`}
          label="Plataforma"
          required
          error={firstError(errors, "platformId")}
        >
          <Select
            id={`platformId-${release?.id ?? "new"}`}
            name="platformId"
            defaultValue={release?.platform.id ?? ""}
            disabled={pending}
            required
            {...fieldA11y(
              `platformId-${release?.id ?? "new"}`,
              false,
              firstError(errors, "platformId"),
            )}
          >
            <option value="" disabled>
              Selecione uma plataforma
            </option>
            {availablePlatforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name} ({platform.shortName})
                {!platform.isActive ? " — inativa" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor={`release-key-${release?.id ?? "new"}`}
          label="Chave interna"
          required
          description="Estável dentro do jogo, como ps5-global."
          error={firstError(errors, "key")}
        >
          <Input
            id={`release-key-${release?.id ?? "new"}`}
            name="key"
            defaultValue={release?.key ?? ""}
            disabled={pending}
            required
            spellCheck={false}
            {...fieldA11y(
              `release-key-${release?.id ?? "new"}`,
              true,
              firstError(errors, "key"),
            )}
          />
        </Field>
        <Field
          htmlFor={`release-name-${release?.id ?? "new"}`}
          label="Nome"
          error={firstError(errors, "name")}
        >
          <Input
            id={`release-name-${release?.id ?? "new"}`}
            name="name"
            defaultValue={release?.name ?? ""}
            disabled={pending}
            placeholder="PS5 Global"
            {...fieldA11y(
              `release-name-${release?.id ?? "new"}`,
              false,
              firstError(errors, "name"),
            )}
          />
        </Field>
        <Field
          htmlFor={`regionCode-${release?.id ?? "new"}`}
          label="Região"
          description="Opcional; vazio significa global ou não especificada."
          error={firstError(errors, "regionCode")}
        >
          <Input
            id={`regionCode-${release?.id ?? "new"}`}
            name="regionCode"
            defaultValue={release?.regionCode ?? ""}
            disabled={pending}
            placeholder="Global"
            {...fieldA11y(
              `regionCode-${release?.id ?? "new"}`,
              true,
              firstError(errors, "regionCode"),
            )}
          />
        </Field>
        <Field
          htmlFor={`release-date-${release?.id ?? "new"}`}
          label="Data de lançamento"
          error={firstError(errors, "releaseDate")}
        >
          <Input
            id={`release-date-${release?.id ?? "new"}`}
            name="releaseDate"
            type="date"
            defaultValue={release?.releaseDate ?? ""}
            disabled={pending}
            {...fieldA11y(
              `release-date-${release?.id ?? "new"}`,
              false,
              firstError(errors, "releaseDate"),
            )}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending || (Boolean(release) && !dirty)}>
          {pending ? "Salvando…" : release ? "Salvar release" : "Adicionar release"}
        </Button>
        <FormMessage status={state.status} message={state.message} />
      </div>
    </form>
  );
}

