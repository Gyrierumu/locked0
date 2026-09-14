import {
  ForbiddenError,
  IdentityProviderError,
  UnauthenticatedError,
} from "@/modules/identity/contracts";
import { MediaError } from "@/modules/media/contracts";

import { CatalogError } from "../../domain/errors";
import type { CatalogFormState } from "../action-state";

type ErrorReporter = (error: unknown) => void;

export function achievementActionError(
  error: unknown,
  report: ErrorReporter = console.error,
): CatalogFormState {
  if (error instanceof CatalogError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof MediaError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof ForbiddenError) {
    return {
      status: "error",
      message: "Você não tem permissão para realizar esta ação.",
    };
  }
  if (error instanceof UnauthenticatedError) {
    return {
      status: "error",
      message: "Sua sessão não está mais válida. Entre novamente e tente de novo.",
    };
  }
  if (error instanceof IdentityProviderError) {
    return {
      status: "error",
      message: "Não foi possível validar sua sessão agora. Tente novamente.",
    };
  }
  report(error);
  return {
    status: "error",
    message: "Não foi possível concluir a operação agora. Tente novamente.",
  };
}
