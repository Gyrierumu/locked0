import { describe, expect, it } from "vitest";

import { sanitizeAdminReturnPath } from "./return-path";

describe("sanitizeAdminReturnPath", () => {
  it.each(["/admin", "/admin/guias/123", "/admin/guias/123?tab=conteudo"])(
    "accepts the safe internal path %s",
    (path) => {
      expect(sanitizeAdminReturnPath(path)).toBe(path);
    },
  );

  it.each([
    "https://example.com",
    "//example.com",
    "javascript:alert(1)",
    "",
    "   ",
    "/",
    "/login",
    "/admin\\evil.example",
    null,
    undefined,
    ["/admin"],
  ])("replaces unsafe or invalid value %j with the admin fallback", (value) => {
    expect(sanitizeAdminReturnPath(value)).toBe("/admin");
  });
});
