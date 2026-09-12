"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/shared/utils/slugify";

import type { AdminPlatform } from "../../contracts";
import { createPlatformAction, updatePlatformAction } from "../actions/catalog-actions";
import { initialCatalogFormState } from "../action-state";
import { Field, fieldA11y, firstError, FormMessage } from "./form-controls";
import { useUnsavedChanges } from "./use-unsaved-changes.client";

type PlatformFormProps = Readonly<{
  platform?: AdminPlatform;
}>;

export function PlatformForm({ platform }: PlatformFormProps) {
  const action = useMemo(
    () => (platform ? updatePlatformAction.bind(null, platform.id) : createPlatformAction),
    [platform],
  );
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  const [name, setName] = useState(platform?.name ?? "");
  const [slug, setSlug] = useState(platform?.slug ?? "");
  const [slugWasEdited, setSlugWasEdited] = useState(Boolean(platform));
  const { dirty, markDirty, markClean } = useUnsavedChanges();
  const errors = state.fieldErrors;

  useEffect(() => {
    if (state.status !== "success") return;
    markClean();
  }, [markClean, platform, state.status]);

  return (
    <form action={formAction} onInput={markDirty} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor={`platform-name-${platform?.id ?? "new"}`}
          label="Nome"
          required
          error={firstError(errors, "name")}
        >
          <Input
            id={`platform-name-${platform?.id ?? "new"}`}
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
              `platform-name-${platform?.id ?? "new"}`,
              false,
              firstError(errors, "name"),
            )}
          />
        </Field>
        <Field
          htmlFor={`short-name-${platform?.id ?? "new"}`}
          label="Nome curto"
          required
          error={firstError(errors, "shortName")}
        >
          <Input
            id={`short-name-${platform?.id ?? "new"}`}
            name="shortName"
            defaultValue={platform?.shortName ?? ""}
            disabled={pending}
            required
            {...fieldA11y(
              `short-name-${platform?.id ?? "new"}`,
              false,
              firstError(errors, "shortName"),
            )}
          />
        </Field>
        <Field
          htmlFor={`platform-slug-${platform?.id ?? "new"}`}
          label="Slug"
          required
          description="Identificador global da plataforma."
          error={firstError(errors, "slug")}
        >
          <Input
            id={`platform-slug-${platform?.id ?? "new"}`}
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
              `platform-slug-${platform?.id ?? "new"}`,
              true,
              firstError(errors, "slug"),
            )}
          />
        </Field>
        <Field
          htmlFor={`sort-order-${platform?.id ?? "new"}`}
          label="Ordem"
          description="Número menor aparece primeiro."
          error={firstError(errors, "sortOrder")}
        >
          <Input
            id={`sort-order-${platform?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            min={0}
            step={1}
            defaultValue={platform?.sortOrder ?? 0}
            disabled={pending}
            {...fieldA11y(
              `sort-order-${platform?.id ?? "new"}`,
              true,
              firstError(errors, "sortOrder"),
            )}
          />
        </Field>
        {platform ? (
          <input type="hidden" name="isActive" value={platform.isActive ? "true" : "false"} />
        ) : (
          <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked
              disabled={pending}
              className="size-4 rounded border-input accent-primary"
            />
            Plataforma ativa
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending || (Boolean(platform) && !dirty)}>
          {pending ? "Salvando…" : platform ? "Salvar plataforma" : "Criar plataforma"}
        </Button>
        <FormMessage status={state.status} message={state.message} />
      </div>
    </form>
  );
}
