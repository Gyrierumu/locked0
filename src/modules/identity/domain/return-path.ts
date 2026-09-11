const SAFE_ORIGIN = "https://platify.internal";
const ADMIN_FALLBACK_PATH = "/admin";

export function sanitizeAdminReturnPath(value: unknown): string {
  if (typeof value !== "string") return ADMIN_FALLBACK_PATH;

  const candidate = value.trim();
  if (
    candidate.length === 0 ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return ADMIN_FALLBACK_PATH;
  }

  try {
    const url = new URL(candidate, SAFE_ORIGIN);
    const isSameOrigin = url.origin === SAFE_ORIGIN;
    const isAdminPath = url.pathname === "/admin" || url.pathname.startsWith("/admin/");

    if (!isSameOrigin || !isAdminPath) return ADMIN_FALLBACK_PATH;

    return `${url.pathname}${url.search}`;
  } catch {
    return ADMIN_FALLBACK_PATH;
  }
}
