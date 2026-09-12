import { z } from "zod";

import { CONTENT_PACK_TYPES, GAME_STATUSES } from "../../domain/models";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const requiredName = (label: string, max: number) =>
  z
    .string({ error: `${label} é obrigatório.` })
    .trim()
    .min(1, `${label} é obrigatório.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

const slug = z
  .string({ error: "Slug é obrigatório." })
  .trim()
  .min(1, "Slug é obrigatório.")
  .max(160, "Slug deve ter no máximo 160 caracteres.")
  .regex(slugPattern, "Use apenas letras minúsculas, números e hífens.");

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max, `Use no máximo ${max} caracteres.`).nullable(),
  );

function isIsoCalendarDate(value: string): boolean {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
    .refine(isIsoCalendarDate, "Informe uma data válida.")
    .nullable(),
);

const gameMetadataFields = {
  name: requiredName("Nome", 200),
  slug,
  summary: optionalText(5_000),
  developerName: optionalText(200),
  publisherName: optionalText(200),
  releaseDate: optionalDate,
};

export const createGameSchema = z.object({
  ...gameMetadataFields,
  status: z.enum(GAME_STATUSES, { error: "Selecione um status válido." }),
});

export const updateGameSchema = z.object(gameMetadataFields);

const platformFields = {
  name: requiredName("Nome", 120),
  shortName: requiredName("Nome curto", 40),
  slug,
  sortOrder: z.coerce
    .number({ error: "Informe uma ordem válida." })
    .int("A ordem deve ser um número inteiro.")
    .min(0, "A ordem não pode ser negativa.")
    .max(100_000, "A ordem informada é muito alta."),
  isActive: z.boolean(),
};

export const createPlatformSchema = z.object(platformFields);
export const updatePlatformSchema = z.object(platformFields);

const gameReleaseFields = {
  platformId: z.uuid({ error: "Selecione uma plataforma válida." }),
  key: requiredName("Chave interna", 120).regex(
    slugPattern,
    "Use apenas letras minúsculas, números e hífens.",
  ),
  name: optionalText(200),
  regionCode: optionalText(32),
  releaseDate: optionalDate,
};

export const createGameReleaseSchema = z.object(gameReleaseFields);
export const updateGameReleaseSchema = z.object(gameReleaseFields);

const contentPackFields = {
  name: requiredName("Nome", 200),
  slug,
  type: z.enum(CONTENT_PACK_TYPES, { error: "Selecione um tipo válido." }),
  description: optionalText(5_000),
  releaseDate: optionalDate,
  status: z.enum(GAME_STATUSES, { error: "Selecione um status válido." }),
};

export const createContentPackSchema = z.object(contentPackFields);
export const updateContentPackSchema = z.object(contentPackFields);

export const catalogIdSchema = z.uuid();

export const adminGameListSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(["all", ...GAME_STATUSES]).catch("all"),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  pageSize: z.literal(25).catch(25),
});

export function checkboxValue(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true";
}
