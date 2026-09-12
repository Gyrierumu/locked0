export type CatalogErrorCode =
  | "forbidden"
  | "not_found"
  | "duplicate_game_slug"
  | "duplicate_platform_slug"
  | "duplicate_release_key"
  | "duplicate_content_pack_slug"
  | "game_archived"
  | "platform_inactive";

const DEFAULT_MESSAGES: Readonly<Record<CatalogErrorCode, string>> = {
  forbidden: "Você não tem permissão para realizar esta ação.",
  not_found: "O recurso solicitado não foi encontrado.",
  duplicate_game_slug: "Este slug já está sendo usado por outro jogo.",
  duplicate_platform_slug: "Este slug já está sendo usado por outra plataforma.",
  duplicate_release_key: "Já existe uma release deste jogo com essa chave interna.",
  duplicate_content_pack_slug: "Este slug já está sendo usado por outro conteúdo deste jogo.",
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

