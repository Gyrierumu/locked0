import { describe, expect, it } from "vitest";

import { canPerformMediaOperation, getMediaCapabilities } from "./permissions";

describe("media permissions", () => {
  it("lets authors read/upload but not mutate global metadata or lifecycle", () => {
    expect(getMediaCapabilities(["author"])).toEqual({
      canRead: true,
      canUpload: true,
      canManageMetadata: false,
      canManageLifecycle: false,
      canHardDelete: false,
    });
  });

  it("lets editors manage metadata/lifecycle and reserves hard delete for admins", () => {
    expect(canPerformMediaOperation(["editor"], "manage_metadata")).toBe(true);
    expect(canPerformMediaOperation(["editor"], "manage_lifecycle")).toBe(true);
    expect(canPerformMediaOperation(["editor"], "hard_delete")).toBe(false);
    expect(canPerformMediaOperation(["admin"], "hard_delete")).toBe(true);
  });

  it("rejects regular authenticated users without an editorial role", () => {
    expect(canPerformMediaOperation([], "read")).toBe(false);
    expect(canPerformMediaOperation([], "upload")).toBe(false);
  });
});
