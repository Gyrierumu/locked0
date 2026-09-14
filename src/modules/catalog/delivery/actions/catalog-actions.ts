"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";

import { routes } from "@/config/routes";
import { ForbiddenError, UnauthenticatedError } from "@/modules/identity/contracts";
import { MediaError } from "@/modules/media/contracts";
import { getSelectableMediaAsset } from "@/modules/media/server";

import { CatalogError } from "../../domain/errors";
import {
  archiveContentPack,
  archiveGame,
  clearGameCover,
  clearGameHero,
  clearPlatformIcon,
  createContentPack,
  createGame,
  createGameRelease,
  createPlatform,
  restoreContentPack,
  restoreGame,
  setGameCover,
  setGameHero,
  setPlatformActive,
  setPlatformIcon,
  updateContentPack,
  updateGameMetadata,
  updateGameRelease,
  updatePlatform,
} from "../../server";
import type { CatalogFormState } from "../action-state";
import {
  catalogIdSchema,
  checkboxValue,
  createContentPackSchema,
  createGameReleaseSchema,
  createGameSchema,
  createPlatformSchema,
  updateContentPackSchema,
  updateGameReleaseSchema,
  updateGameSchema,
  updatePlatformSchema,
} from "../schemas/catalog-schemas";

function validationError(error: ZodError): CatalogFormState {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]),
    ),
  );
  return {
    status: "error",
    message: "Revise os campos destacados.",
    fieldErrors,
  };
}

function actionError(error: unknown): CatalogFormState {
  if (error instanceof CatalogError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof MediaError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof ForbiddenError || error instanceof UnauthenticatedError) {
    return { status: "error", message: "Você não tem permissão para realizar esta ação." };
  }

  console.error(error);
  return {
    status: "error",
    message: "Não foi possível concluir a operação agora. Tente novamente.",
  };
}

function invalidResource(): CatalogFormState {
  return { status: "error", message: "O recurso solicitado não foi encontrado." };
}

function gameFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    summary: formData.get("summary"),
    developerName: formData.get("developerName"),
    publisherName: formData.get("publisherName"),
    releaseDate: formData.get("releaseDate"),
  };
}

export async function createGameAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const parsed = createGameSchema.safeParse({
    ...gameFormData(formData),
    status: formData.get("status"),
  });
  if (!parsed.success) return validationError(parsed.error);

  let gameId: string;
  try {
    ({ id: gameId } = await createGame(parsed.data));
  } catch (error) {
    return actionError(error);
  }

  revalidatePath(routes.adminGames);
  redirect(routes.adminGame(gameId));
}

export async function updateGameAction(
  gameId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  void _previousState;
  if (!catalogIdSchema.safeParse(gameId).success) return invalidResource();
  const parsed = updateGameSchema.safeParse(gameFormData(formData));
  if (!parsed.success) return validationError(parsed.error);

  try {
    await updateGameMetadata(gameId, parsed.data);
    revalidatePath(routes.adminGames);
    revalidatePath(routes.adminGame(gameId));
    refresh();
    return { status: "success", message: "Alterações salvas." };
  } catch (error) {
    return actionError(error);
  }
}

export async function archiveGameAction(
  gameId: string,
  _previousState: CatalogFormState,
): Promise<CatalogFormState> {
  void _previousState;
  if (!catalogIdSchema.safeParse(gameId).success) return invalidResource();
  try {
    await archiveGame(gameId);
    revalidatePath(routes.adminGames);
    revalidatePath(routes.adminGame(gameId));
    refresh();
    return { status: "success", message: "Jogo arquivado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function restoreGameAction(
  gameId: string,
  _previousState: CatalogFormState,
): Promise<CatalogFormState> {
  void _previousState;
  if (!catalogIdSchema.safeParse(gameId).success) return invalidResource();
  try {
    await restoreGame(gameId);
    revalidatePath(routes.adminGames);
    revalidatePath(routes.adminGame(gameId));
    refresh();
    return { status: "success", message: "Jogo restaurado." };
  } catch (error) {
    return actionError(error);
  }
}

async function assignGameMedia(
  gameId: string,
  assetId: string | null,
  slot: "cover" | "hero",
): Promise<CatalogFormState> {
  if (
    !catalogIdSchema.safeParse(gameId).success ||
    (assetId !== null && !catalogIdSchema.safeParse(assetId).success)
  ) {
    return invalidResource();
  }
  try {
    if (assetId === null) {
      if (slot === "cover") await clearGameCover(gameId);
      else await clearGameHero(gameId);
    } else {
      const asset = await getSelectableMediaAsset(assetId);
      if (slot === "cover") await setGameCover(gameId, asset.storagePath);
      else await setGameHero(gameId, asset.storagePath);
    }
    revalidatePath(routes.adminGames);
    revalidatePath(routes.adminGame(gameId));
    return { status: "success", message: slot === "cover" ? "Cover atualizado." : "Hero atualizado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function setGameCoverAction(gameId: string, assetId: string) {
  return assignGameMedia(gameId, assetId, "cover");
}

export async function clearGameCoverAction(gameId: string) {
  return assignGameMedia(gameId, null, "cover");
}

export async function setGameHeroAction(gameId: string, assetId: string) {
  return assignGameMedia(gameId, assetId, "hero");
}

export async function clearGameHeroAction(gameId: string) {
  return assignGameMedia(gameId, null, "hero");
}

function platformFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    slug: formData.get("slug"),
    sortOrder: formData.get("sortOrder"),
    isActive: checkboxValue(formData.get("isActive")),
  };
}

export async function createPlatformAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const parsed = createPlatformSchema.safeParse(platformFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await createPlatform(parsed.data);
    revalidatePath(routes.adminPlatforms);
    return { status: "success", message: "Plataforma criada." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updatePlatformAction(
  platformId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  void _previousState;
  if (!catalogIdSchema.safeParse(platformId).success) return invalidResource();
  const parsed = updatePlatformSchema.safeParse(platformFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updatePlatform(platformId, parsed.data);
    revalidatePath(routes.adminPlatforms);
    return { status: "success", message: "Plataforma atualizada." };
  } catch (error) {
    return actionError(error);
  }
}

export async function setPlatformActiveAction(
  platformId: string,
  isActive: boolean,
  _previousState: CatalogFormState,
): Promise<CatalogFormState> {
  void _previousState;
  if (!catalogIdSchema.safeParse(platformId).success) return invalidResource();
  try {
    await setPlatformActive(platformId, isActive);
    revalidatePath(routes.adminPlatforms);
    return {
      status: "success",
      message: isActive ? "Plataforma reativada." : "Plataforma desativada.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function setPlatformIconAction(
  platformId: string,
  assetId: string,
): Promise<CatalogFormState> {
  if (!catalogIdSchema.safeParse(platformId).success || !catalogIdSchema.safeParse(assetId).success) {
    return invalidResource();
  }
  try {
    const asset = await getSelectableMediaAsset(assetId);
    await setPlatformIcon(platformId, asset.storagePath);
    revalidatePath(routes.adminPlatforms);
    return { status: "success", message: "Icone atualizado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function clearPlatformIconAction(platformId: string): Promise<CatalogFormState> {
  if (!catalogIdSchema.safeParse(platformId).success) return invalidResource();
  try {
    await clearPlatformIcon(platformId);
    revalidatePath(routes.adminPlatforms);
    return { status: "success", message: "Icone removido." };
  } catch (error) {
    return actionError(error);
  }
}

function releaseFormData(formData: FormData) {
  return {
    platformId: formData.get("platformId"),
    key: formData.get("key"),
    name: formData.get("name"),
    regionCode: formData.get("regionCode"),
    releaseDate: formData.get("releaseDate"),
  };
}

export async function createGameReleaseAction(
  gameId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!catalogIdSchema.safeParse(gameId).success) return invalidResource();
  const parsed = createGameReleaseSchema.safeParse(releaseFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await createGameRelease(gameId, parsed.data);
    revalidatePath(routes.adminGames);
    revalidatePath(routes.adminGameReleases(gameId));
    refresh();
    return { status: "success", message: "Release adicionada." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateGameReleaseAction(
  gameId: string,
  releaseId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (
    !catalogIdSchema.safeParse(gameId).success ||
    !catalogIdSchema.safeParse(releaseId).success
  ) {
    return invalidResource();
  }
  const parsed = updateGameReleaseSchema.safeParse(releaseFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateGameRelease(gameId, releaseId, parsed.data);
    revalidatePath(routes.adminGameReleases(gameId));
    return { status: "success", message: "Release atualizada." };
  } catch (error) {
    return actionError(error);
  }
}

function contentPackFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    type: formData.get("type"),
    description: formData.get("description"),
    releaseDate: formData.get("releaseDate"),
    status: formData.get("status"),
  };
}

export async function createContentPackAction(
  gameId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!catalogIdSchema.safeParse(gameId).success) return invalidResource();
  const parsed = createContentPackSchema.safeParse(contentPackFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await createContentPack(gameId, parsed.data);
    revalidatePath(routes.adminGames);
    revalidatePath(routes.adminGameContentPacks(gameId));
    refresh();
    return { status: "success", message: "Conteúdo adicional criado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateContentPackAction(
  gameId: string,
  contentPackId: string,
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (
    !catalogIdSchema.safeParse(gameId).success ||
    !catalogIdSchema.safeParse(contentPackId).success
  ) {
    return invalidResource();
  }
  const parsed = updateContentPackSchema.safeParse(contentPackFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateContentPack(gameId, contentPackId, parsed.data);
    revalidatePath(routes.adminGameContentPacks(gameId));
    return { status: "success", message: "Conteúdo atualizado." };
  } catch (error) {
    return actionError(error);
  }
}

async function contentPackLifecycleAction(
  gameId: string,
  contentPackId: string,
  restore: boolean,
): Promise<CatalogFormState> {
  if (
    !catalogIdSchema.safeParse(gameId).success ||
    !catalogIdSchema.safeParse(contentPackId).success
  ) {
    return invalidResource();
  }
  try {
    if (restore) await restoreContentPack(gameId, contentPackId);
    else await archiveContentPack(gameId, contentPackId);
    revalidatePath(routes.adminGameContentPacks(gameId));
    return {
      status: "success",
      message: restore ? "Conteúdo restaurado." : "Conteúdo arquivado.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function archiveContentPackAction(
  gameId: string,
  contentPackId: string,
  _previousState: CatalogFormState,
): Promise<CatalogFormState> {
  void _previousState;
  return contentPackLifecycleAction(gameId, contentPackId, false);
}

export async function restoreContentPackAction(
  gameId: string,
  contentPackId: string,
  _previousState: CatalogFormState,
): Promise<CatalogFormState> {
  void _previousState;
  return contentPackLifecycleAction(gameId, contentPackId, true);
}
