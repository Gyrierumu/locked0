import { z } from "zod";

import { MEDIA_ALLOWED_MIME_TYPES, MEDIA_PAGE_SIZE, MAX_IMAGE_BYTES } from "../../contracts";

export const mediaIdSchema = z.uuid();

const optionalUuid = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.uuid().nullable(),
);

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().max(maximum).nullable(),
  );

const httpUrl = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z
    .url()
    .refine((value) => value.startsWith("http://") || value.startsWith("https://"))
    .nullable(),
);

export const mediaUploadMetadataSchema = z.object({
  originalFilename: z.string().min(1).max(255),
  declaredMimeType: z.enum(MEDIA_ALLOWED_MIME_TYPES),
  declaredByteSize: z.number().int().positive().max(MAX_IMAGE_BYTES),
  scopeGameId: optionalUuid,
  sourceUrl: httpUrl,
  credit: optionalText(500),
});

export const mediaAssetMetadataSchema = z.object({
  scopeGameId: optionalUuid,
  sourceUrl: httpUrl,
  credit: optionalText(500),
});

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export const adminMediaListSchema = z
  .object({
    q: z.preprocess(first, z.string().trim().max(100).catch("")),
    game: z.preprocess(first, z.union([z.uuid(), z.literal("")]).catch("")),
    status: z.preprocess(first, z.enum(["active", "retired", "all"]).catch("active")),
    page: z.preprocess(first, z.coerce.number().int().positive().catch(1)),
  })
  .transform((value) => ({
    q: value.q,
    gameId: value.game || null,
    status: value.status,
    page: value.page,
    pageSize: MEDIA_PAGE_SIZE,
  } as const));
