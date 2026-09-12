import { describe, expect, it, vi } from "vitest";

import {
  ForbiddenError,
  IdentityProviderError,
  UnauthenticatedError,
} from "@/modules/identity/contracts";

import { CatalogError } from "../../domain/errors";
import { achievementActionError } from "./achievement-action-error";

describe("Achievement action error mapping", () => {
  it("keeps actual authorization failures explicit", () => {
    expect(achievementActionError(new ForbiddenError())).toMatchObject({
      status: "error",
      message: expect.stringMatching(/permissão/i),
    });
    expect(achievementActionError(new CatalogError("forbidden"))).toMatchObject({
      status: "error",
      message: expect.stringMatching(/permissão/i),
    });
  });

  it("does not present missing authentication as insufficient permission", () => {
    const result = achievementActionError(new UnauthenticatedError());

    expect(result.message).toMatch(/sessão/i);
    expect(result.message).not.toMatch(/permissão/i);
  });

  it("does not present provider or persistence failures as insufficient permission", () => {
    const report = vi.fn();

    const providerResult = achievementActionError(new IdentityProviderError(), report);
    const persistenceResult = achievementActionError(new Error("database unavailable"), report);

    expect(providerResult.message).toMatch(/validar sua sessão/i);
    expect(providerResult.message).not.toMatch(/permissão/i);
    expect(persistenceResult.message).toMatch(/concluir a operação/i);
    expect(persistenceResult.message).not.toMatch(/permissão/i);
    expect(report).toHaveBeenCalledOnce();
  });
});
