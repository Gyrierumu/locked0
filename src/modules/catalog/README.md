# Catalog

Responsável por `Game`, `Platform`, `GameRelease`, `AchievementSet`, `AchievementGroup`, `Achievement` e `ContentPack`.

O catálogo é independente de progresso e não importa `progress`. Tabelas Drizzle ficam em `src/db/schema/catalog.ts`; acesso a elas será implementado apenas pela camada de infraestrutura deste módulo.
