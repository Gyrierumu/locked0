"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";

import { routes } from "@/config/routes";

import {
  applyAchievementPaste,
  archiveAchievement,
  createAchievement,
  createAchievementGroup,
  createAchievementSet,
  moveAchievement,
  previewAchievementPaste,
  reorderAchievementGroups,
  replaceAchievementSetReleases,
  restoreAchievement,
  updateAchievement,
  updateAchievementGroup,
  updateAchievementSet,
} from "../../server";
import {
  initialAchievementPasteFormState,
  type AchievementPasteFormState,
  type CatalogFormState,
} from "../action-state";
import {
  applyAchievementPasteSchema,
  catalogIdSchema,
  checkboxValue,
  createAchievementGroupSchema,
  createAchievementSchema,
  createAchievementSetSchema,
  previewAchievementPasteSchema,
  reorderAchievementGroupsSchema,
  replaceAchievementSetReleasesSchema,
  updateAchievementGroupSchema,
  updateAchievementSchema,
  updateAchievementSetSchema,
} from "../schemas/catalog-schemas";
import { achievementActionError } from "./achievement-action-error";

function validationError(error: ZodError): CatalogFormState {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]),
    ),
  );
  return { status: "error", message: "Revise os campos destacados.", fieldErrors };
}

function validIds(...ids: string[]): boolean {
  return ids.every((id) => catalogIdSchema.safeParse(id).success);
}

function invalidResource(): CatalogFormState {
  return { status: "error", message: "O recurso solicitado não foi encontrado." };
}

function refreshAchievementWorkspace(gameId: string, achievementSetId?: string): void {
  revalidatePath(routes.adminGames);
  revalidatePath(routes.adminGameAchievementSets(gameId));
  if (achievementSetId) {
    revalidatePath(routes.adminGameAchievementSet(gameId, achievementSetId));
  }
  refresh();
}

function setFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    key: formData.get("key"),
    regionCode: formData.get("regionCode"),
    status: formData.get("status"),
  };
}

export async function createAchievementSetAction(
  gameId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!validIds(gameId)) return invalidResource();
  const parsed = createAchievementSetSchema.safeParse({
    ...setFormData(formData),
    releaseIds: formData.getAll("releaseIds"),
  });
  if (!parsed.success) return validationError(parsed.error);

  let achievementSetId: string;
  try {
    ({ id: achievementSetId } = await createAchievementSet({ gameId, ...parsed.data }));
  } catch (error) {
    return achievementActionError(error);
  }
  revalidatePath(routes.adminGameAchievementSets(gameId));
  redirect(routes.adminGameAchievementSet(gameId, achievementSetId));
}

export async function updateAchievementSetAction(
  gameId: string,
  achievementSetId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  void _previousState;
  if (!validIds(gameId, achievementSetId)) return invalidResource();
  const parsed = updateAchievementSetSchema.safeParse(setFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateAchievementSet(gameId, achievementSetId, parsed.data);
    refreshAchievementWorkspace(gameId, achievementSetId);
    return { status: "success", message: "Metadados salvos." };
  } catch (error) {
    return achievementActionError(error);
  }
}

export async function replaceAchievementSetReleasesAction(
  gameId: string,
  achievementSetId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!validIds(gameId, achievementSetId)) return invalidResource();
  const parsed = replaceAchievementSetReleasesSchema.safeParse({
    releaseIds: formData.getAll("releaseIds"),
  });
  if (!parsed.success) return validationError(parsed.error);
  try {
    await replaceAchievementSetReleases(gameId, achievementSetId, parsed.data.releaseIds);
    refreshAchievementWorkspace(gameId, achievementSetId);
    return { status: "success", message: "Releases associadas atualizadas." };
  } catch (error) {
    return achievementActionError(error);
  }
}

function groupFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    type: formData.get("type"),
    contentPackId: formData.get("contentPackId"),
  };
}

export async function createAchievementGroupAction(
  gameId: string,
  achievementSetId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!validIds(gameId, achievementSetId)) return invalidResource();
  const parsed = createAchievementGroupSchema.safeParse(groupFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await createAchievementGroup(gameId, achievementSetId, parsed.data);
    refreshAchievementWorkspace(gameId, achievementSetId);
    return { status: "success", message: "Grupo criado." };
  } catch (error) {
    return achievementActionError(error);
  }
}

export async function updateAchievementGroupAction(
  gameId: string,
  achievementSetId: string,
  groupId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!validIds(gameId, achievementSetId, groupId)) return invalidResource();
  const parsed = updateAchievementGroupSchema.safeParse(groupFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateAchievementGroup(gameId, achievementSetId, groupId, parsed.data);
    refreshAchievementWorkspace(gameId, achievementSetId);
    return { status: "success", message: "Grupo atualizado." };
  } catch (error) {
    return achievementActionError(error);
  }
}

export async function reorderAchievementGroupsAction(
  gameId: string,
  achievementSetId: string,
  orderedGroupIds: readonly string[],
  _previousState: CatalogFormState,
): Promise<CatalogFormState> {
  void _previousState;
  if (!validIds(gameId, achievementSetId)) return invalidResource();
  const parsed = reorderAchievementGroupsSchema.safeParse({ orderedGroupIds });
  if (!parsed.success) return validationError(parsed.error);
  try {
    await reorderAchievementGroups(gameId, achievementSetId, parsed.data.orderedGroupIds);
    refreshAchievementWorkspace(gameId, achievementSetId);
    return { status: "success", message: "Ordem atualizada." };
  } catch (error) {
    return achievementActionError(error);
  }
}

function achievementFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    achievementType: formData.get("achievementType"),
    points: formData.get("points"),
    isHidden: checkboxValue(formData.get("isHidden")),
    status: formData.get("status"),
    achievementGroupId: formData.get("achievementGroupId"),
  };
}

export async function createAchievementAction(
  gameId: string,
  achievementSetId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!validIds(gameId, achievementSetId)) return invalidResource();
  const parsed = createAchievementSchema.safeParse(achievementFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await createAchievement(gameId, achievementSetId, parsed.data);
    refreshAchievementWorkspace(gameId, achievementSetId);
    return { status: "success", message: "Conquista adicionada." };
  } catch (error) {
    return achievementActionError(error);
  }
}

export async function updateAchievementAction(
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!validIds(gameId, achievementSetId, achievementId)) return invalidResource();
  const parsed = updateAchievementSchema.safeParse(achievementFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateAchievement(gameId, achievementSetId, achievementId, parsed.data);
    refreshAchievementWorkspace(gameId, achievementSetId);
    return { status: "success", message: "Conquista atualizada." };
  } catch (error) {
    return achievementActionError(error);
  }
}

export async function moveAchievementAction(
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  targetGroupId: string,
  _previousState: CatalogFormState,
): Promise<CatalogFormState> {
  void _previousState;
  if (!validIds(gameId, achievementSetId, achievementId, targetGroupId)) return invalidResource();
  try {
    await moveAchievement(gameId, achievementSetId, achievementId, targetGroupId);
    refreshAchievementWorkspace(gameId, achievementSetId);
    return { status: "success", message: "Conquista movida." };
  } catch (error) {
    return achievementActionError(error);
  }
}

async function achievementLifecycleAction(
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  restore: boolean,
): Promise<CatalogFormState> {
  if (!validIds(gameId, achievementSetId, achievementId)) return invalidResource();
  try {
    if (restore) await restoreAchievement(gameId, achievementSetId, achievementId);
    else await archiveAchievement(gameId, achievementSetId, achievementId);
    refreshAchievementWorkspace(gameId, achievementSetId);
    return {
      status: "success",
      message: restore ? "Conquista restaurada." : "Conquista arquivada.",
    };
  } catch (error) {
    return achievementActionError(error);
  }
}

export async function archiveAchievementAction(
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  _previousState: CatalogFormState,
): Promise<CatalogFormState> {
  void _previousState;
  return achievementLifecycleAction(gameId, achievementSetId, achievementId, false);
}

export async function restoreAchievementAction(
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  _previousState: CatalogFormState,
): Promise<CatalogFormState> {
  void _previousState;
  return achievementLifecycleAction(gameId, achievementSetId, achievementId, true);
}

function pasteFormData(formData: FormData) {
  return { targetGroupId: formData.get("targetGroupId"), text: formData.get("text") };
}

export async function previewAchievementPasteAction(
  gameId: string,
  achievementSetId: string,
  _previousState: AchievementPasteFormState = initialAchievementPasteFormState,
  formData: FormData,
): Promise<AchievementPasteFormState> {
  void _previousState;
  if (!validIds(gameId, achievementSetId)) return invalidResource();
  const parsed = previewAchievementPasteSchema.safeParse(pasteFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    const preview = await previewAchievementPaste({ gameId, achievementSetId, ...parsed.data });
    return {
      status: preview.canApply ? "success" : "error",
      message: preview.canApply
        ? "Preview pronto para aplicar."
        : "Revise as linhas sinalizadas.",
      preview,
      input: parsed.data,
    };
  } catch (error) {
    return achievementActionError(error);
  }
}

export async function applyAchievementPasteAction(
  gameId: string,
  achievementSetId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!validIds(gameId, achievementSetId)) return invalidResource();
  const parsed = applyAchievementPasteSchema.safeParse(pasteFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    const result = await applyAchievementPaste({ gameId, achievementSetId, ...parsed.data });
    refreshAchievementWorkspace(gameId, achievementSetId);
    return {
      status: "success",
      message: `${result.createdCount} conquistas adicionadas.`,
    };
  } catch (error) {
    return achievementActionError(error);
  }
}
