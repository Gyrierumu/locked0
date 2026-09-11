import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const ignoredDirectories = new Set([".git", ".next", "coverage", "node_modules"]);
const sourceExtensions = new Set([".ts", ".tsx"]);

type SourceFile = Readonly<{
  path: string;
  relativePath: string;
  content: string;
}>;

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

function extensionOf(path: string): string {
  return path.endsWith(".tsx") ? ".tsx" : path.endsWith(".ts") ? ".ts" : "";
}

function findFiles(directory: string, predicate: (path: string) => boolean): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : findFiles(path, predicate);
    }

    return predicate(path) ? [path] : [];
  });
}

function readSourceFiles(): SourceFile[] {
  return findFiles(join(repositoryRoot, "src"), (path) => sourceExtensions.has(extensionOf(path))).map(
    (path) => ({
      path,
      relativePath: normalizePath(relative(repositoryRoot, path)),
      content: readFileSync(path, "utf8"),
    }),
  );
}

function importsOf(content: string): string[] {
  const importPattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g;
  return Array.from(content.matchAll(importPattern), (match) => match[1]);
}

function failureMessage(violations: string[]): string {
  return violations.length === 0 ? "" : `\n${violations.join("\n")}`;
}

describe("repository boundaries", () => {
  const sourceFiles = readSourceFiles();

  it("keeps App Router away from database and module internals", () => {
    const violations = sourceFiles
      .filter(({ relativePath }) => relativePath.startsWith("src/app/"))
      .flatMap(({ relativePath, content }) =>
        importsOf(content)
          .filter(
            (importPath) =>
              importPath === "@/db" ||
              importPath.startsWith("@/db/") ||
              /^@\/modules\/[^/]+\/(domain|application|infrastructure|delivery)(?:\/|$)/.test(
                importPath,
              ),
          )
          .map((importPath) => `${relativePath} -> ${importPath}`),
      );

    expect(violations, failureMessage(violations)).toEqual([]);
  });

  it("allows cross-module access only through public APIs", () => {
    const violations = sourceFiles.flatMap(({ relativePath, content }) => {
      const owner = relativePath.match(/^src\/modules\/([^/]+)\//)?.[1];
      if (!owner) return [];

      return importsOf(content)
        .map((importPath) => ({
          importPath,
          match: importPath.match(/^@\/modules\/([^/]+)(?:\/(.+))?$/),
        }))
        .filter(({ match }) => {
          if (!match || match[1] === owner) return false;
          return !["contracts", "server", "ui"].includes(match[2] ?? "");
        })
        .map(({ importPath }) => `${relativePath} -> ${importPath}`);
    });

    expect(violations, failureMessage(violations)).toEqual([]);
  });

  it("keeps domain code framework and infrastructure independent", () => {
    const forbiddenPrefixes = [
      "next",
      "react",
      "drizzle-orm",
      "@supabase/",
      "@/db",
      "@/infrastructure",
    ];
    const violations = sourceFiles
      .filter(({ relativePath }) => /^src\/modules\/[^/]+\/domain\//.test(relativePath))
      .flatMap(({ relativePath, content }) =>
        importsOf(content)
          .filter((importPath) =>
            forbiddenPrefixes.some(
              (prefix) => importPath === prefix || importPath.startsWith(`${prefix}/`),
            ),
          )
          .map((importPath) => `${relativePath} -> ${importPath}`),
      );

    expect(violations, failureMessage(violations)).toEqual([]);
  });

  it("keeps Identity runtime adapters and its public server API server-only", () => {
    const protectedFiles = sourceFiles.filter(
      ({ relativePath }) =>
        relativePath === "src/modules/identity/server.ts" ||
        relativePath.startsWith("src/modules/identity/infrastructure/"),
    );
    const violations = protectedFiles
      .filter(({ content }) => !/^import ["']server-only["'];/m.test(content))
      .map(({ relativePath }) => relativePath);

    expect(violations, failureMessage(violations)).toEqual([]);
  });

  it("centralizes environment access", () => {
    const allowedFiles = new Set(["src/config/env.client.ts", "src/config/env.server.ts"]);
    const violations = sourceFiles
      .filter(({ relativePath, content }) =>
        !allowedFiles.has(relativePath) && content.includes("process.env"),
      )
      .map(({ relativePath }) => relativePath);

    expect(violations, failureMessage(violations)).toEqual([]);
  });

  it("uses the client suffix for explicit Client Components", () => {
    const nextSpecialFile = /^src\/app\/(?:.+\/)?(?:error|global-error)\.tsx$/;
    const violations = sourceFiles
      .filter(({ content }) => /^\s*["']use client["'];?/m.test(content))
      .filter(
        ({ relativePath }) =>
          !relativePath.endsWith(".client.tsx") && !nextSpecialFile.test(relativePath),
      )
      .map(({ relativePath }) => relativePath);

    expect(violations, failureMessage(violations)).toEqual([]);
  });

  it("keeps SQL migrations exclusively in drizzle", () => {
    const violations = findFiles(repositoryRoot, (path) => path.endsWith(".sql"))
      .map((path) => normalizePath(relative(repositoryRoot, path)))
      .filter((path) => !path.startsWith("drizzle/"));

    expect(violations, failureMessage(violations)).toEqual([]);
  });
});
