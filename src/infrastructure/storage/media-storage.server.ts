import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/config/env.client";
import { getMediaStorageEnv, getMediaStorageNames } from "@/config/env.server";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin";

import { StorageInfrastructureError } from "./errors";

export type InfrastructureSignedUploadTarget = Readonly<{
  bucket: string;
  path: string;
  token: string;
}>;

export type InfrastructureStorageObjectMetadata = Readonly<{
  byteSize: number;
  contentType: string | null;
}>;

function failureKind(error: unknown): "missing" | "conflict" | "provider" {
  if (typeof error !== "object" || error === null) return "provider";
  const record = error as Record<string, unknown>;
  const status = Number(record.status ?? record.statusCode);
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
  if (status === 404 || message.includes("not found")) return "missing";
  if (status === 409 || message.includes("duplicate") || message.includes("already exists")) {
    return "conflict";
  }
  return "provider";
}

function storageError(error: unknown): StorageInfrastructureError {
  return new StorageInfrastructureError(failureKind(error));
}

export async function createSignedStagingUpload(
  path: string,
): Promise<InfrastructureSignedUploadTarget> {
  const { mediaStagingBucket } = getMediaStorageEnv();
  const { data, error } = await createSupabaseAdminClient()
    .storage
    .from(mediaStagingBucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.token) throw storageError(error);
  return { bucket: mediaStagingBucket, path: data.path, token: data.token };
}

export async function getStagingObjectMetadata(
  path: string,
): Promise<InfrastructureStorageObjectMetadata> {
  const { mediaStagingBucket } = getMediaStorageEnv();
  const { data, error } = await createSupabaseAdminClient()
    .storage
    .from(mediaStagingBucket)
    .info(path);
  if (error || !data) throw storageError(error);
  const metadata = data.metadata as Record<string, unknown> | undefined;
  const contentType = data.contentType ?? metadata?.mimetype ?? metadata?.contentType;
  return {
    byteSize: Number(data.size),
    contentType: typeof contentType === "string" ? contentType : null,
  };
}

export async function downloadStagingObject(path: string): Promise<Uint8Array> {
  const { mediaStagingBucket } = getMediaStorageEnv();
  const { data, error } = await createSupabaseAdminClient()
    .storage
    .from(mediaStagingBucket)
    .download(path);
  if (error || !data) throw storageError(error);
  return new Uint8Array(await data.arrayBuffer());
}

export async function writeFinalMediaObject(
  path: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<void> {
  const { mediaBucket } = getMediaStorageEnv();
  const { error } = await createSupabaseAdminClient()
    .storage
    .from(mediaBucket)
    .upload(path, bytes, {
      cacheControl: "31536000",
      contentType: mimeType,
      upsert: false,
    });
  if (error) throw storageError(error);
}

async function deleteObject(bucket: string, path: string): Promise<void> {
  const { error } = await createSupabaseAdminClient().storage.from(bucket).remove([path]);
  if (error) throw storageError(error);
}

export function deleteStagingObject(path: string): Promise<void> {
  return deleteObject(getMediaStorageEnv().mediaStagingBucket, path);
}

export function deleteFinalMediaObject(path: string): Promise<void> {
  return deleteObject(getMediaStorageEnv().mediaBucket, path);
}

export function resolveFinalMediaPublicUrl(path: string): string {
  const { mediaBucket } = getMediaStorageNames();
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return publicClient.storage.from(mediaBucket).getPublicUrl(path).data.publicUrl;
}
