"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";

import { routes } from "@/config/routes";
import {
  ForbiddenError,
  IdentityProviderError,
  UnauthenticatedError,
} from "@/modules/identity/contracts";

import {
  MediaError,
  type MediaUploadMetadata,
  type MediaUsageKind,
} from "../../contracts";
import {
  createMediaUpload,
  deleteUnusedMediaAsset,
  finalizeMediaUpload,
  restoreMediaAsset,
  retireMediaAsset,
  updateMediaAssetMetadata,
} from "../../server";
import type {
  MediaActionState,
  MediaFinalizeActionResult,
  MediaUploadActionResult,
} from "../action-state";
import {
  mediaAssetMetadataSchema,
  mediaIdSchema,
  mediaUploadMetadataSchema,
} from "../schemas/media-schemas";

function validationState(error: ZodError): MediaActionState {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]),
    ),
  );
  return { status: "error", message: "Revise os campos destacados.", fieldErrors };
}

const usageLabel: Readonly<Record<MediaUsageKind, string>> = {
  game_cover: "Capa de jogo",
  game_hero: "Hero de jogo",
  platform_icon: "Icone de plataforma",
  achievement_icon: "Icone de achievement",
  guide_image: "Imagem em Guide",
};

function messageFor(error: unknown): string {
  if (error instanceof MediaError) {
    if (error.code === "MEDIA_ASSET_IN_USE" && error.usages?.length) {
      const usages = error.usages
        .map(
          (usage) =>
            `- ${usageLabel[usage.kind]}: ${usage.label}${usage.context ? ` (${usage.context})` : ""}`,
        )
        .join("\n");
      return `${error.message}\n\n${usages}\n\nSubstitua essas referencias primeiro.`;
    }
    return error.message;
  }
  if (error instanceof ForbiddenError) return "Voce nao tem permissao para realizar esta acao.";
  if (error instanceof UnauthenticatedError) return "Sua sessao expirou. Entre novamente.";
  if (error instanceof IdentityProviderError) return "Nao foi possivel validar sua sessao agora.";
  console.error("media_action_failure", { errorCategory: error instanceof Error ? error.name : "unknown" });
  return "Nao foi possivel concluir a operacao agora.";
}

export async function requestMediaUploadAction(input: unknown): Promise<MediaUploadActionResult> {
  const parsed = mediaUploadMetadataSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revise o arquivo e os metadados." };
  try {
    return { ok: true, ticket: await createMediaUpload(parsed.data) };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

export async function finalizeMediaUploadAction(
  assetId: string,
  input: MediaUploadMetadata,
): Promise<MediaFinalizeActionResult> {
  const parsedId = mediaIdSchema.safeParse(assetId);
  const parsed = mediaUploadMetadataSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return { ok: false, message: "O ticket de upload nao e valido." };
  }
  try {
    const asset = await finalizeMediaUpload(parsedId.data, parsed.data);
    revalidatePath(routes.adminMedia);
    return { ok: true, assetId: asset.id };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

function metadataFromFormData(formData: FormData) {
  return {
    scopeGameId: formData.get("scopeGameId"),
    sourceUrl: formData.get("sourceUrl"),
    credit: formData.get("credit"),
  };
}

export async function updateMediaAssetMetadataAction(
  assetId: string,
  _previousState: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  void _previousState;
  if (!mediaIdSchema.safeParse(assetId).success) {
    return { status: "error", message: "O asset solicitado nao foi encontrado." };
  }
  const parsed = mediaAssetMetadataSchema.safeParse(metadataFromFormData(formData));
  if (!parsed.success) return validationState(parsed.error);
  try {
    await updateMediaAssetMetadata(assetId, parsed.data);
    revalidatePath(routes.adminMedia);
    revalidatePath(routes.adminMediaAsset(assetId));
    return { status: "success", message: "Metadados atualizados." };
  } catch (error) {
    return { status: "error", message: messageFor(error) };
  }
}

async function lifecycleAction(
  assetId: string,
  operation: "retire" | "restore",
): Promise<MediaActionState> {
  if (!mediaIdSchema.safeParse(assetId).success) {
    return { status: "error", message: "O asset solicitado nao foi encontrado." };
  }
  try {
    if (operation === "retire") await retireMediaAsset(assetId);
    else await restoreMediaAsset(assetId);
    revalidatePath(routes.adminMedia);
    revalidatePath(routes.adminMediaAsset(assetId));
    return {
      status: "success",
      message: operation === "retire" ? "Asset retirado." : "Asset restaurado.",
    };
  } catch (error) {
    return { status: "error", message: messageFor(error) };
  }
}

export async function retireMediaAssetAction(assetId: string, _state: MediaActionState) {
  void _state;
  return lifecycleAction(assetId, "retire");
}

export async function restoreMediaAssetAction(assetId: string, _state: MediaActionState) {
  void _state;
  return lifecycleAction(assetId, "restore");
}

export async function deleteUnusedMediaAssetAction(
  assetId: string,
  _state: MediaActionState,
): Promise<MediaActionState> {
  void _state;
  if (!mediaIdSchema.safeParse(assetId).success) {
    return { status: "error", message: "O asset solicitado nao foi encontrado." };
  }
  try {
    await deleteUnusedMediaAsset(assetId);
  } catch (error) {
    return { status: "error", message: messageFor(error) };
  }
  revalidatePath(routes.adminMedia);
  redirect(`${routes.adminMedia}?notice=asset-deleted`);
}
