const COMBINING_MARKS = /\p{M}+/gu;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, "-")
    .replace(EDGE_HYPHENS, "");
}
