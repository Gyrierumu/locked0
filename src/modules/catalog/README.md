# Catalog

Responsável por `Game`, `Platform`, `GameRelease`, `AchievementSet`, `AchievementGroup`, `Achievement` e `ContentPack`.

O catálogo é independente de progresso e não importa `progress`. Tabelas Drizzle ficam em
`src/db/schema/catalog.ts`; somente a camada de infraestrutura deste módulo acessa essas tabelas.

## Catalog Admin

A Etapa 10C implementa o Catalog Admin do LOCKED:0 para Games, Platforms, Game Releases e
Content Packs. A API pública server-side está em `server.ts`; rotas e Server Actions consomem essa
superfície sem acessar Drizzle diretamente.

Permissões congeladas nesta etapa:

- `author`: leitura de todo o catálogo administrativo;
- `editor`: cria e edita Games, Releases e Content Packs, incluindo lifecycle de Content Packs;
- `admin`: inclui as permissões de editor, gerencia Platforms e o lifecycle de Games.

Não há hard delete administrativo. Releases não possuem lifecycle no schema atual. Mídia de Games
permanece somente informativa até o Media Manager.
