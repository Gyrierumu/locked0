import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const sourceFiles = "**/*.{ts,tsx}";

const restriction = (patterns) => [
  "error",
  {
    patterns,
  },
];

const crossModuleRestriction = (moduleName, allowedApis) => {
  const publicApi = allowedApis.length > 0 ? `|[^/]+/(?:${allowedApis.join("|")})$` : "";

  return {
    regex: `^@/modules/(?!(?:${moduleName})(?:/|$)${publicApi})[^/]+(?:/.*)?$`,
    message: "Consuma outro módulo somente por uma API pública permitida para esta camada.",
  };
};

const moduleLayerConfig = (moduleName, layer, allowedApis, patterns) => ({
  files: [`src/modules/${moduleName}/${layer}/${sourceFiles}`],
  rules: {
    "no-restricted-imports": restriction([
      crossModuleRestriction(moduleName, allowedApis),
      ...patterns,
    ]),
  },
});

const moduleNames = ["catalog", "guides", "progress", "identity", "search", "media"];

const moduleBoundaryConfigs = moduleNames.flatMap((moduleName) => [
  {
    files: [`src/modules/${moduleName}/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": restriction([
        crossModuleRestriction(moduleName, ["contracts", "server", "ui"]),
      ]),
    },
  },
  moduleLayerConfig(moduleName, "domain", [], [
    "react",
    "react/**",
    "next",
    "next/**",
    "drizzle-orm",
    "drizzle-orm/**",
    "@supabase/**",
    "@/db",
    "@/db/**",
    "@/infrastructure",
    "@/infrastructure/**",
    `@/modules/${moduleName}/application/**`,
    `@/modules/${moduleName}/infrastructure/**`,
    `@/modules/${moduleName}/delivery/**`,
  ]),
  moduleLayerConfig(moduleName, "application", ["contracts"], [
    "react",
    "react/**",
    "next",
    "next/**",
    "drizzle-orm",
    "drizzle-orm/**",
    "@supabase/**",
    "@/db",
    "@/db/**",
    "@/components/**",
    `@/modules/${moduleName}/infrastructure/**`,
    `@/modules/${moduleName}/delivery/**`,
  ]),
  moduleLayerConfig(moduleName, "infrastructure", ["contracts", "server"], [
    "react",
    "react/**",
    "@/components/**",
    `@/modules/${moduleName}/delivery/**`,
    `@/modules/${moduleName}/ui`,
  ]),
  moduleLayerConfig(moduleName, "delivery", ["contracts", "server", "ui"], [
    "drizzle-orm",
    "drizzle-orm/**",
    "@/db",
    "@/db/**",
    "@/infrastructure",
    "@/infrastructure/**",
    `@/modules/${moduleName}/infrastructure/**`,
  ]),
]);

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: [`src/app/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restriction([
        "@/db",
        "@/db/**",
        "@/modules/*/domain",
        "@/modules/*/domain/**",
        "@/modules/*/application",
        "@/modules/*/application/**",
        "@/modules/*/infrastructure",
        "@/modules/*/infrastructure/**",
        "@/modules/*/delivery",
        "@/modules/*/delivery/**",
      ]),
    },
  },
  {
    files: [`src/db/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restriction([
        "react",
        "react/**",
        "@/app",
        "@/app/**",
        "@/modules",
        "@/modules/**",
      ]),
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/config/env.client.ts", "src/config/env.server.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: "Leia variáveis de ambiente somente por src/config/env.client.ts ou env.server.ts.",
        },
      ],
    },
  },
  ...moduleBoundaryConfigs,
  {
    files: ["src/**/*.client.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restriction([
        "server-only",
        "@/config/env.server",
        "@/db",
        "@/db/**",
        "@/infrastructure/supabase/server",
        "@/infrastructure/supabase/admin",
        "@/modules/*/server",
      ]),
    },
  },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "node_modules/**",
    "public/**",
    "pnpm-lock.yaml",
  ]),
]);
