import type { MediaUsage } from "./usage";

export type MediaErrorCode =
  | "MEDIA_NOT_FOUND"
  | "MEDIA_RETIRED"
  | "MEDIA_ASSET_IN_USE"
  | "MEDIA_ALREADY_PUBLISHED"
  | "MEDIA_UPLOAD_MISSING"
  | "MEDIA_UPLOAD_INVALID_PATH"
  | "MEDIA_UNSUPPORTED_TYPE"
  | "MEDIA_TOO_LARGE"
  | "MEDIA_DIMENSIONS_TOO_LARGE"
  | "MEDIA_INVALID_IMAGE"
  | "MEDIA_STORAGE_FAILURE"
  | "MEDIA_FINAL_PATH_CONFLICT"
  | "MEDIA_DELETE_NOT_ALLOWED"
  | "MEDIA_INVALID_METADATA"
  | "MEDIA_PERSISTENCE_FAILURE"
  | "MEDIA_FORBIDDEN";

const MESSAGES: Readonly<Record<MediaErrorCode, string>> = {
  MEDIA_NOT_FOUND: "O asset solicitado nao foi encontrado.",
  MEDIA_RETIRED: "Este asset foi retirado e nao pode ser selecionado para um novo uso.",
  MEDIA_ASSET_IN_USE: "Nao e possivel retirar este asset enquanto ele estiver em uso.",
  MEDIA_ALREADY_PUBLISHED: "Assets ja publicados nao podem ser excluidos permanentemente.",
  MEDIA_UPLOAD_MISSING: "O upload temporario nao foi encontrado.",
  MEDIA_UPLOAD_INVALID_PATH: "O upload temporario nao pertence a esta sessao.",
  MEDIA_UNSUPPORTED_TYPE: "Envie uma imagem JPEG, PNG, WebP ou AVIF.",
  MEDIA_TOO_LARGE: "A imagem deve ter no maximo 10 MB.",
  MEDIA_DIMENSIONS_TOO_LARGE: "As dimensoes da imagem excedem o limite permitido.",
  MEDIA_INVALID_IMAGE: "O arquivo enviado nao e uma imagem valida.",
  MEDIA_STORAGE_FAILURE: "Nao foi possivel concluir a operacao no Storage.",
  MEDIA_FINAL_PATH_CONFLICT: "O destino final deste asset ja existe e nao sera sobrescrito.",
  MEDIA_DELETE_NOT_ALLOWED: "Este asset nao pode ser excluido permanentemente.",
  MEDIA_INVALID_METADATA: "Revise os metadados informados para o asset.",
  MEDIA_PERSISTENCE_FAILURE: "Nao foi possivel salvar o asset na biblioteca.",
  MEDIA_FORBIDDEN: "Voce nao tem permissao para realizar esta acao.",
};

export class MediaError extends Error {
  readonly code: MediaErrorCode;
  readonly usages?: readonly MediaUsage[];

  constructor(
    code: MediaErrorCode,
    options?: Readonly<{ message?: string; usages?: readonly MediaUsage[] }>,
  ) {
    super(options?.message ?? MESSAGES[code]);
    this.name = "MediaError";
    this.code = code;
    this.usages = options?.usages;
  }
}
