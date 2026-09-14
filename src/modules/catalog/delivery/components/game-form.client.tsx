"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/shared/utils/slugify";

import type { AdminGame } from "../../contracts";
import { createGameAction, updateGameAction } from "../actions/catalog-actions";
import { initialCatalogFormState } from "../action-state";
import { Field, fieldA11y, firstError, FormMessage } from "./form-controls";
import { useUnsavedChanges } from "./use-unsaved-changes.client";

type GameFormProps = Readonly<{
  game?: AdminGame;
  readOnly?: boolean;
}>;

export function GameForm({ game, readOnly = false }: GameFormProps) {
  const mode = game ? "edit" : "create";
  const action = useMemo(
    () => (game ? updateGameAction.bind(null, game.id) : createGameAction),
    [game],
  );
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  const [name, setName] = useState(game?.name ?? "");
  const [slug, setSlug] = useState(game?.slug ?? "");
  const [slugWasEdited, setSlugWasEdited] = useState(Boolean(game));
  const { dirty, markDirty, markClean } = useUnsavedChanges();

  useEffect(() => {
    if (state.status === "success") markClean();
  }, [state.status, markClean]);

  const disabled = pending || readOnly;
  const errors = state.fieldErrors;

  return (
    <form
      action={formAction}
      onInput={markDirty}
      className="space-y-6"
      aria-label={mode === "create" ? "Cadastrar jogo" : "Editar jogo"}
    >
      <Card className="p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor="name" label="Nome" required error={firstError(errors, "name")}>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                if (!slugWasEdited) setSlug(slugify(nextName));
              }}
              disabled={disabled}
              required
              autoFocus={mode === "create"}
              {...fieldA11y("name", false, firstError(errors, "name"))}
            />
          </Field>
          <Field
            htmlFor="slug"
            label="Slug"
            required
            description="Letras minúsculas, números e hífens."
            error={firstError(errors, "slug")}
          >
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugWasEdited(true);
              }}
              disabled={disabled}
              required
              spellCheck={false}
              {...fieldA11y("slug", true, firstError(errors, "slug"))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field htmlFor="summary" label="Resumo" error={firstError(errors, "summary")}>
              <Textarea
                id="summary"
                name="summary"
                defaultValue={game?.summary ?? ""}
                disabled={disabled}
                {...fieldA11y("summary", false, firstError(errors, "summary"))}
              />
            </Field>
          </div>
          <Field
            htmlFor="developerName"
            label="Developer"
            error={firstError(errors, "developerName")}
          >
            <Input
              id="developerName"
              name="developerName"
              defaultValue={game?.developerName ?? ""}
              disabled={disabled}
              {...fieldA11y("developerName", false, firstError(errors, "developerName"))}
            />
          </Field>
          <Field
            htmlFor="publisherName"
            label="Publisher"
            error={firstError(errors, "publisherName")}
          >
            <Input
              id="publisherName"
              name="publisherName"
              defaultValue={game?.publisherName ?? ""}
              disabled={disabled}
              {...fieldA11y("publisherName", false, firstError(errors, "publisherName"))}
            />
          </Field>
          <Field
            htmlFor="releaseDate"
            label="Data de lançamento"
            error={firstError(errors, "releaseDate")}
          >
            <Input
              id="releaseDate"
              name="releaseDate"
              type="date"
              defaultValue={game?.releaseDate ?? ""}
              disabled={disabled}
              {...fieldA11y("releaseDate", false, firstError(errors, "releaseDate"))}
            />
          </Field>
          {mode === "create" ? (
            <Field htmlFor="status" label="Status" required error={firstError(errors, "status")}>
              <Select
                id="status"
                name="status"
                defaultValue="active"
                disabled={disabled}
                {...fieldA11y("status", false, firstError(errors, "status"))}
              >
                <option value="active">Ativo</option>
                <option value="archived">Arquivado</option>
              </Select>
            </Field>
          ) : null}
        </div>
      </Card>

      {readOnly ? (
        <p className="text-sm text-muted-foreground">
          Seu perfil possui acesso somente para leitura deste catálogo.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={pending || (mode === "edit" && !dirty)}>
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Criar jogo"
                : "Salvar alterações"}
          </Button>
          <FormMessage status={state.status} message={state.message} />
        </div>
      )}
    </form>
  );
}
