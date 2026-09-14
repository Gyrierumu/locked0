import { createSupabaseBrowserClient } from "@/infrastructure/supabase/browser";

export type BrowserSignedUploadTarget = Readonly<{
  bucket: string;
  path: string;
  token: string;
}>;

export async function uploadFileToSignedStagingTarget(
  target: BrowserSignedUploadTarget,
  file: File,
): Promise<void> {
  const { error } = await createSupabaseBrowserClient()
    .storage
    .from(target.bucket)
    .uploadToSignedUrl(target.path, target.token, file, {
      cacheControl: "0",
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error("Nao foi possivel enviar o arquivo ao staging privado.");
}
