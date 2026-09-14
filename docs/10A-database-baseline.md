# LOCKED:0 — ETAPA 10A — Database Baseline / Schema Freeze

## 1. Status

- **Estado:** ✅ Aprovada
- **Nome da etapa:** Database Baseline / Schema Freeze
- **Objetivo principal:** congelar a primeira baseline oficial do banco PostgreSQL/Drizzle do LOCKED:0
- **Banco:** PostgreSQL
- **ORM:** Drizzle
- **Ambiente de desenvolvimento:** Supabase
- **Total de tabelas públicas:** 25
- **Etapa relacionada posterior:** 10A.1 — Runtime DB Validation
- **Etapa seguinte:** 10B — Identity + RBAC + Admin Shell
- **Commit final:** não registrado neste resumo por não estar disponível no contexto canônico atual
- **Branch:** `main`

> Esta etapa estabeleceu a primeira baseline oficial do modelo de dados do LOCKED:0.
>
> A partir deste ponto, o schema deixou de ser tratado como rascunho e passou a ser uma fundação versionada que etapas posteriores devem respeitar.

---

## 2. Objetivo

A ETAPA 10A teve como objetivo transformar o modelo conceitual já definido para o LOCKED:0 em uma baseline PostgreSQL/Drizzle real, consistente e verificável.

A etapa precisava garantir que:

- o domínio já planejado estivesse representado em tabelas reais;
- relações e constraints importantes existissem no banco;
- foreign keys estivessem corretas;
- indexes relevantes estivessem presentes;
- o schema pudesse ser criado de forma reproduzível;
- a baseline fosse única e estável;
- Drizzle se tornasse o único owner de migrations;
- etapas administrativas posteriores pudessem ser implementadas sem redesenhar o banco a cada feature.

---

## 3. Escopo implementado

A 10A entregou:

- definição Drizzle das 25 tabelas da baseline;
- organização do schema por áreas de domínio;
- relations;
- foreign keys;
- constraints;
- indexes;
- partial indexes quando necessários;
- integração de foreign keys com `auth.users`;
- uma migration baseline única;
- testes de schema;
- validações automatizadas;
- comando `db:check`;
- documentação da baseline;
- ambiente Supabase local funcional para aplicação e validação da migration.

A baseline foi aplicada com sucesso e validada antes da aprovação da etapa.

---

## 4. Fora de escopo

A 10A **não** implementou:

- autenticação administrativa completa;
- RBAC de aplicação;
- Admin Shell;
- Catalog Admin;
- Achievement Manager;
- Media Manager;
- Guide Studio;
- progresso de usuário;
- UI pública;
- sincronização com PlayStation, Xbox ou Steam;
- RLS completo;
- políticas de autorização por feature;
- provider sync;
- scraping;
- APIs externas de plataforma.

Esses itens pertencem a etapas posteriores.

---

## 5. Decisões arquiteturais

### 5.1 PostgreSQL como fonte de verdade

O banco PostgreSQL do LOCKED:0 é a fonte de verdade interna do domínio.

APIs externas futuras poderão alimentar o sistema, mas seus dados deverão ser normalizados antes de se tornarem parte do modelo interno.

### 5.2 Drizzle como único owner de migrations

Foi decidido que:

- Drizzle controla migrations;
- não será mantido um segundo histórico paralelo em `supabase/migrations`;
- `drizzle push` não deve ser usado como substituto do fluxo versionado de migrations.

Essa decisão evita divergência entre dois sistemas de migration.

### 5.3 Baseline única

A primeira versão consolidada do banco foi registrada como uma única baseline:

```text
drizzle/0000_baseline.sql
```

Essa baseline representa o ponto inicial oficial do banco do LOCKED:0.

### 5.4 Schema Freeze

Após aprovação da 10A, o schema passou a ser considerado congelado para as etapas administrativas imediatamente seguintes.

Isso não significa que o banco nunca poderá evoluir.

Significa que qualquer mudança futura deve ser:

- deliberada;
- justificada;
- versionada;
- tratada como alteração real de arquitetura/modelo;
- nunca feita apenas para facilitar uma implementação local.

### 5.5 Modularidade sem microservices

O modelo foi preparado para um Modular Monolith.

As tabelas refletem áreas de domínio distintas, mas permanecem no mesmo PostgreSQL e na mesma aplicação.

---

## 6. Regras de domínio e contratos

A baseline preserva os seguintes contratos importantes:

### Catalog

- `Game` é a entidade central do catálogo.
- um Game pode possuir múltiplas Releases;
- Releases pertencem a Platforms;
- um Game pode possuir múltiplos Content Packs;
- Achievement Sets pertencem a um Game;
- Achievement Sets se relacionam com Releases por N:N;
- a plataforma de um Achievement Set não é armazenada diretamente;
- Achievement Groups pertencem a Achievement Sets;
- Achievements pertencem a Achievement Groups.

### Achievement Set / Platform

A relação oficial é:

```text
Achievement Set
    ↕
release_achievement_sets
    ↕
Game Release
    ↓
Platform
```

Portanto:

- `achievement_sets` não recebe `platform_id`;
- a plataforma é derivada pelas Releases associadas.

### Base Group

O modelo usa o tipo do grupo como verdade de domínio.

Não existe campo redundante como:

```text
is_base_game
```

O grupo base é representado por:

```text
type = base
```

### Identidade

- Supabase Auth permanece responsável por usuários autenticados;
- tabelas internas podem referenciar `auth.users`;
- a baseline contém relações necessárias para Identity sem duplicar o sistema de Auth.

### Lifecycle

O modelo privilegia preservação histórica.

Hard delete não é o fluxo administrativo padrão do projeto.

---

## 7. Modelo de dados

A baseline contém **25 tabelas**.

### Catalog — 8

1. `games`
2. `platforms`
3. `game_releases`
4. `achievement_sets`
5. `release_achievement_sets`
6. `content_packs`
7. `achievement_groups`
8. `achievements`

### Editorial — 10

1. `guides`
2. `guide_targets`
3. `guide_steps`
4. `guide_sections`
5. `guide_content_nodes`
6. `guide_content_node_targets`
7. `guide_content_node_achievements`
8. `checklist_items`
9. `checklist_item_achievements`
10. `guide_versions`

### Identity — 2

1. `profiles`
2. `user_roles`

### Media — 1

1. `media_assets`

### Progress — 4

1. `user_completions`
2. `user_achievement_progress`
3. `user_guide_progress`
4. `user_checklist_progress`

### Foreign keys para Supabase Auth

A baseline possui **7 foreign keys** relacionadas a `auth.users`.

Para representar `auth.users` no schema Drizzle, foi utilizado o suporte correspondente do `drizzle-orm/supabase`.

### Schema

- **Houve alteração de schema nesta etapa?** Sim — esta etapa criou a baseline inicial.
- **Houve migration?** Sim.
- **Migration oficial:** `drizzle/0000_baseline.sql`
- **Quantidade de tabelas públicas após aplicação:** 25

---

## 8. Arquitetura da implementação

A 10A concentrou-se na camada de persistência e contratos de dados.

Estrutura conceitual:

```text
Domain model planejado
        ↓
Drizzle schema
        ↓
Migration baseline
        ↓
PostgreSQL / Supabase
```

A implementação estabeleceu:

- arquivos de schema Drizzle organizados por domínio;
- relations;
- constraints;
- foreign keys;
- indexes;
- migration baseline;
- scripts/checks de validação;
- testes de schema.

A lógica de negócio de features administrativas ainda não fazia parte desta etapa.

---

## 9. Rotas e experiência administrativa

Nenhuma UI administrativa funcional era objetivo da 10A.

A etapa trabalhou na fundação necessária para que rotas administrativas pudessem ser construídas nas etapas seguintes.

Portanto, não há rotas de produto cuja implementação seja atribuída à 10A.

---

## 10. RBAC e segurança

A 10A preparou o modelo de dados necessário para Identity, mas não entregou o fluxo completo de RBAC da aplicação.

### AUTHOR

Não implementado funcionalmente nesta etapa.

### EDITOR

Não implementado funcionalmente nesta etapa.

### ADMIN

Não implementado funcionalmente nesta etapa.

A tabela `user_roles` faz parte da baseline, mas a leitura e aplicação das permissões foram implementadas na 10B.

### Segurança de banco

RLS completo não foi ativado como requisito desta etapa.

A ausência de RLS na 10A foi deliberada e não deve ser interpretada como esquecimento.

---

## 11. Fluxos principais

### Aplicar a baseline

1. preparar o banco PostgreSQL/Supabase;
2. utilizar a migration oficial do Drizzle;
3. aplicar `0000_baseline.sql`;
4. validar o número de tabelas;
5. validar constraints e foreign keys;
6. executar checks automatizados;
7. confirmar que o schema gerado corresponde ao estado versionado.

### Validar ausência de drift

1. executar a geração/check do Drizzle;
2. confirmar que não há migration inesperada;
3. executar `db:check`;
4. comparar o banco com a baseline esperada.

---

## 12. Comportamentos transacionais

A 10A não implementou orchestration de Application para features administrativas, mas estabeleceu a estrutura que permite transactions nas etapas seguintes.

A baseline deve suportar corretamente operações atômicas futuras como:

- criação de Set + Base Group + links;
- reorder;
- move;
- Structured Paste;
- associações de entidades;
- publicação editorial.

A responsabilidade dessas transactions pertence às respectivas etapas de aplicação.

---

## 13. Testes e checks

A etapa incluiu:

- testes de schema;
- validação das relations;
- validação de constraints;
- validação de foreign keys;
- validação de indexes relevantes;
- `db:check`;
- verificação de ausência de drift após aplicação da baseline.

### Resultado final conhecido

- baseline aplicada com sucesso;
- 25 tabelas públicas confirmadas;
- 7 foreign keys para `auth.users` confirmadas;
- `db:generate` sem pendências após aplicação;
- `db:check` aprovado.

Os números exatos de testes unitários da execução original não estão presentes no contexto canônico atual e não são inferidos neste documento.

---

## 14. QA manual / ambiente

A baseline foi validada em ambiente Supabase local.

Contexto técnico registrado durante a etapa:

- Docker Desktop: `29.6.2`
- pnpm: `12.3.4`
- Supabase CLI: `2.117.0`

O ambiente local disponibilizou:

- Auth;
- REST;
- Realtime;
- Storage;
- Studio.

Após a 10A, a etapa 10A.1 validou também o runtime contra o ambiente Cloud DEV.

---

## 15. Bugs encontrados e corrigidos

Não há bugs funcionais específicos da 10A preservados como decisão canônica neste momento.

A etapa passou por refinamentos de schema, relations, constraints, foreign keys e indexes antes do congelamento final.

Somente o estado final aprovado deve ser considerado baseline.

---

## 16. Estado final dos fixtures de QA

A 10A não depende de fixtures funcionais de catálogo para definir seu estado final.

O principal fixture da etapa é o próprio schema:

- 25 tabelas públicas;
- migration baseline aplicada;
- relations e constraints válidas;
- foreign keys de Auth funcionais.

Nenhuma credencial ou secret deve ser registrada neste documento.

---

## 17. Arquivos e módulos relevantes

Principais áreas relacionadas à 10A:

```text
drizzle/
src/db/schema/
scripts/
tests/
```

Arquivo central da baseline:

```text
drizzle/0000_baseline.sql
```

Outros pontos relevantes incluem:

- configuração Drizzle;
- schemas por domínio;
- relations;
- scripts de `db:check`;
- testes de schema.

A lista completa de arquivos da execução original não é necessária para o resumo canônico.

---

## 18. Decisões que NÃO devem ser revertidas

As seguintes decisões fazem parte da baseline aprovada:

- PostgreSQL é a fonte de verdade interna.
- Drizzle é o único owner de migrations.
- Não criar histórico paralelo em `supabase/migrations`.
- Não usar `drizzle push` como fluxo normal de evolução do schema.
- A baseline oficial começa em `drizzle/0000_baseline.sql`.
- Achievement Set não possui `platform_id` direto.
- A plataforma do Set é derivada via Releases.
- `release_achievement_sets` representa a relação N:N.
- `achievement_groups.type = base` é a verdade para Base Group.
- Não criar `is_base_game` redundante.
- Hard delete não é o lifecycle administrativo padrão.
- APIs externas futuras não substituem o modelo interno.
- Supabase Auth continua sendo a fonte de identidade autenticada.
- Mudanças de schema posteriores precisam de decisão explícita e migration versionada.

---

## 19. Limitações conhecidas

No final da 10A ainda não existiam:

- Admin Shell funcional;
- RBAC aplicado na UI;
- Catalog Admin;
- Achievement Manager;
- Media Manager;
- Guide Studio;
- RLS completo;
- progress tracking funcional;
- integrações externas;
- experiência pública.

Essas ausências são deliberadas e pertencem a etapas posteriores.

---

## 20. Dependências para próximas etapas

A 10A fornece a fundação para praticamente todo o restante do projeto.

### 10B depende de

- `profiles`;
- `user_roles`;
- relações com `auth.users`.

### 10C depende de

- `games`;
- `platforms`;
- `game_releases`;
- `content_packs`.

### 10D depende de

- `achievement_sets`;
- `release_achievement_sets`;
- `achievement_groups`;
- `achievements`.

### 10E depende de

- `media_assets`.

### 10F–10I dependem de

- tabelas Editorial;
- relações Catalog ↔ Editorial;
- modelo de Media;
- Identity;
- estrutura de Progress quando aplicável.

---

## 21. Git checkpoint

- **Commit:** não disponível no contexto canônico atual
- **Mensagem:** não disponível no contexto canônico atual
- **Branch:** `main`
- **Etapa aprovada:** Sim
- **Schema/migrations revisados:** Sim
- **Baseline congelada:** Sim

Quando o commit histórico exato da 10A for recuperado do Git, esta seção pode ser atualizada sem alterar as decisões arquiteturais do documento.

---

## 22. Estado final aprovado

> A ETAPA 10A estabeleceu e congelou a primeira baseline oficial de banco do LOCKED:0 com 25 tabelas PostgreSQL, relations, constraints, foreign keys, indexes e uma migration Drizzle única. A partir deste checkpoint, essa baseline é a fundação de dados das etapas seguintes e não deve ser modificada por conveniência de implementação. Qualquer evolução futura de schema deve ser explícita, versionada e arquiteturalmente justificada.
