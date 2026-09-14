import "server-only";

import { StorageInfrastructureError } from "@/infrastructure/storage/errors";
import {
  createSignedStagingUpload,
  deleteFinalMediaObject,
  deleteStagingObject,
  downloadStagingObject,
  getStagingObjectMetadata,
  resolveFinalMediaPublicUrl,
  writeFinalMediaObject,
} from "@/infrastructure/storage/media-storage.server";

import type { MediaStoragePort } from "../application/ports/media-storage";
import { MediaStoragePortError } from "../application/ports/media-storage";

async function mapped<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof StorageInfrastructureError) {
      throw new MediaStoragePortError(error.kind);
    }
    throw new MediaStoragePortError("provider");
  }
}

export const supabaseMediaStorage: MediaStoragePort = {
  createSignedStagingUpload: (path) => mapped(() => createSignedStagingUpload(path)),
  getStagingObjectMetadata: (path) => mapped(() => getStagingObjectMetadata(path)),
  downloadStagingObject: (path) => mapped(() => downloadStagingObject(path)),
  writeFinalObject: (path, bytes, mimeType) =>
    mapped(() => writeFinalMediaObject(path, bytes, mimeType)),
  deleteStagingObject: (path) => mapped(() => deleteStagingObject(path)),
  deleteFinalObject: (path) => mapped(() => deleteFinalMediaObject(path)),
  resolvePublicUrl: resolveFinalMediaPublicUrl,
};
