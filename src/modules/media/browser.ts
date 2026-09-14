import type { MediaUploadTicket } from "./contracts";
import { uploadFileToSignedStagingTarget } from "@/infrastructure/storage/media-storage.client";

export function uploadMediaFile(ticket: MediaUploadTicket, file: File): Promise<void> {
  return uploadFileToSignedStagingTarget(ticket.upload, file);
}
