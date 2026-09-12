"use client";

import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/shared/utils/slugify";

import type { AdminAchievementGroup } from "../../contracts";
import { createAchievementAction } from "../actions/achievement-actions";
import { initialCatalogFormState } from "../action-state";
import { Field, fieldA11y, firstError, FormMessage } from "./form-controls";

type AchievementCreateFormProps = Readonly<{
  gameId: string;
  achievementSetId: string;
  groups: readonly AdminAchievementGroup[];
}>;

export function AchievementCreateForm({ gameId, achievementSetId, groups }: AchievementCreateFormProps) {
  const action = useMemo(
    () => createAchievementAction.bind(null, gameId, achievementSetId),
    [achievementSetId, gameId],
  );
  const [state, formAction, pending] = useActionState(
    action,
    initialCatalogFormState,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="achievement-new-name" label="Nome" required error={firstError(errors, "name")}>
          <Input
            id="achievement-new-name"
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugWasEdited) setSlug(slugify(event.target.value));
            }}
            required
            disabled={pending}
            {...fieldA11y("achievement-new-name", false, firstError(errors, "name"))}
          />
        </Field>
        <Field htmlFor="achievement-new-slug" label="Slug" required error={firstError(errors, "slug")}>
          <Input
            id="achievement-new-slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugWasEdited(true);
            }}
            required
            disabled={pending}
            spellCheck={false}
            {...fieldA11y("achievement-new-slug", false, firstError(errors, "slug"))}
          />
        </Field>
        <Field htmlFor="achievement-new-type" label="Tipo" required error={firstError(errors, "achievementType")}>
          <Select id="achievement-new-type" name="achievementType" defaultValue="standard" disabled={pending} {...fieldA11y("achievement-new-type", false, firstError(errors, "achievementType"))}>
            <option value="bronze">Bronze</option>
            <option value="silver">Prata</option>
            <option value="gold">Ouro</option>
            <option value="platinum">Platina</option>
            <option value="standard">Padrão</option>
          </Select>
        </Field>
        <Field htmlFor="achievement-new-group" label="Grupo" required error={firstError(errors, "achievementGroupId")}>
          <Select id="achievement-new-group" name="achievementGroupId" defaultValue={groups[0]?.id ?? ""} disabled={pending} required {...fieldA11y("achievement-new-group", false, firstError(errors, "achievementGroupId"))}>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </Select>
        </Field>
        <Field htmlFor="achievement-new-points" label="Pontos" error={firstError(errors, "points")}>
          <Input id="achievement-new-points" name="points" type="number" min="0" step="1" disabled={pending} {...fieldA11y("achievement-new-points", false, firstError(errors, "points"))} />
        </Field>
        <Field htmlFor="achievement-new-status" label="Status" required error={firstError(errors, "status")}>
          <Select id="achievement-new-status" name="status" defaultValue="active" disabled={pending} {...fieldA11y("achievement-new-status", false, firstError(errors, "status"))}>
            <option value="active">Ativa</option>
            <option value="archived">Arquivada</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field htmlFor="achievement-new-description" label="Descrição" error={firstError(errors, "description")}>
            <Textarea id="achievement-new-description" name="description" disabled={pending} {...fieldA11y("achievement-new-description", false, firstError(errors, "description"))} />
          </Field>
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="isHidden" className="size-4" disabled={pending} />
        Conquista oculta
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending || groups.length === 0}>{pending ? "Adicionando…" : "Adicionar conquista"}</Button>
        <FormMessage status={state.status} message={state.message} />
      </div>
    </form>
  );
}
