"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/shared/utils/slugify";

import type { AdminContentPack } from "../../contracts";
import {
  createContentPackAction,
  updateContentPackAction,
} from "../actions/catalog-actions";
import { initialCatalogFormState } from "../action-state";
import { Field, fieldA11y, firstError, FormMessage } from "./form-controls";
import { useUnsavedChanges } from "./use-unsaved-changes.client";

type ContentPackFormProps = Readonly<{
  contentPack?: AdminContentPack;
  gameId: string;
}>;

export function ContentPackForm({ contentPack, gameId }: ContentPackFormProps) {
  const action = useMemo(
    () =>
      contentPack
        ? updateContentPackAction.bind(null, gameId, contentPack.id)
        : createContentPackAction.bind(null, gameId),
    [contentPack, gameId],
  );
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  const [name, setName] = useState(contentPack?.name ?? "");
  const [slug, setSlug] = useState(contentPack?.slug ?? "");
  const [slugWasEdited, setSlugWasEdited] = useState(Boolean(contentPack));
  const { dirty, markDirty, markClean } = useUnsavedChanges();
  const errors = state.fieldErrors;

  useEffect(() => {
    if (state.status !== "success") return;
    markClean();
  }, [contentPack, markClean, state.status]);

  return (
    <form action={formAction} onInput={markDirty} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor={`pack-name-${contentPack?.id ?? "new"}`}
          label="Nome"
          required
          error={firstError(errors, "name")}
        >
          <Input
            id={`pack-name-${contentPack?.id ?? "new"}`}
            name="name"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slugWasEdited) setSlug(slugify(nextName));
            }}
            disabled={pending}
            required
            {...fieldA11y(
              `pack-name-${contentPack?.id ?? "new"}`,
              false,
              firstError(errors, "name"),
            )}
          />
        </Field>
        <Field
          htmlFor={`pack-slug-${contentPack?.id ?? "new"}`}
          label="Slug"
          required
          description="Único dentro deste jogo."
          error={firstError(errors, "slug")}
        >
          <Input
            id={`pack-slug-${contentPack?.id ?? "new"}`}
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugWasEdited(true);
            }}
            disabled={pending}
            required
            spellCheck={false}
            {...fieldA11y(
              `pack-slug-${contentPack?.id ?? "new"}`,
              true,
              firstError(errors, "slug"),
            )}
          />
        </Field>
        <Field
          htmlFor={`pack-type-${contentPack?.id ?? "new"}`}
          label="Tipo"
          required
          error={firstError(errors, "type")}
        >
          <Select
            id={`pack-type-${contentPack?.id ?? "new"}`}
            name="type"
            defaultValue={contentPack?.type ?? "expansion"}
            disabled={pending}
            {...fieldA11y(
              `pack-type-${contentPack?.id ?? "new"}`,
              false,
              firstError(errors, "type"),
            )}
          >
            <option value="expansion">Expansão</option>
            <option value="dlc">DLC</option>
            <option value="update">Atualização</option>
            <option value="mode">Modo</option>
            <option value="other">Outro</option>
          </Select>
        </Field>
        <Field
          htmlFor={`pack-date-${contentPack?.id ?? "new"}`}
          label="Data de lançamento"
          error={firstError(errors, "releaseDate")}
        >
          <Input
            id={`pack-date-${contentPack?.id ?? "new"}`}
            name="releaseDate"
            type="date"
            defaultValue={contentPack?.releaseDate ?? ""}
            disabled={pending}
            {...fieldA11y(
              `pack-date-${contentPack?.id ?? "new"}`,
              false,
              firstError(errors, "releaseDate"),
            )}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field
            htmlFor={`pack-description-${contentPack?.id ?? "new"}`}
            label="Descrição"
            error={firstError(errors, "description")}
          >
            <Textarea
              id={`pack-description-${contentPack?.id ?? "new"}`}
              name="description"
              defaultValue={contentPack?.description ?? ""}
              disabled={pending}
              {...fieldA11y(
                `pack-description-${contentPack?.id ?? "new"}`,
                false,
                firstError(errors, "description"),
              )}
            />
          </Field>
        </div>
        {contentPack ? (
          <input type="hidden" name="status" value={contentPack.status} />
        ) : (
          <Field
            htmlFor="pack-status-new"
            label="Status"
            required
            error={firstError(errors, "status")}
          >
            <Select
              id="pack-status-new"
              name="status"
              defaultValue="active"
              disabled={pending}
              {...fieldA11y("pack-status-new", false, firstError(errors, "status"))}
            >
              <option value="active">Ativo</option>
              <option value="archived">Arquivado</option>
            </Select>
          </Field>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending || (Boolean(contentPack) && !dirty)}>
          {pending ? "Salvando…" : contentPack ? "Salvar conteúdo" : "Adicionar conteúdo"}
        </Button>
        <FormMessage status={state.status} message={state.message} />
      </div>
    </form>
  );
}
