# LOCKED:0 — ETAPA 10C — Catalog Admin

## 1. Status

- **Estado:** ✅ Aprovada
- **Nome da etapa:** Catalog Admin
- **Objetivo principal:** implementar a administração do catálogo-base do LOCKED:0
- **Entidades principais:** Games, Platforms, Game Releases e Content Packs
- **Base de dados:** schema congelado da ETAPA 10A
- **Identidade/RBAC:** reutiliza a fundação da ETAPA 10B
- **Branch:** `main`
- **Commit final:** `fd28dec34b4b992886320f08e9f68ec14362566d`
- **Mensagem do commit:** `feat(admin): implement catalog management`
- **Etapa anterior:** 10B — Identity + RBAC + Admin Shell
- **Próxima etapa:** 10D — Achievement Set + Achievement Manager

> Esta etapa transformou o Admin Shell em um sistema de catálogo realmente operacional, estabelecendo a base administrativa para jogos, plataformas, releases e conteúdos adicionais.

---

## 2. Objetivo

A ETAPA 10C teve como objetivo construir a primeira feature administrativa completa do LOCKED:0 sobre a fundação de banco e RBAC já aprovadas.

A etapa precisava permitir administrar:

- Games;
- Platforms;
- Releases;
- Content Packs;

sem alterar o schema congelado e sem antecipar Achievement Manager, Media Manager ou Guide Studio.

Também precisava consolidar padrões que seriam reutilizados nas etapas seguintes:

- navegação contextual por Game;
- formulários server-side;
- RBAC por operação;
- lifecycle sem hard delete;
- busca;
- filtros;
- paginação;
- DTOs derivados;
- queries sem N+1;
- mensagens de erro de domínio;
- integração real com o ambiente Cloud DEV.

---

## 3. Escopo implementado

A 10C entregou:

### Games

- listagem;
- busca;
- paginação;
- criação;
- edição;
- archive;
- restore;
- Game Workspace;
- contadores derivados de Releases e Content Packs.

### Platforms

- listagem;
- criação;
- edição;
- ativação/desativação;
- ordenação administrativa;
- uso histórico preservado.

### Game Releases

- listagem contextual por Game;
- criação;
- edição;
- associação com Platform;
- suporte a múltiplas Releases do mesmo Game na mesma Platform;
- region opcional;
- key única dentro do Game.

### Content Packs

- listagem contextual por Game;
- criação;
- edição;
- archive;
- restore;
- tipos controlados;
- slug por Game;
- uso posterior por Achievement Groups e Guide Studio.

### Admin UX

- navegação contextual dentro do Game;
- empty states;
- filtros;
- paginação;
- mensagens de sucesso/erro;
- restrições visuais de acordo com RBAC;
- proteção server-side das operações.

---

## 4. Fora de escopo

A 10C **não** implementou:

- Achievement Sets;
- Achievement Groups;
- Achievements;
- Structured Paste;
- Media Manager;
- uploads;
- Guide Studio;
- guides;
- progress;
- provider sync;
- integrações PlayStation/Xbox/Steam;
- scraping;
- UI pública de catálogo;
- social features;
- hard delete.

Esses itens pertencem às etapas seguintes.

---

## 5. Decisões arquiteturais

### 5.1 Administração contextual por Game

Releases e Content Packs são administrados dentro do contexto de um Game.

Isso evita telas globais excessivamente genéricas e mantém o fluxo editorial próximo da entidade principal.

### 5.2 Game Workspace

O Game recebeu um workspace administrativo como ponto central para áreas relacionadas.

Esse padrão foi reutilizado posteriormente por Achievement Sets e será útil para Guides.

### 5.3 Lifecycle sem hard delete

O catálogo usa estados de lifecycle compatíveis com o schema existente.

Entidades históricas não são removidas fisicamente por fluxo administrativo comum.

### 5.4 Platform ativa não invalida histórico

Uma Platform desativada:

- continua existindo;
- continua visível em registros históricos;
- não apaga Releases existentes;
- não deve ser tratada como inexistente.

### 5.5 Contadores derivados

Contadores como:

- número de Releases;
- número de Content Packs;

não são armazenados em colunas redundantes.

Eles são derivados por query.

### 5.6 DTOs em vez de rows Drizzle na UI

A camada de Delivery recebe DTOs adequados ao uso administrativo e não deve depender diretamente de rows Drizzle.

---

## 6. Regras de domínio e contratos

## Games

### Lifecycle

Game pode estar:

- active;
- archived.

### Regras

- Game arquivado continua editável;
- Game arquivado bloqueia criação de novas Releases;
- Game arquivado bloqueia criação de novos Content Packs;
- restore reabilita o fluxo normal;
- hard delete não faz parte do Admin.

---

## Platforms

### Lifecycle

Controlado por `is_active`.

### Regras

- ADMIN controla Platforms;
- Platform inativa permanece disponível para histórico;
- Platform inativa não deve ser usada para novas Releases;
- dados históricos não são removidos ao desativar a Platform.

---

## Game Releases

### Regras

- pertencem a um único Game;
- pertencem a uma Platform;
- múltiplas Releases do mesmo Game podem usar a mesma Platform;
- `region` pode ser `null`;
- `key` deve ser única dentro do Game;
- não há hard delete;
- não foi introduzido lifecycle novo não previsto no schema.

Exemplo aprovado em QA:

```text
QA Global
QA Japan
```

Ambas podem pertencer à mesma Platform.

---

## Content Packs

### Tipos oficiais

```text
expansion
dlc
update
mode
other
```

### Regras

- pertencem a um Game;
- slug deve ser único dentro do Game;
- podem ser archived/restored;
- Content Packs históricos continuam existindo;
- podem ser associados posteriormente a Achievement Groups;
- não existe auto-link implícito entre Content Pack e outras entidades.

---

## 7. Modelo de dados

A 10C utilizou tabelas já existentes da baseline.

### Tabelas principais

- `games`
- `platforms`
- `game_releases`
- `content_packs`

### Tabelas relacionadas

A etapa também preparou o contexto para uso posterior de:

- `achievement_sets`
- `release_achievement_sets`
- `achievement_groups`

sem implementá-las funcionalmente nesta etapa.

### Schema

- **Houve alteração de schema nesta etapa?** Não.
- **Houve migration?** Não.
- **Baseline Drizzle alterada?** Não.

---

## 8. Arquitetura da implementação

Fluxo conceitual:

```text
Admin UI
   ↓
Server Actions
   ↓
Application Commands / Queries
   ↓
Domain rules / permissions
   ↓
Repository ports
   ↓
Drizzle repositories
   ↓
PostgreSQL
```

### Delivery / UI

Responsável por:

- páginas;
- formulários;
- navegação;
- mensagens;
- estados vazios;
- filtros;
- paginação.

### Application

Responsável por:

- create/update;
- lifecycle;
- validação de same-game;
- regras de Platform ativa;
- autorização por operação;
- orchestration.

### Domain

Responsável por:

- permissions;
- invariantes;
- errors;
- lifecycle conceitual.

### Infrastructure

Responsável por:

- queries Drizzle;
- writes;
- tratamento de erros PostgreSQL;
- agregações;
- mapping para DTOs.

---

## 9. Rotas e experiência administrativa

### Games

```text
/admin/jogos
/admin/jogos/novo
/admin/jogos/[gameId]
```

### Releases

```text
/admin/jogos/[gameId]/releases
```

### Content Packs

```text
/admin/jogos/[gameId]/content-packs
```

### Platforms

```text
/admin/plataformas
```

### Game Workspace

O workspace contextual do Game passou a expor áreas como:

- Overview;
- Releases;
- Content Packs;
- Achievement Sets;
- Guides.

Na 10C, apenas as áreas de catálogo implementadas estavam funcionais.

Achievement Sets e Guides permaneciam futuras naquele checkpoint.

---

## 10. RBAC e segurança

### AUTHOR

Pode:

- visualizar catálogo;
- acessar Games;
- visualizar Releases;
- visualizar Content Packs;
- visualizar Platforms;
- usar busca/filtros.

Não pode:

- criar Game;
- editar Game;
- criar/editar Release;
- criar/editar/archive/restore Content Pack;
- mutar Platform.

---

### EDITOR

Pode:

- criar Game;
- editar Game;
- criar Release;
- editar Release;
- criar Content Pack;
- editar Content Pack;
- archive/restore Content Pack.

Não pode:

- administrar Platforms;
- archive/restore Game.

---

### ADMIN

Pode tudo que EDITOR pode e também:

- criar Platform;
- editar Platform;
- ativar/desativar Platform;
- archive/restore Game.

---

### Revalidação

A UI não é fonte de autorização.

Toda mutation relevante revalida role no servidor.

---

## 11. Fluxos principais

### Criar Game

1. usuário autorizado abre `/admin/jogos/novo`;
2. preenche os metadados;
3. Server Action valida input;
4. Application valida permissão;
5. repository persiste;
6. UI retorna ao contexto administrativo.

### Criar Release

1. usuário entra no Game Workspace;
2. abre Releases;
3. escolhe uma Platform elegível;
4. informa key e region quando aplicável;
5. Application valida same-game/contexto;
6. valida Platform ativa;
7. persiste Release.

### Arquivar Game

1. ADMIN altera lifecycle;
2. Game permanece acessível;
3. edição continua possível;
4. novas Releases ficam bloqueadas;
5. novos Content Packs ficam bloqueados;
6. restore reabilita criação.

### Arquivar Content Pack

1. EDITOR ou ADMIN executa archive;
2. registro permanece existente;
3. histórico é preservado;
4. restore reativa o Content Pack.

---

## 12. Comportamentos transacionais

A 10C não exigiu transactions complexas equivalentes às introduzidas na 10D, mas estabeleceu operações consistentes de:

- create;
- update;
- lifecycle;
- validação de relações.

Writes permanecem coordenados na camada apropriada de Application/Infrastructure.

---

## 13. Testes e checks

A implementação original da 10C concluiu com:

- **103 testes passando**
- **7 skips condicionais**

Checks aprovados:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm db:check`

Também foram adicionados testes de regressão para as queries de contadores após bug encontrado em QA.

---

## 14. QA manual / Preview

A 10C passou por QA funcional ao vivo em Vercel Preview.

### Fluxos validados

- acesso anônimo;
- login;
- Game list;
- criação/edição de Game;
- Platforms;
- Releases;
- Content Packs;
- archive/restore;
- RBAC;
- navegação contextual;
- contadores;
- sidebar;
- persistência;
- redirects;
- estado visual.

### Fixture principal

Game:

```text
QA Game 10C
```

Game ID:

```text
cddd86e0-f2fc-486b-a61f-dec79a27128e
```

Platform:

```text
QA Platform 10C
```

Short name:

```text
QA10C
```

Releases:

```text
QA Global
QA Japan
```

Content Pack:

```text
QA Expansion
```

Esses fixtures foram reutilizados na QA da 10D.

---

## 15. Bugs encontrados e corrigidos

## 10C-QA-01 — contadores incorretos

### Sintoma

O Game mostrava:

```text
0 releases
0 conteúdos adicionais
```

mesmo existindo registros associados.

### Causa

Fragments Drizzle correlacionados geravam SQL em que referências como:

```sql
where "game_id" = "id"
```

podiam resolver o `id` no contexto incorreto da subquery.

### Correção

As contagens foram reestruturadas como agregações explícitas:

- `GROUP BY game_id`;
- `LEFT JOIN` explícito com `games.id`;
- `coalesce`;
- mapping numérico adequado.

Também foram adicionados testes de regressão de SQL/adapter.

### QA após correção

O Game Workspace passou a mostrar corretamente:

```text
2 releases
1 conteúdo adicional
```

---

## 10C-QA-02 — sidebar Overview sempre ativa

### Sintoma

O item Overview aparecia ativo mesmo quando o usuário estava em outras áreas do Admin.

### Causa

A lógica de active state não diferenciava corretamente a rota exata `/admin` das rotas descendentes.

### Correção

Foi criado/isolado um componente de navegação que diferencia:

- rota exata;
- descendants.

### QA após correção

Sidebar passou a destacar corretamente a seção atual.

---

## 16. Estado final dos fixtures de QA

### Game

- Name: `QA Game 10C`
- ID: `cddd86e0-f2fc-486b-a61f-dec79a27128e`
- Status: active
- Developer: `QA Studio`
- Publisher: `QA Publisher`

### Platform

- Name: `QA Platform 10C`
- Short name: `QA10C`
- Slug: `qa-platform-10c`
- Sort order: `999`
- Pode estar inativa no estado histórico final de QA.

### Releases

#### QA Global

- key: `qa-global`
- region: `null`

#### QA Japan

- key: `qa-japan`
- region: `JP`

### Content Pack

- Name: `QA Expansion`
- Slug: `qa-expansion`
- Type: `expansion`
- Estado final: active
- Description final de QA:

```text
Conteúdo editado pelo EDITOR no QA 10C.
```

---

## 17. Arquivos e módulos relevantes

Principais áreas:

```text
src/modules/catalog/
src/app/(admin)/admin/jogos/
src/app/(admin)/admin/plataformas/
src/config/routes.ts
tests/
```

Pontos relevantes incluem:

- catalog contracts;
- domain models;
- permissions;
- schemas;
- commands;
- queries;
- repositories;
- Server Actions;
- Game Workspace;
- Admin navigation;
- integration tests.

---

## 18. Decisões que NÃO devem ser revertidas

- Games continuam sendo a raiz contextual do catálogo administrativo.
- Releases pertencem a Game + Platform.
- Múltiplas Releases podem usar a mesma Platform.
- `region` pode ser nula.
- `key` de Release é única dentro do Game.
- Platform inativa não apaga histórico.
- Platform inativa não deve ser usada para nova Release.
- Game archived continua editável.
- Game archived bloqueia novas Releases e novos Content Packs.
- Content Packs usam lifecycle sem hard delete.
- Tipos de Content Pack permanecem controlados.
- Contadores devem ser derivados, não armazenados.
- UI não deve receber rows Drizzle crus.
- RBAC deve continuar sendo revalidado no servidor.
- Não adicionar schema/migrations apenas para simplificar o Admin.
- Não transformar Catalog Admin em arquitetura genérica excessiva antes da necessidade real.

---

## 19. Limitações conhecidas

Ao final da 10C ainda não existiam:

- Achievement Set management;
- Achievement Groups;
- Achievement Manager;
- Structured Paste;
- Media Manager;
- Guide Studio;
- public catalog pages;
- provider sync;
- progress;
- social features.

Esses itens eram deliberadamente futuros.

---

## 20. Dependências para próximas etapas

### 10D — Achievement Manager

Depende diretamente de:

- Game Workspace;
- Releases;
- Platforms;
- Content Packs;
- RBAC do catálogo;
- queries e repository boundaries da 10C.

### 10E — Media Manager

Reutiliza:

- Admin Shell;
- RBAC;
- patterns de listagem;
- forms;
- Server Actions;
- DTOs;
- lifecycle quando aplicável.

### 10F+

Guide Foundation poderá reutilizar:

- Games;
- Releases;
- Content Packs;
- navegação contextual;
- RBAC;
- arquitetura Catalog/Application.

---

## 21. Git checkpoint

- **Commit:** `fd28dec34b4b992886320f08e9f68ec14362566d`
- **Mensagem:** `feat(admin): implement catalog management`
- **Branch:** `main`
- **Remote oficial:** `https://github.com/Gyrierumu/locked0.git`
- **Etapa aprovada:** Sim
- **Checkpoint realizado:** Sim
- **Working tree limpo após checkpoint:** Sim
- **Schema/migrations alterados:** Não

Esse commit foi o HEAD base antes da implementação da ETAPA 10D.

---

## 22. Estado final aprovado

> A ETAPA 10C estabeleceu o Catalog Admin do LOCKED:0 como primeira feature administrativa completa sobre a fundação 10A/10B. Games, Platforms, Releases e Content Packs passaram a ser administráveis com RBAC, lifecycle, busca, filtros, paginação e navegação contextual por Game. O schema permaneceu congelado, os bugs encontrados em QA foram corrigidos e o checkpoint `fd28dec34b4b992886320f08e9f68ec14362566d` tornou-se a baseline funcional para a ETAPA 10D e demais áreas administrativas.
