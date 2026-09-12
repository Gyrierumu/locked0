import "server-only";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdentityProviderError } from "@/modules/identity/domain/errors";

const authMocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getClaims: authMocks.getClaims },
  })),
}));

import { getVerifiedIdentity } from "./supabase-auth";

describe("Supabase verified identity", () => {
  beforeEach(() => {
    authMocks.getClaims.mockReset();
  });

  it("distinguishes an identity-provider failure from an anonymous request", async () => {
    authMocks.getClaims.mockResolvedValue({
      data: null,
      error: new Error("claims unavailable"),
    });

    await expect(getVerifiedIdentity()).rejects.toBeInstanceOf(IdentityProviderError);
  });

  it("returns null only when no verified subject is present", async () => {
    authMocks.getClaims.mockResolvedValue({ data: { claims: {} }, error: null });

    await expect(getVerifiedIdentity()).resolves.toBeNull();
  });

  it("builds the identity from verified claims", async () => {
    authMocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", email: "admin@example.com" } },
      error: null,
    });

    await expect(getVerifiedIdentity()).resolves.toEqual({
      userId: "user-1",
      email: "admin@example.com",
    });
  });
});
