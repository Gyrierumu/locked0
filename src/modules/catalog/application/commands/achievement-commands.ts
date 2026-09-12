import type {
  AchievementGroupInput,
  AchievementMetadataInput,
  AchievementPastePreview,
  AchievementPasteRow,
  AchievementSetMetadataInput,
  AchievementStatus,
  AchievementType,
  CatalogRole,
  CreateAchievementInput,
  CreateAchievementSetInput,
} from "../../contracts";
import { CatalogError } from "../../domain/errors";
import { ACHIEVEMENT_TYPES } from "../../domain/models";
import { assertCatalogPermission } from "../../domain/permissions";
import { slugify } from "@/shared/utils/slugify";
import type {
  AchievementInsert,
  AchievementRepository,
} from "../ports/achievement-repository";

export const ACHIEVEMENT_PASTE_LIMIT = 500;

type CommandContext = Readonly<{
  roles: readonly CatalogRole[];
  repository: AchievementRepository;
}>;

type PasteInput = Readonly<{
  gameId: string;
  achievementSetId: string;
  targetGroupId: string;
  text: string;
}>;

function nullable(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeSetInput(input: AchievementSetMetadataInput): AchievementSetMetadataInput {
  return {
    name: input.name.trim(),
    key: input.key.trim(),
    regionCode: nullable(input.regionCode),
    status: input.status,
  };
}

function normalizeGroupInput(input: AchievementGroupInput): AchievementGroupInput {
  return {
    name: input.name.trim(),
    type: input.type,
    contentPackId: input.type === "base" ? null : input.contentPackId,
  };
}

function normalizeAchievementInput(input: AchievementMetadataInput): AchievementMetadataInput {
  return {
    name: input.name.trim(),
    slug: input.slug.trim(),
    description: nullable(input.description),
    achievementType: input.achievementType,
    points: input.points,
    isHidden: input.isHidden,
    status: input.status,
  };
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

async function requireGame(repository: AchievementRepository, gameId: string) {
  const game = await repository.findGameState(gameId);
  if (!game) throw new CatalogError("not_found");
  return game;
}

async function requireSet(
  repository: AchievementRepository,
  gameId: string,
  achievementSetId: string,
) {
  const achievementSet = await repository.findAchievementSet(gameId, achievementSetId);
  if (!achievementSet) throw new CatalogError("not_found");
  return achievementSet;
}

async function validateReleases(
  repository: AchievementRepository,
  gameId: string,
  releaseIds: readonly string[],
): Promise<string[]> {
  const ids = uniqueIds(releaseIds);
  if (ids.length === 0) return ids;
  if ((await repository.countGameReleases(gameId, ids)) !== ids.length) {
    throw new CatalogError("cross_game_release");
  }
  return ids;
}

async function validateContentPack(
  repository: AchievementRepository,
  gameId: string,
  contentPackId: string | null,
): Promise<void> {
  if (!contentPackId) return;
  const contentPack = await repository.findContentPackState(contentPackId);
  if (!contentPack || contentPack.gameId !== gameId) {
    throw new CatalogError("cross_game_content_pack");
  }
}

export async function createAchievementSet(
  context: CommandContext,
  input: CreateAchievementSetInput,
) {
  assertCatalogPermission(context.roles, "manage_achievement");
  return context.repository.transaction(async (repository) => {
    const game = await requireGame(repository, input.gameId);
    if (game.status === "archived") throw new CatalogError("game_archived");
    const releaseIds = await validateReleases(repository, input.gameId, input.releaseIds);
    const created = await repository.createAchievementSet(
      input.gameId,
      normalizeSetInput(input),
    );
    await repository.createAchievementGroup(
      created.id,
      { name: "Base Game", type: "base", contentPackId: null },
      0,
    );
    await repository.replaceAchievementSetReleases(created.id, releaseIds);
    return created;
  });
}

export async function updateAchievementSet(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  input: AchievementSetMetadataInput,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_achievement");
  await requireSet(context.repository, gameId, achievementSetId);
  await context.repository.updateAchievementSet(
    gameId,
    achievementSetId,
    normalizeSetInput(input),
  );
}

export async function replaceAchievementSetReleases(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  releaseIds: readonly string[],
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_achievement");
  await context.repository.transaction(async (repository) => {
    await requireSet(repository, gameId, achievementSetId);
    const validIds = await validateReleases(repository, gameId, releaseIds);
    await repository.replaceAchievementSetReleases(achievementSetId, validIds);
  });
}

export async function createAchievementGroup(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  input: AchievementGroupInput,
) {
  assertCatalogPermission(context.roles, "manage_achievement");
  if (input.type === "base" && input.contentPackId) {
    throw new CatalogError("base_group_content_pack");
  }
  return context.repository.transaction(async (repository) => {
    await requireSet(repository, gameId, achievementSetId);
    const groups = await repository.listAchievementGroups(achievementSetId);
    if (input.type === "base" && groups.some((group) => group.type === "base")) {
      throw new CatalogError("duplicate_base_group");
    }
    await validateContentPack(repository, gameId, input.contentPackId);
    const nextPosition = Math.max(-1, ...groups.map((group) => group.position)) + 1;
    return repository.createAchievementGroup(
      achievementSetId,
      normalizeGroupInput(input),
      nextPosition,
    );
  });
}

export async function updateAchievementGroup(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  groupId: string,
  input: AchievementGroupInput,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_achievement");
  await requireSet(context.repository, gameId, achievementSetId);
  const existing = await context.repository.findAchievementGroup(achievementSetId, groupId);
  if (!existing) throw new CatalogError("not_found");

  const normalized = normalizeGroupInput({
    ...input,
    type: existing.type === "base" ? "base" : input.type,
  });
  if (normalized.type === "base" && normalized.contentPackId) {
    throw new CatalogError("base_group_content_pack");
  }
  if (existing.type !== "base" && normalized.type === "base") {
    const groups = await context.repository.listAchievementGroups(achievementSetId);
    if (groups.some((group) => group.type === "base" && group.id !== groupId)) {
      throw new CatalogError("duplicate_base_group");
    }
  }
  await validateContentPack(context.repository, gameId, normalized.contentPackId);
  await context.repository.updateAchievementGroup(
    achievementSetId,
    groupId,
    normalized,
  );
}

export async function reorderAchievementGroups(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  orderedGroupIds: readonly string[],
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_achievement");
  await context.repository.transaction(async (repository) => {
    await requireSet(repository, gameId, achievementSetId);
    const groups = await repository.listAchievementGroups(achievementSetId);
    const currentIds = new Set(groups.map((group) => group.id));
    const orderedIds = uniqueIds(orderedGroupIds);
    if (
      orderedIds.length !== groups.length ||
      orderedIds.some((id) => !currentIds.has(id))
    ) {
      throw new CatalogError("invalid_group_order");
    }
    const temporaryStart = Math.max(-1, ...groups.map((group) => group.position)) + groups.length + 1;
    for (const [index, groupId] of orderedIds.entries()) {
      await repository.setAchievementGroupPosition(groupId, temporaryStart + index);
    }
    for (const [index, groupId] of orderedIds.entries()) {
      await repository.setAchievementGroupPosition(groupId, index);
    }
  });
}

export async function createAchievement(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  input: CreateAchievementInput,
) {
  assertCatalogPermission(context.roles, "manage_achievement");
  return context.repository.transaction(async (repository) => {
    await requireSet(repository, gameId, achievementSetId);
    const group = await repository.findAchievementGroup(
      achievementSetId,
      input.achievementGroupId,
    );
    if (!group) throw new CatalogError("group_not_in_set");
    const achievements = await repository.listGroupAchievements(group.id);
    const position = Math.max(-1, ...achievements.map((achievement) => achievement.position)) + 1;
    return repository.createAchievement({
      ...normalizeAchievementInput(input),
      achievementGroupId: group.id,
      position,
    });
  });
}

export async function updateAchievement(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  input: CreateAchievementInput,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_achievement");
  await requireSet(context.repository, gameId, achievementSetId);
  const achievement = await context.repository.findAchievement(achievementSetId, achievementId);
  if (!achievement) {
    throw new CatalogError("not_found");
  }
  const targetGroup = await context.repository.findAchievementGroup(
    achievementSetId,
    input.achievementGroupId,
  );
  if (!targetGroup) throw new CatalogError("group_not_in_set");

  await context.repository.transaction(async (repository) => {
    await repository.updateAchievement(
      achievementSetId,
      achievementId,
      normalizeAchievementInput(input),
    );
    if (achievement.achievementGroupId !== targetGroup.id) {
      await moveAchievementInTransaction(repository, achievement, targetGroup.id);
    }
  });
}

async function moveAchievementInTransaction(
  repository: AchievementRepository,
  achievement: Readonly<{ id: string; achievementGroupId: string }>,
  targetGroupId: string,
): Promise<void> {
  const [sourceAchievements, targetAchievements] = await Promise.all([
    repository.listGroupAchievements(achievement.achievementGroupId),
    repository.listGroupAchievements(targetGroupId),
  ]);
  const targetPosition = Math.max(
    -1,
    ...targetAchievements.map((item) => item.position),
  ) + 1;
  await repository.moveAchievementToGroup(achievement.id, targetGroupId, targetPosition);

  const remaining = sourceAchievements.filter((item) => item.id !== achievement.id);
  for (const [position, item] of remaining.entries()) {
    if (item.position !== position) {
      await repository.setAchievementPosition(item.id, position);
    }
  }
}

export async function moveAchievement(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  targetGroupId: string,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_achievement");
  await requireSet(context.repository, gameId, achievementSetId);
  const [achievement, targetGroup] = await Promise.all([
    context.repository.findAchievement(achievementSetId, achievementId),
    context.repository.findAchievementGroup(achievementSetId, targetGroupId),
  ]);
  if (!achievement) throw new CatalogError("not_found");
  if (!targetGroup) throw new CatalogError("group_not_in_set");
  if (achievement.achievementGroupId === targetGroupId) return;

  await context.repository.transaction(async (repository) => {
    await moveAchievementInTransaction(repository, achievement, targetGroupId);
  });
}

async function setAchievementLifecycle(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  achievementId: string,
  status: AchievementStatus,
): Promise<void> {
  assertCatalogPermission(context.roles, "manage_achievement");
  await requireSet(context.repository, gameId, achievementSetId);
  if (!(await context.repository.findAchievement(achievementSetId, achievementId))) {
    throw new CatalogError("not_found");
  }
  await context.repository.setAchievementStatus(achievementSetId, achievementId, status);
}

export function archiveAchievement(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  achievementId: string,
) {
  return setAchievementLifecycle(context, gameId, achievementSetId, achievementId, "archived");
}

export function restoreAchievement(
  context: CommandContext,
  gameId: string,
  achievementSetId: string,
  achievementId: string,
) {
  return setAchievementLifecycle(context, gameId, achievementSetId, achievementId, "active");
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizedType(value: string): AchievementType | null {
  const aliases: Readonly<Record<string, AchievementType>> = {
    bronze: "bronze",
    silver: "silver",
    prata: "silver",
    gold: "gold",
    ouro: "gold",
    platinum: "platinum",
    platina: "platinum",
    standard: "standard",
    padrao: "standard",
  };
  return aliases[normalizeHeader(value)] ?? null;
}

function normalizedBoolean(value: string): boolean | null {
  const normalized = normalizeHeader(value);
  if (["true", "sim", "yes", "1"].includes(normalized)) return true;
  if (["false", "nao", "no", "0", ""].includes(normalized)) return false;
  return null;
}

function parsePoints(value: string): { value: number | null; valid: boolean } {
  if (value.trim() === "") return { value: null, valid: true };
  const number = Number(value);
  return Number.isInteger(number) && number >= 0
    ? { value: number, valid: true }
    : { value: null, valid: false };
}

async function buildPastePreview(
  repository: AchievementRepository,
  input: PasteInput,
): Promise<AchievementPastePreview> {
  await requireSet(repository, input.gameId, input.achievementSetId);
  const groups = await repository.listAchievementGroups(input.achievementSetId);
  const defaultGroup = groups.find((group) => group.id === input.targetGroupId);
  if (!defaultGroup) throw new CatalogError("group_not_in_set");

  const lines = input.text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (lines.length > ACHIEVEMENT_PASTE_LIMIT + 1) throw new CatalogError("paste_too_large");
  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const rawRows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const knownHeaders = new Set(["name", "nome", "type", "tipo", "hidden", "oculto", "points", "pontos", "slug", "group", "grupo"]);
  const firstRow = rawRows[0] ?? [];
  const hasHeader = firstRow.some((value) => knownHeaders.has(normalizeHeader(value)));
  const headers = hasHeader
    ? firstRow.map(normalizeHeader)
    : ["name", "type", "hidden", "points", "slug", "group"];
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
  if (dataRows.length > ACHIEVEMENT_PASTE_LIMIT) throw new CatalogError("paste_too_large");

  const headerIndex = (aliases: readonly string[]) =>
    headers.findIndex((header) => aliases.includes(header));
  const indices = {
    name: headerIndex(["name", "nome"]),
    type: headerIndex(["type", "tipo"]),
    hidden: headerIndex(["hidden", "oculto"]),
    points: headerIndex(["points", "pontos"]),
    slug: headerIndex(["slug"]),
    group: headerIndex(["group", "grupo"]),
  };
  const byName = new Map(groups.map((group) => [normalizeHeader(group.name), group]));
  const existingSlugs = await repository.listAchievementSlugs(groups.map((group) => group.id));
  const existingKeys = new Set(existingSlugs.map((item) => `${item.groupId}:${item.slug}`));
  const pasteKeys = new Set<string>();

  const rows: AchievementPasteRow[] = dataRows.map((values, index) => {
    const valueAt = (column: number) => (column >= 0 ? values[column]?.trim() ?? "" : "");
    const name = valueAt(indices.name);
    const type = normalizedType(valueAt(indices.type));
    const hidden = normalizedBoolean(valueAt(indices.hidden));
    const points = parsePoints(valueAt(indices.points));
    const slug = valueAt(indices.slug) || slugify(name);
    const groupText = valueAt(indices.group);
    const group = groupText ? byName.get(normalizeHeader(groupText)) : defaultGroup;
    const errors: string[] = [];
    if (!name) errors.push("Nome obrigatório.");
    if (!type || !ACHIEVEMENT_TYPES.includes(type)) errors.push("Tipo inválido.");
    if (hidden === null) errors.push("Valor de oculto inválido.");
    if (!points.valid) errors.push("Pontos devem ser um inteiro maior ou igual a zero.");
    if (!slug) errors.push("Não foi possível gerar o slug.");
    if (name.length > 240) errors.push("Nome deve ter no máximo 240 caracteres.");
    if (slug.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push("Slug deve usar letras minúsculas, números e hífens.");
    }
    if (points.value !== null && points.value > 1_000_000) {
      errors.push("A pontuação informada é muito alta.");
    }
    if (!group) errors.push("Grupo não encontrado.");

    if (group && slug) {
      const key = `${group.id}:${slug}`;
      if (pasteKeys.has(key)) errors.push("Slug duplicado nesta colagem.");
      else pasteKeys.add(key);
      if (existingKeys.has(key)) errors.push("Slug já existe no grupo selecionado.");
    }

    return {
      rowNumber: index + 1,
      name,
      slug,
      achievementType: type,
      isHidden: hidden,
      points: points.value,
      groupId: group?.id ?? null,
      groupName: group?.name ?? (groupText || null),
      errors,
    };
  });
  const invalidCount = rows.filter((row) => row.errors.length > 0).length;
  return {
    detectedCount: rows.length,
    validCount: rows.length - invalidCount,
    invalidCount,
    rows,
    canApply: rows.length > 0 && invalidCount === 0,
  };
}

export async function previewAchievementPaste(
  context: CommandContext,
  input: PasteInput,
): Promise<AchievementPastePreview> {
  assertCatalogPermission(context.roles, "manage_achievement");
  return buildPastePreview(context.repository, input);
}

export async function applyAchievementPaste(
  context: CommandContext,
  input: PasteInput,
): Promise<Readonly<{ createdCount: number }>> {
  assertCatalogPermission(context.roles, "manage_achievement");
  return context.repository.transaction(async (repository) => {
    const preview = await buildPastePreview(repository, input);
    if (!preview.canApply) throw new CatalogError("paste_invalid");

    const groupIds = uniqueIds(
      preview.rows.flatMap((row) => (row.groupId ? [row.groupId] : [])),
    );
    const nextPositions = new Map<string, number>();
    for (const groupId of groupIds) {
      const current = await repository.listGroupAchievements(groupId);
      nextPositions.set(
        groupId,
        Math.max(-1, ...current.map((achievement) => achievement.position)) + 1,
      );
    }

    const inserts: AchievementInsert[] = preview.rows.map((row) => {
      if (!row.groupId || !row.achievementType || row.isHidden === null) {
        throw new CatalogError("paste_invalid");
      }
      const position = nextPositions.get(row.groupId) ?? 0;
      nextPositions.set(row.groupId, position + 1);
      return {
        achievementGroupId: row.groupId,
        name: row.name,
        slug: row.slug,
        description: null,
        achievementType: row.achievementType,
        points: row.points,
        isHidden: row.isHidden,
        status: "active",
        position,
      };
    });
    await repository.createAchievements(inserts);
    return { createdCount: inserts.length };
  });
}
