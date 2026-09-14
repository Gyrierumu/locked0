# LOCKED:0 — ETAPA 10D — Achievement Set + Achievement Manager

## 1. Status

- **Estado:** ✅ Concluída e aprovada end-to-end
- **Nome da etapa:** Achievement Set + Achievement Manager
- **Objetivo principal:** implementar a administração completa de listas de conquistas/troféus, grupos e Achievements no contexto de cada Game
- **Base de dados:** schema congelado da ETAPA 10A
- **Identidade/RBAC:** reutiliza a fundação da ETAPA 10B
- **Catálogo:** reutiliza Games, Platforms, Releases e Content Packs da ETAPA 10C
- **Branch:** `main`
- **Etapa anterior:** 10C — Catalog Admin
- **Etapa seguinte:** 10E — Media Manager (concluída)
- **Checkpoint Git:** `cc191ca30f543bd9a1959f75d37a630b59fa2dae`
- **Mensagem do checkpoint:** `feat(admin): implement achievement management`
- **Preview final validado:** `https://locked0-84wmkk475-macedoguilherme765-3566s-projects.vercel.app`
- **Deployment final validado:** `dpl_BFki75ChybSXi2ncWnUVw5crvDgX`

> A 10D foi aprovada funcionalmente e em QA real no Preview. O checkpoint oficial está registrado nesta documentação.

---

## 2. Objetivo

A ETAPA 10D teve como objetivo transformar o modelo de Achievements já existente na baseline em uma ferramenta editorial completa dentro do Admin do LOCKED:0.

A etapa precisava permitir:

- criar e administrar Achievement Sets por Game;
- associar Sets a uma ou várias Releases;
- criar automaticamente o Base Group;
- criar e reorganizar Groups adicionais;
- associar Groups a Content Packs do mesmo Game;
- cadastrar Achievements manualmente;
- editar Achievements em uma grade administrativa;
- mover Achievements entre Groups preservando identidade;
- archive/restore;
- importar listas estruturadas via Structured Paste;
- pesquisar e filtrar;
- respeitar RBAC;
- manter operações multirow atômicas;
- preservar o schema congelado.

---

## 3. Escopo implementado

A 10D entregou:

### Achievement Sets

- listagem contextual por Game;
- criação;
- edição;
- lifecycle Active/Archived;
- associação N:N com Releases;
- Overview;
- workspace próprio;
- summary derivado;
- proteção contra URL cross-game;
- criação automática do Base Group na mesma transaction.

### Achievement Groups

- Base Group automático;
- criação de Groups adicionais;
- tipos controlados;
- associação opcional com Content Pack do mesmo Game;
- reorder;
- preservação de posições;
- proteção contra segundo Base Group;
- Base Group não removível.

### Achievements

- criação manual;
- edição inline;
- edição em inspector;
- mudança de Group;
- preservação do ID durante move;
- compactação/recalculo de posições;
- archive/restore;
- busca;
- filtros;
- paginação;
- ordenação canônica;
- summary por tipo/grupo/hidden/points.

### Structured Paste

- TSV;
- CSV básico;
- header opcional;
- Preview;
- validação;
- aliases em português;
- geração determinística de slug;
- detecção de duplicatas;
- conflitos com o banco;
- escolha de target Group;
- Apply atômico;
- add-only;
- limite aproximado de 500 linhas.

### QA patch

Após a primeira QA em Preview, foram corrigidos:

- stale UI após mutations;
- classificação incorreta/intermitente de erros de sessão como “sem permissão”;
- reset de scroll ao aplicar filtros.

---

## 4. Fora de escopo

A 10D **não** implementou:

- Guides;
- Guide Targets;
- Guide Studio;
- Checklist editorial;
- Media Manager;
- upload de ícones/imagens;
- edição arbitrária de `icon_path`;
- provider sync;
- PlayStation API;
- Xbox API;
- Steam API;
- scraping;
- progress de usuário;
- achievements públicos;
- social features;
- AI;
- coverage funcional;
- hard delete.

A área `Coverage` pode aparecer como futura/“Em breve”, mas não faz parte da implementação funcional da 10D.

---

## 5. Decisões arquiteturais

### 5.1 Achievement Set contextual por Game

Achievement Sets são administrados dentro do Game Workspace.

Rotas globais de Achievement Sets não são necessárias para o fluxo principal.

### 5.2 Platform derivada por Release

Achievement Set não armazena `platform_id`.

A relação oficial continua:

```text
Achievement Set
    ↕
release_achievement_sets
    ↕
Game Release
    ↓
Platform
```

Um Set pode se relacionar com múltiplas Releases.

### 5.3 Base Group automático

Ao criar um Achievement Set:

- o Set é criado;
- exatamente um Base Group é criado;
- os links com Releases são criados;
- tudo ocorre na mesma transaction.

Se qualquer parte falhar, a operação deve fazer rollback completo.

### 5.4 `type = base` é a verdade

O Base Group é identificado por:

```text
type = base
```

Não existe `is_base_game`.

### 5.5 Grade administrativa sem spreadsheet engine

O Achievement Manager usa tabela HTML semântica e controles de formulário.

Não foi introduzida dependência pesada de spreadsheet/grid.

### 5.6 Structured Paste com Preview obrigatório

O fluxo oficial é:

```text
Paste
→ Parse
→ Normalize
→ Validate
→ Preview
→ Apply
```

Nunca salvar diretamente a partir do texto colado.

### 5.7 Structured Paste add-only

No escopo atual:

- não sincroniza por nome;
- não atualiza Achievements existentes;
- não cria Groups automaticamente;
- não cria Content Packs automaticamente.

### 5.8 Queries derivam contadores

Counts e summaries são derivados.

Não foram adicionadas colunas redundantes de contagem.

---

## 6. Regras de domínio e contratos

## Achievement Set

### Regras

- pertence a um Game;
- `key` é única dentro do Game;
- pode se associar a múltiplas Releases;
- todas as Releases associadas devem pertencer ao mesmo Game;
- região pode ser opcional;
- lifecycle usa os estados já previstos pelo modelo;
- nenhuma Platform é gravada diretamente no Set;
- URL cross-game deve resultar em not found.

### Criação

A criação deve incluir atomicamente:

1. Achievement Set;
2. Base Group;
3. links Set ↔ Releases.

---

## Achievement Group

### Tipos oficiais

```text
base
dlc
expansion
update
mode
other
```

### Base Group

- criado automaticamente;
- nome recomendado/padrão: `Base Game`;
- `type = base`;
- posição inicial `0`;
- `content_pack_id = null`;
- nome pode ser editável;
- tipo continua `base`;
- não pode existir segundo Base Group;
- não deve ser removido pelo fluxo administrativo normal.

### Groups adicionais

- não podem usar `base`;
- podem apontar para Content Pack do mesmo Game;
- associação com Content Pack não é automática;
- Content Pack histórico pode permanecer visível;
- reorder recalcula posições.

---

## Achievement

### Tipos oficiais

```text
bronze
silver
gold
platinum
standard
```

### Regras

- pertence a um Achievement Group;
- slug é único dentro do Group;
- `points` pode ser `null`;
- quando informado, `points >= 0`;
- `is_hidden` é booleano;
- `position` define ordem dentro do Group;
- move entre Groups preserva ID;
- move compacta posições de origem e destino;
- archive/restore preserva identidade;
- não existe hard delete administrativo.

### Ordenação canônica

```text
group.position
→ achievement.position
```

---

## 7. Modelo de dados

A 10D utiliza exclusivamente tabelas existentes na baseline.

### Tabelas principais

- `achievement_sets`
- `release_achievement_sets`
- `achievement_groups`
- `achievements`

### Tabelas relacionadas

- `games`
- `game_releases`
- `platforms`
- `content_packs`

### Schema

- **Houve alteração de schema nesta etapa?** Não.
- **Houve migration?** Não.
- **Drizzle baseline alterada?** Não.
- **`drizzle push` executado?** Não.

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
Achievement Repository port
   ↓
Drizzle Achievement Repository
   ↓
PostgreSQL
```

### Queries

Contratos conceituais incluem:

- `listGameAchievementSets`
- `getAchievementSetWorkspace`
- `listGroups`
- `listAchievements`

Summary é derivado a partir das queries do workspace/lista.

### Commands

Contratos conceituais incluem:

- create/update Achievement Set;
- replace Release links;
- create/update/reorder Groups;
- create/update Achievement;
- move Achievement;
- archive/restore;
- preview Structured Paste;
- apply Structured Paste.

### Server Actions

Devem permanecer finas.

Responsabilidades:

- parse de input;
- validação Zod;
- autenticação/autorização;
- chamada da Application;
- mapeamento de erro;
- refresh/revalidation da UI.

### Transactions

Operações multirow são coordenadas na camada apropriada de Application/Infrastructure.

---

## 9. Rotas e experiência administrativa

### Achievement Sets do Game

```text
/admin/jogos/[gameId]/achievement-sets
```

Funções:

- listar Sets;
- exibir estado vazio;
- criar novo Set;
- mostrar resumo derivado.

### Achievement Set Workspace

```text
/admin/jogos/[gameId]/achievement-sets/[setId]
```

Views:

```text
Overview
Groups
Achievements
Coverage — Em breve
```

Na implementação atual, as views podem ser representadas por query param:

```text
?view=overview
?view=groups
?view=achievements
```

### Overview

Permite:

- editar metadados;
- alterar lifecycle;
- substituir associações com Releases.

### Groups

Permite:

- visualizar Base Group;
- criar Groups;
- editar;
- associar Content Pack;
- reorder.

### Achievements

Permite:

- adicionar;
- editar inline;
- abrir inspector;
- mover;
- archive/restore;
- buscar;
- filtrar;
- Structured Paste.

---

## 10. RBAC e segurança

### AUTHOR

Pode:

- visualizar Achievement Sets;
- visualizar Groups;
- visualizar Achievements;
- usar busca;
- usar filtros.

Não pode:

- criar;
- editar;
- mover;
- reorder;
- archive/restore;
- alterar Releases;
- usar Structured Paste para Apply.

A UI deve aparecer em modo read-only.

---

### EDITOR

Pode:

- criar/editar Achievement Set;
- alterar links com Releases;
- criar/editar/reordenar Groups;
- criar/editar/mover Achievements;
- archive/restore;
- usar Structured Paste.

---

### ADMIN

Possui as mesmas operações funcionais da 10D que EDITOR, além das capacidades administrativas globais já existentes no sistema.

---

### Segurança

- toda mutation chama autorização server-side;
- Application volta a validar a capacidade necessária;
- role nunca é confiada ao client;
- Structured Paste revalida identidade no Apply;
- falhas de sessão, autenticação e autorização são classificadas separadamente após o patch de QA.

---

## 11. Fluxos principais

### Criar Achievement Set

1. usuário entra no Game;
2. abre Achievement Sets;
3. informa nome, key, região, status e Releases;
4. Application valida Game e Releases;
5. transaction cria Set;
6. transaction cria Base Group;
7. transaction cria links com Releases;
8. commit;
9. workspace do Set fica disponível.

### Criar Group

1. usuário abre `Groups`;
2. informa nome e tipo;
3. opcionalmente escolhe Content Pack;
4. Application valida same-game;
5. Group recebe posição;
6. repository persiste.

### Reorder Groups

1. usuário move Group para cima/baixo;
2. Application valida todos os IDs;
3. positions são recalculadas;
4. operação ocorre em transaction.

### Criar Achievement

1. usuário abre `Achievements`;
2. informa name, slug, type, Group, hidden, points, status e descrição;
3. Application valida Group;
4. posição é calculada;
5. Achievement é persistido.

### Mover Achievement

1. usuário altera Group;
2. Application valida Group de destino;
3. mesmo Achievement ID é preservado;
4. posição do destino é calculada;
5. posições de origem e destino são compactadas;
6. transaction é concluída.

### Structured Paste

1. usuário escolhe target Group;
2. cola TSV/CSV;
3. parser identifica header quando presente;
4. valores são normalizados;
5. aliases são convertidos;
6. slugs são gerados quando ausentes;
7. Preview mostra linhas válidas/inválidas;
8. nenhum write acontece no Preview;
9. Apply revalida todo o lote;
10. qualquer falha bloqueia o lote inteiro;
11. transaction grava tudo ou nada.

---

## 12. Comportamentos transacionais

As seguintes operações são explicitamente atômicas:

### Criar Set

```text
Achievement Set
+ Base Group
+ Release links
```

Falha em qualquer parte:

```text
ROLLBACK
```

### Substituir Release links

A atualização das associações deve preservar o Set e substituir os vínculos de forma consistente.

### Reorder de Groups

Todas as posições são recalculadas como uma unidade consistente.

### Move de Achievement

Inclui:

- mudança de Group;
- posição no destino;
- compactação da origem;
- compactação do destino;
- preservação do Achievement ID.

### Structured Paste Apply

Todas as linhas válidas são revalidadas dentro da operação de Apply.

Se qualquer linha falhar:

```text
ROLLBACK DO LOTE INTEIRO
```

Não existe importação parcial silenciosa.

---

## 13. Testes e checks

### Implementação original

A primeira implementação da 10D reportou:

- **152 testes passando**
- **2 skips condicionais existentes**
- integração PostgreSQL local da 10D: **3/3**
- arquitetura/schema: **15/15**

### Após patch de QA

Resultado final:

- **163 testes passando**
- **2 skips condicionais existentes**

Cobertura de regressão adicionada para:

- move entre Groups nos dois sentidos;
- preservação de Achievement ID;
- positions;
- lifecycle do Set;
- ADMIN Apply;
- EDITOR Apply;
- AUTHOR bloqueado;
- classificação de erro de claims;
- classificação de erro de persistência;
- construção dos filtros;
- reset de paginação.

### Checks finais

Todos aprovados:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm db:check`
- architecture/boundaries incluídos na suíte

Nenhuma migration foi criada.

---

## 14. QA manual / Preview

A 10D passou por QA funcional completa em Vercel Preview.

### Primeiro Preview

Foram validados:

- Achievement Sets;
- Base Group;
- Groups;
- Content Pack;
- reorder;
- criação manual de Achievement;
- move;
- archive/restore;
- Structured Paste;
- Preview sem write;
- aliases;
- slugs;
- duplicatas;
- atomicidade;
- busca;
- filtros;
- N:N com Releases;
- lifecycle do Set;
- RBAC EDITOR;
- RBAC AUTHOR.

### Preview final após patch

URL:

```text
https://locked0-84wmkk475-macedoguilherme765-3566s-projects.vercel.app
```

Deployment:

```text
dpl_BFki75ChybSXi2ncWnUVw5crvDgX
```

Status:

```text
READY
```

Smoke checks:

- `/` → `200`
- `/login` → `200`
- `/admin` anônimo → `307` para login
- nenhum 5xx;
- nenhum runtime error relevante;
- nenhuma falha Supabase/DB.

### QA final do patch

Foram revalidados ao vivo:

1. quick edit de Group atualizando imediatamente;
2. status do Set atualizando imediatamente;
3. Structured Paste aplicando na primeira tentativa;
4. filtros preservando scroll.

Todos passaram.

---

## 15. Bugs encontrados e corrigidos

## 10D-QA-01 — stale UI após mutations

### Sintoma

Após mutation bem-sucedida, a UI podia continuar mostrando o valor anterior.

Reproduzido em:

- Achievement Group via quick edit;
- status do Achievement Set no Overview.

A persistência no banco estava correta.

### Causa

A implementação dependia do refresh implícito da Server Action e reutilizava Client Components com controles baseados em `defaultValue`.

Esse conjunto permitia que o resultado retornasse `success` enquanto a árvore/controles ainda representavam o DTO anterior.

### Correção

Foi criado refresh client-side somente após `success` confirmado.

Os controles também passaram a receber uma chave derivada do DTO persistido para reinicialização adequada.

Não foi introduzido optimistic update.

### QA após correção

Validado ao vivo:

- `QA Mode Group → Base Game`;
- UI mostrou `Base Game` imediatamente;
- status `Active → Archived`;
- UI mostrou `Archived` imediatamente;
- retorno `Archived → Active` também passou.

---

## 10D-QA-02 — mensagem intermitente de permissão no Structured Paste

### Sintoma

Em uma tentativa de Apply como ADMIN, a UI mostrou erro de falta de permissão.

Na segunda tentativa, sem mudança intencional de role, o Apply funcionou.

### Investigação

A ocorrência original não pôde ser reproduzida nem comprovada por logs.

Foi encontrado um defeito concreto compatível com o sintoma:

- erro em `supabase.auth.getClaims()` era tratado como usuário anônimo;
- `UnauthenticatedError` e `ForbiddenError` convergiam para mensagem semelhante de “sem permissão”.

### Correção

`getVerifiedIdentity` passou a:

- lançar `IdentityProviderError` quando `getClaims()` falha;
- retornar `null` apenas quando realmente não existe subject autenticado.

O mapeamento passou a diferenciar:

- autorização insuficiente;
- sessão ausente/expirada;
- falha temporária de validação de sessão;
- erro de persistência/operação.

Nenhum bypass de ADMIN foi criado.

### QA após correção

Structured Paste foi aplicado como ADMIN na **primeira tentativa** no Preview final.

---

## 10D-QA-03 — filtros resetavam scroll

### Sintoma

Aplicar busca/filtro em Achievements fazia a página voltar ao topo.

### Correção

O formulário de filtros foi isolado em Client Component pequeno.

A navegação passou a usar:

```ts
router.push(href, { scroll: false })
```

A URL continua refletindo:

- search;
- group;
- type;
- status;
- hidden.

Mudança de filtro remove `page`.

A query e tabela continuam server-side.

### QA após correção

Validado ao vivo:

- filtro foi aplicado;
- resultados mudaram;
- URL continuou compartilhável;
- scroll permaneceu aproximadamente na mesma posição.

---

## 16. Estado final dos fixtures de QA

### Game

```text
QA Game 10C
```

ID:

```text
cddd86e0-f2fc-486b-a61f-dec79a27128e
```

### Achievement Set

```text
QA Achievement Set 10D
```

ID:

```text
44a11c14-5215-4117-9e0d-d2ba447f4043
```

Estado final:

```text
Active
```

### Releases associadas

```text
QA Global
QA Japan
```

### Groups

Ordem final aprovada:

```text
Base Game
QA Mode Group
QA Expansion Group
```

### Content Pack

`QA Expansion Group` foi testado com associação ao:

```text
QA Expansion
```

### Achievements finais de QA

Após a QA final existem pelo menos:

```text
QA Platinum 10D
QA Hidden Gold 10D
QA Silver 10D
QA Standard 10D
QA Manual Achievement 10D Editor
QA Paste Permission 10D
```

Total validado no Preview final:

```text
6 conquistas
```

`QA Manual Achievement 10D Editor` terminou em:

```text
Base Game
```

`QA Paste Permission 10D` foi criado via Structured Paste no teste final.

Esses dados são fixtures de QA e não fazem parte do domínio de produção.

---

## 17. Arquivos e módulos relevantes

Principais áreas:

```text
src/app/(admin)/admin/jogos/[gameId]/achievement-sets/
src/modules/catalog/application/commands/
src/modules/catalog/application/queries/
src/modules/catalog/application/ports/
src/modules/catalog/delivery/actions/
src/modules/catalog/delivery/components/
src/modules/catalog/infrastructure/repositories/
src/modules/identity/infrastructure/
tests/integration/
```

Componentes/arquivos conceitualmente relevantes incluem:

- Achievement Set list/workspace;
- Achievement Set form;
- Group form/list/reorder;
- Achievement Manager;
- Achievement row quick edit;
- Achievement inspector;
- Structured Paste;
- filters;
- refresh-after-success;
- achievement actions;
- action error mapping;
- Drizzle Achievement Repository;
- identity provider error handling;
- integration tests.

---

## 18. Decisões que NÃO devem ser revertidas

- Achievement Set continua contextual por Game.
- Achievement Set não recebe `platform_id`.
- Plataforma continua derivada via Releases.
- Relação Set ↔ Release continua N:N.
- Criar Set deve criar Base Group na mesma transaction.
- Base Group é identificado por `type = base`.
- Não criar `is_base_game`.
- Base Group não recebe Content Pack.
- Não criar segundo Base Group.
- Groups adicionais não podem usar tipo `base`.
- Content Pack associado a Group deve pertencer ao mesmo Game.
- Não criar automaticamente Group a partir de Content Pack.
- Achievement move deve preservar ID.
- Move/reorder deve recalcular positions.
- Slug continua único dentro do Group.
- Structured Paste continua Preview-first.
- Structured Paste continua add-only no escopo atual.
- Structured Paste não cria Groups automaticamente.
- Structured Paste deve ser atômico.
- Não introduzir spreadsheet engine pesado.
- Queries devem evitar N+1.
- Counts devem ser derivados.
- UI não deve receber rows Drizzle crus.
- Server Actions devem permanecer finas.
- Autorização deve continuar server-side.
- AUTHOR continua read-only.
- EDITOR continua autorizado a mutações da 10D.
- Não relaxar RBAC para contornar falhas de sessão.
- Filtros devem continuar refletidos na URL.
- Preservação de scroll não deve transformar toda a página em client-side.
- Nenhuma mudança de schema deve ser feita por conveniência desta feature.

---

## 19. Limitações conhecidas

Ao final da 10D ainda não existem:

- upload de ícones;
- Media Manager;
- provider sync;
- PlayStation/Xbox/Steam APIs;
- progress do jogador;
- Achievement pages públicas;
- Guide Targets;
- Guide Studio;
- coverage funcional;
- readiness editorial;
- social features.

`icon_path` existe no modelo, mas a 10D não implementa upload/edição arbitrária de mídia.

Esses itens pertencem a etapas posteriores.

---

## 20. Dependências para próximas etapas

### 10E — Media Manager

Fornecerá a infraestrutura central de mídia necessária para:

- ícones;
- capas;
- imagens de jogo;
- assets editoriais;
- futura integração com Achievements e Guides.

### 10F — Guide Foundation

Poderá reutilizar:

- Games;
- Achievement Sets;
- Groups;
- Achievements;
- Content Packs;
- RBAC;
- navegação contextual;
- Application patterns.

### 10G+

Structured Content poderá relacionar conteúdo editorial a:

- Achievements;
- Guide Targets;
- Content Packs;
- Media Assets.

### Progress

O módulo de progresso poderá usar os IDs estáveis de Achievements e Sets estabelecidos aqui.

---

## 21. Git checkpoint

- **Checkpoint funcional da etapa:** aprovado
- **Commit final:** `cc191ca30f543bd9a1959f75d37a630b59fa2dae`
- **Mensagem do checkpoint:** `feat(admin): implement achievement management`
- **Branch:** `main`
- **Remote oficial:** `https://github.com/Gyrierumu/locked0.git`
- **Schema/migrations alterados:** Não
- **Etapa concluída e aprovada:** Sim
- **Estado após o checkpoint:** código da etapa consolidado; a documentação canônica permaneceu fora do checkpoint funcional para fechamento posterior

---

## 22. Estado final aprovado

> A ETAPA 10D estabeleceu o Achievement Set + Achievement Manager do LOCKED:0 como uma feature administrativa completa sobre a fundação das etapas 10A–10C. Achievement Sets, Groups e Achievements podem ser administrados com RBAC, lifecycle, transactions, Structured Paste, busca, filtros e preservação de identidade. O schema permaneceu congelado. Os bugs encontrados em QA foram corrigidos e revalidados em Preview real. O checkpoint `cc191ca30f543bd9a1959f75d37a630b59fa2dae` consolidou a arquitetura e os contratos desta etapa como baseline para Media, Guides, Progress e futuras integrações de plataforma.
