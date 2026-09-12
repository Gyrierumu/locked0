export type CatalogErrorCode =
  | "forbidden"
  | "not_found"
  | "duplicate_game_slug"
  | "duplicate_platform_slug"
  | "duplicate_release_key"
  | "duplicate_content_pack_slug"
  | "duplicate_achievement_set_key"
  | "duplicate_base_group"
  | "duplicate_group_position"
  | "duplicate_achievement_slug"
  | "duplicate_achievement_position"
  | "cross_game_release"
  | "cross_game_content_pack"
  | "group_not_in_set"
  | "invalid_group_order"
  | "base_group_content_pack"
  | "paste_invalid"
  | "paste_too_large"
  | "game_archived"
  | "platform_inactive";

const DEFAULT_MESSAGES: Readonly<Record<CatalogErrorCode, string>> = {
  forbidden: "Você não tem permissão para realizar esta ação.",
  not_found: "O recurso solicitado não foi encontrado.",
  duplicate_game_slug: "Este slug já está sendo usado por outro jogo.",
  duplicate_platform_slug: "Este slug já está sendo usado por outra plataforma.",
  duplicate_release_key: "Já existe uma release deste jogo com essa chave interna.",
  duplicate_content_pack_slug: "Este slug já está sendo usado por outro conteúdo deste jogo.",
  duplicate_achievement_set_key: "Já existe uma lista deste jogo com essa chave interna.",
  duplicate_base_group: "Esta lista já possui um grupo Base.",
  duplicate_group_position: "Não foi possível manter a ordem dos grupos.",
  duplicate_achievement_slug: "Já existe uma conquista com este slug neste grupo.",
  duplicate_achievement_position: "Não foi possível manter a ordem das conquistas.",
  cross_game_release: "Todas as releases selecionadas devem pertencer a este jogo.",
  cross_game_content_pack: "O conteúdo adicional deve pertencer a este jogo.",
  group_not_in_set: "O grupo selecionado não pertence a esta lista.",
  invalid_group_order: "A ordem enviada deve conter todos os grupos da lista uma única vez.",
  base_group_content_pack: "O grupo Base não pode ser associado a conteúdo adicional.",
  paste_invalid: "Revise as linhas sinalizadas antes de aplicar a lista.",
  paste_too_large: "Cole no máximo 500 conquistas por vez.",
  game_archived: "Restaure o jogo antes de adicionar novos registros.",
  platform_inactive: "Selecione uma plataforma ativa para esta release.",
};

export class CatalogError extends Error {
  readonly code: CatalogErrorCode;

  constructor(code: CatalogErrorCode, message = DEFAULT_MESSAGES[code]) {
    super(message);
    this.name = "CatalogError";
    this.code = code;
  }
}
