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

## Achievement Manager

A Etapa 10D adiciona os workspaces contextuais de Achievement Sets ao Game Workspace. A criação
de uma lista, seu único grupo `base` inicial e os vínculos N:N com Releases acontecem na mesma
transação. Groups adicionais podem ser associados opcionalmente a Content Packs do mesmo jogo e
reordenados por comandos atômicos.

O manager usa uma tabela editorial paginada, busca por nome/slug, filtros de grupo, tipo, status e
visibilidade, edição rápida, inspector e movimentação entre Groups sem trocar o ID do Achievement.
Structured Paste aceita TSV/CSV básico com preview, normalização determinística e aplicação atômica
de até 500 linhas.

Para achievements, `author` permanece read-only; `editor` e `admin` podem criar, editar, mover,
arquivar e restaurar. Sincronização com providers externos, Guide Coverage, progresso do jogador e
gestão de mídia seguem adiados. Todo texto público novo preserva a marca LOCKED:0.
