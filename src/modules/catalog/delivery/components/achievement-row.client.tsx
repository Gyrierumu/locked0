"use client";

import { useActionState, useMemo, useRef } from "react";
import { Save, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { AdminAchievement, AdminAchievementGroup } from "../../contracts";
import {
  archiveAchievementAction,
  restoreAchievementAction,
  updateAchievementAction,
} from "../actions/achievement-actions";
import { initialCatalogFormState, type CatalogFormState } from "../action-state";
import { Field, fieldA11y, firstError, FormMessage } from "./form-controls";
import { LifecycleAction } from "./lifecycle-action.client";
import { useRefreshAfterSuccess } from "./use-refresh-after-success.client";

type AchievementRowProps = Readonly<{
  achievement: AdminAchievement;
  groups: readonly AdminAchievementGroup[];
  gameId: string;
  achievementSetId: string;
  canManage: boolean;
  displayPosition: number;
}>;

const typeOptions = [
  ["bronze", "Bronze"],
  ["silver", "Prata"],
  ["gold", "Ouro"],
  ["platinum", "Platina"],
  ["standard", "Padrão"],
] as const;

export function AchievementRow({ achievement, groups, gameId, achievementSetId, canManage, displayPosition }: AchievementRowProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = `achievement-inline-${achievement.id}`;
  const action = useMemo(
    () => updateAchievementAction.bind(null, gameId, achievementSetId, achievement.id),
    [achievement.id, achievementSetId, gameId],
  );
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  const revisionKey = JSON.stringify([
    achievement.id,
    achievement.achievementGroupId,
    achievement.name,
    achievement.slug,
    achievement.description,
    achievement.achievementType,
    achievement.points,
    achievement.isHidden,
    achievement.status,
  ]);
  useRefreshAfterSuccess(state);

  if (!canManage) {
    return (
      <tr key={revisionKey} className="border-b border-border last:border-0">
        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{String(displayPosition).padStart(2, "0")}</td>
        <td className="px-3 py-3 font-medium">{achievement.name}</td>
        <td className="px-3 py-3 capitalize">{achievement.achievementType}</td>
        <td className="px-3 py-3">{achievement.isHidden ? "Sim" : "Não"}</td>
        <td className="px-3 py-3">{achievement.points ?? "—"}</td>
        <td className="px-3 py-3">{achievement.groupName}</td>
        <td className="px-3 py-3 capitalize">{achievement.status === "active" ? "Ativa" : "Arquivada"}</td>
        <td className="px-3 py-3" />
      </tr>
    );
  }

  return (
    <tr key={revisionKey} className="border-b border-border align-top last:border-0">
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
        <form id={formId} action={formAction} />
        {String(displayPosition).padStart(2, "0")}
      </td>
      <td className="min-w-56 px-2 py-2">
        <Input form={formId} name="name" defaultValue={achievement.name} disabled={pending} aria-label={`Nome de ${achievement.name}`} aria-invalid={state.fieldErrors?.name ? true : undefined} />
      </td>
      <td className="min-w-28 px-2 py-2">
        <Select form={formId} name="achievementType" defaultValue={achievement.achievementType} disabled={pending} aria-label={`Tipo de ${achievement.name}`} aria-invalid={state.fieldErrors?.achievementType ? true : undefined}>
          {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </td>
      <td className="px-3 py-4 text-center">
        <input form={formId} type="checkbox" name="isHidden" defaultChecked={achievement.isHidden} disabled={pending} className="size-4" aria-label={`Oculta: ${achievement.name}`} />
      </td>
      <td className="w-28 px-2 py-2">
        <Input form={formId} name="points" type="number" min="0" step="1" defaultValue={achievement.points ?? ""} disabled={pending} aria-label={`Pontos de ${achievement.name}`} aria-invalid={state.fieldErrors?.points ? true : undefined} />
      </td>
      <td className="min-w-40 px-2 py-2">
        <Select form={formId} name="achievementGroupId" defaultValue={achievement.achievementGroupId} disabled={pending} aria-label={`Grupo de ${achievement.name}`} aria-invalid={state.fieldErrors?.achievementGroupId ? true : undefined}>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </Select>
      </td>
      <td className="px-3 py-4 text-sm">{achievement.status === "active" ? "Ativa" : "Arquivada"}</td>
      <td className="px-2 py-2">
        <input form={formId} type="hidden" name="slug" value={achievement.slug} />
        <input form={formId} type="hidden" name="description" value={achievement.description ?? ""} />
        <input form={formId} type="hidden" name="status" value={achievement.status} />
        <div className="flex items-center gap-1">
          <Button form={formId} type="submit" variant="ghost" size="icon" disabled={pending} aria-label={`Salvar ${achievement.name}`} title="Salvar linha">
            <Save aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => dialogRef.current?.showModal()} aria-label={`Abrir detalhes de ${achievement.name}`} title="Abrir inspector">
            <Settings2 aria-hidden="true" />
          </Button>
        </div>
        <span className="sr-only" aria-live="polite">{state.message}</span>

        <dialog ref={dialogRef} aria-labelledby={`inspector-title-${achievement.id}`} className="fixed inset-y-0 right-0 left-auto m-0 h-dvh w-full max-w-xl border-l border-border bg-card p-0 text-foreground backdrop:bg-black/60 open:flex open:flex-col">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achievement</p>
              <h2 id={`inspector-title-${achievement.id}`} className="mt-1 text-lg font-semibold">{achievement.name}</h2>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => dialogRef.current?.close()} aria-label="Fechar inspector"><X aria-hidden="true" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <InspectorForm action={action} achievement={achievement} groups={groups} />
            <div className="mt-6 border-t border-border pt-5">
              <LifecycleAction
                action={(achievement.status === "active" ? archiveAchievementAction : restoreAchievementAction).bind(null, gameId, achievementSetId, achievement.id)}
                confirmMessage={`${achievement.status === "active" ? "Arquivar" : "Restaurar"} ${achievement.name}?`}
                label={achievement.status === "active" ? "Arquivar conquista" : "Restaurar conquista"}
                pendingLabel={achievement.status === "active" ? "Arquivando…" : "Restaurando…"}
                tone={achievement.status === "active" ? "destructive" : "outline"}
              />
            </div>
          </div>
        </dialog>
      </td>
    </tr>
  );
}

function InspectorForm({ action, achievement, groups }: Readonly<{
  action: (state: CatalogFormState, formData: FormData) => Promise<CatalogFormState>;
  achievement: AdminAchievement;
  groups: readonly AdminAchievementGroup[];
}>) {
  const [state, formAction, pending] = useActionState(action, initialCatalogFormState);
  useRefreshAfterSuccess(state);
  const errors = state.fieldErrors;
  return (
    <form action={formAction} className="space-y-4">
      <Field htmlFor={`inspector-name-${achievement.id}`} label="Nome" required error={firstError(errors, "name")}>
        <Input id={`inspector-name-${achievement.id}`} name="name" defaultValue={achievement.name} disabled={pending} required {...fieldA11y(`inspector-name-${achievement.id}`, false, firstError(errors, "name"))} />
      </Field>
      <Field htmlFor={`inspector-slug-${achievement.id}`} label="Slug" required error={firstError(errors, "slug")}>
        <Input id={`inspector-slug-${achievement.id}`} name="slug" defaultValue={achievement.slug} disabled={pending} required spellCheck={false} {...fieldA11y(`inspector-slug-${achievement.id}`, false, firstError(errors, "slug"))} />
      </Field>
      <Field htmlFor={`inspector-description-${achievement.id}`} label="Descrição" error={firstError(errors, "description")}>
        <Textarea id={`inspector-description-${achievement.id}`} name="description" defaultValue={achievement.description ?? ""} disabled={pending} {...fieldA11y(`inspector-description-${achievement.id}`, false, firstError(errors, "description"))} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor={`inspector-type-${achievement.id}`} label="Tipo" required error={firstError(errors, "achievementType")}>
          <Select id={`inspector-type-${achievement.id}`} name="achievementType" defaultValue={achievement.achievementType} disabled={pending} {...fieldA11y(`inspector-type-${achievement.id}`, false, firstError(errors, "achievementType"))}>
            {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        <Field htmlFor={`inspector-points-${achievement.id}`} label="Pontos" error={firstError(errors, "points")}>
          <Input id={`inspector-points-${achievement.id}`} name="points" type="number" min="0" step="1" defaultValue={achievement.points ?? ""} disabled={pending} {...fieldA11y(`inspector-points-${achievement.id}`, false, firstError(errors, "points"))} />
        </Field>
        <Field htmlFor={`inspector-group-${achievement.id}`} label="Grupo" required error={firstError(errors, "achievementGroupId")}>
          <Select id={`inspector-group-${achievement.id}`} name="achievementGroupId" defaultValue={achievement.achievementGroupId} disabled={pending} {...fieldA11y(`inspector-group-${achievement.id}`, false, firstError(errors, "achievementGroupId"))}>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </Select>
        </Field>
        <Field htmlFor={`inspector-status-${achievement.id}`} label="Status" required error={firstError(errors, "status")}>
          <Select id={`inspector-status-${achievement.id}`} name="status" defaultValue={achievement.status} disabled={pending} {...fieldA11y(`inspector-status-${achievement.id}`, false, firstError(errors, "status"))}>
            <option value="active">Ativa</option>
            <option value="archived">Arquivada</option>
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="isHidden" defaultChecked={achievement.isHidden} disabled={pending} className="size-4" /> Conquista oculta
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar detalhes"}</Button>
        <FormMessage status={state.status} message={state.message} />
      </div>
      <p className="text-xs text-muted-foreground">Metadados externos e ícone são preservados, mas não são editáveis nesta etapa.</p>
    </form>
  );
}
