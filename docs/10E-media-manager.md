# LOCKED:0 — ETAPA 10E — Media Manager

## 1. Status

- **Estado:** ✅ Concluída e aprovada end-to-end
- **Nome da etapa:** Media Manager + Storage + Catalog Media Integration
- **Objetivo principal:** implementar a biblioteca editorial de mídia, o pipeline seguro de upload e as integrações de mídia do catálogo administrativo
- **Base de dados:** schema congelado da ETAPA 10A
- **Identidade/RBAC:** reutiliza integralmente a fundação da ETAPA 10B
- **Catálogo:** integra Games, Platforms e Achievements entregues nas ETAPAS 10C e 10D
- **Branch:** `main`
- **Etapa anterior:** 10D — Achievement Set + Achievement Manager
- **Checkpoint Git:** `c7666005a2c51830f91a1c892b7531eb1fcb4f4d`
- **Mensagem do checkpoint:** `feat(admin): implement media management`
- **Preview final do patch de QA:** `https://locked0-2xw7r8ghb-macedoguilherme765-3566s-projects.vercel.app`
- **Deployment final do patch de QA:** `dpl_2zLixfRE3KWZm8jkq4jd1cJhYjBJ`

> A 10E foi aprovada funcionalmente e tecnicamente. O Media Manager, suas integrações de catálogo, o incidente Supavisor e os patches finais de QA estão consolidados no checkpoint oficial.

---

## 2. Objetivo

A ETAPA 10E teve como objetivo transformar a infraestrutura de `media_assets` já prevista na baseline em uma ferramenta editorial completa dentro do Admin do LOCKED:0.

A etapa precisava entregar:

- módulo Media com boundaries próprios;
- abstração central de Storage;
- upload direto do browser por autorização assinada;
- validação e normalização autoritativas no servidor;
- persistência de `MediaAsset` finalizado;
- biblioteca administrativa em `/admin/media`;
- Media Picker reutilizável;
- lifecycle active/retired e hard delete restrito;
- detecção de referências atuais;
- integração com Game cover, Game hero, Platform icon e Achievement icon;
- preservação do schema congelado;
- funcionamento estável com `postgres.js` e Supavisor Transaction Pooler.

---

## 3. Decisões arquiteturais

O módulo segue o fluxo:

```text
Admin UI / Browser
   ↓
Server Actions e API administrativa
   ↓
Media Application Commands / Queries
   ↓
Domain permissions e lifecycle
   ↓
Media Repository e Storage ports
   ↓
Drizzle/PostgreSQL + Supabase Storage adapters
```

Decisões que devem ser preservadas:

- `supabase.storage` permanece centralizado em infraestrutura;
- componentes e domínio não conhecem o provider de Storage;
- Service Role é server-only;
- o browser recebe somente autorização temporária para o objeto de staging;
- paths finais são gerados pelo servidor;
- o objeto final é imutável e nunca usa overwrite/upsert;
- o cliente seleciona `mediaAssetId`, nunca injeta um `storagePath` arbitrário;
- catálogo e Media permanecem módulos separados, integrados por APIs server-side;
- o paralelismo seguro de queries independentes é preservado.

---

## 4. Módulo Media e `media_assets`

O módulo Media foi organizado em:

- `domain`: permissões, policy, erros e tipos de uso;
- `application`: commands, queries e ports;
- `infrastructure`: repository Drizzle, processamento Sharp e adapter Supabase;
- `delivery`: Server Actions, schemas e componentes administrativos;
- API pública server-only em `src/modules/media/server.ts`;
- helper browser-only para upload direto ao staging.

`media_assets` continua sendo a fonte de metadata do asset final:

- identidade e `storage_path`;
- nome original e MIME final;
- tamanho, largura e altura;
- SHA-256 quando aplicável;
- escopo opcional por Game;
- source URL e credit;
- autoria;
- `first_published_at`;
- `retired_at`;
- timestamps.

### Dívida conhecida de `created_by`

`created_by` é fisicamente nullable no schema congelado e usa `ON DELETE SET NULL` para preservar histórico quando um usuário do Auth é removido.

A Application da 10E sempre informa o ator autenticado ao finalizar novos uploads, mas a nulabilidade física permanece uma dívida conhecida. Nenhuma migration foi criada na 10E para alterar essa característica.

---

## 5. Storage e buckets

Buckets oficiais:

### `locked0-media-staging`

- privado;
- temporário;
- recebe o upload direto do browser somente por signed upload;
- path vinculado ao ator e ao `assetId` gerado pelo servidor;
- não é usado como origem pública definitiva.

### `locked0-media`

- público para leitura;
- gravado apenas pelo adapter server-only;
- contém os objetos finais normalizados;
- usa paths imutáveis no formato `editorial/{assetId}/asset.{ext}`;
- objetos finais são escritos com `upsert: false`;
- cache público de longa duração é seguro porque o path não é sobrescrito.

Os dois buckets aceitam somente JPEG, PNG, WebP e AVIF, com limite de 10 MiB. O bootstrap é explícito e opt-in por `pnpm media:bootstrap -- --yes`; não existe mutação remota automática.

---

## 6. Pipeline de upload e finalização

Fluxo oficial:

```text
Browser
→ solicita autorização ao servidor
→ servidor valida identidade, RBAC e metadata declarada
→ servidor emite signed upload para o staging privado
→ Browser envia o arquivo diretamente ao Supabase Storage
→ Browser solicita finalizeMediaUpload
→ servidor inspeciona e baixa o objeto de staging
→ servidor decodifica, valida e normaliza a imagem
→ servidor grava um novo objeto final imutável
→ servidor insere media_assets com metadata autoritativa
→ servidor remove o objeto de staging
```

O upload principal não atravessa uma Server Action. Server Actions coordenam autorização e finalização; os bytes originais seguem diretamente do browser para o Storage.

Em falha antes da persistência, o staging é limpo quando possível. Em falha de persistência depois da gravação final, a compensação tenta remover o objeto final e o staging, registrando falhas de cleanup sem expor segredos.

---

## 7. Validação e normalização de imagem

Formatos permitidos no MVP:

```text
JPEG
PNG
WebP
AVIF
```

Ficam rejeitados SVG, GIF, vídeo, PDF e dados que não possam ser decodificados como imagem real.

Limites autoritativos:

- tamanho máximo: 10 MiB;
- dimensão máxima: 12.000 px por eixo;
- total máximo: 60.000.000 pixels;
- imagens multipágina não são aceitas.

O servidor não confia em filename, extensão ou `file.type` do browser. Sharp decodifica os bytes, aplica orientação, normaliza o formato e reencoda a imagem com parâmetros adequados a screenshots editoriais.

O reencode remove metadata privada/desnecessária, incluindo EXIF/GPS e perfis incorporados que não precisam sobreviver. O SHA-256 é calculado sobre os bytes finais normalizados quando aplicável e armazenado em `media_assets`.

---

## 8. Media Library

Rota administrativa:

```text
/admin/media
```

A biblioteca oferece:

- busca por filename, credit e source URL;
- filtro por Game;
- filtro de status active/retired/all;
- paginação server-side de 24 itens;
- ordenação pelos assets mais recentes;
- preview;
- estado vazio;
- navegação para detalhe.

A biblioteca inteira não é carregada no browser. Filtros e paginação são traduzidos em queries server-side.

O detalhe em `/admin/media/[assetId]` apresenta:

- preview;
- filename original;
- MIME;
- dimensões e tamanho;
- Game scope;
- source URL e credit;
- criação e primeira publicação;
- estado de retirement;
- referências atuais;
- operações permitidas pelo RBAC.

Somente `scope_game_id`, `source_url` e `credit` são metadata editável. Bytes, path, MIME, checksum, autoria e publicação não são editáveis manualmente.

---

## 9. Media Picker e integrações de catálogo

O Media Picker reutilizável permite:

- navegar por assets;
- buscar;
- filtrar por Game;
- fazer upload;
- selecionar somente asset ativo;
- limpar a seleção quando o slot de catálogo permitir.

Integrações entregues:

- Game cover;
- Game hero;
- Platform icon;
- Achievement icon.

Contrato de segurança:

```text
client envia mediaAssetId
→ Media resolve o asset ativo no servidor
→ Media devolve storagePath confiável
→ comando do Catalog grava o path no slot autorizado
```

Assets retired são rejeitados para novas seleções. O cliente não possui API para fornecer `storagePath` arbitrário.

---

## 10. RBAC

| Operação | author | editor | admin |
|---|---:|---:|---:|
| Ver biblioteca/detalhe | Sim | Sim | Sim |
| Upload/finalize | Sim | Sim | Sim |
| Selecionar asset ativo | Sim | Sim | Sim |
| Editar metadata | Não | Sim | Sim |
| Retire/restore | Não | Sim | Sim |
| Hard delete elegível | Não | Não | Sim |
| Alterar Game cover/hero | Não | Sim | Sim |
| Alterar Platform icon | Não | Não | Sim |
| Alterar Achievement icon | Não | Sim | Sim |

As roles continuam vindo de `user_roles` e são revalidadas no servidor. A 10E não criou novas roles nem alterou a hierarquia `admin > editor > author`.

---

## 11. Lifecycle e hard delete

### Active

Asset disponível para leitura e novas seleções.

### Retire

- permitido para editor/admin;
- exige zero referências atuais;
- define `retired_at = now()`;
- preserva o arquivo e a identidade;
- asset retired não pode ser escolhido para novo uso.

### Restore

- permitido para editor/admin;
- define `retired_at = NULL`;
- preserva o mesmo ID e o mesmo objeto.

### Hard delete

- exclusivo de admin;
- exige `first_published_at IS NULL`;
- exige zero referências atuais;
- o servidor revalida todas as condições;
- remove primeiro a row de `media_assets` e depois o objeto final no Storage;
- não altera a estratégia conservadora definida para a etapa.

PostgreSQL e Storage não compartilham uma transaction distribuída. Se a metadata já foi removida com segurança e o delete físico falhar, a falha é registrada de forma estruturada. Um objeto órfão nunca publicado e sem referências é preferível a um registro ativo apontando para um arquivo inexistente.

O QA live confirmou que o hard delete elegível remove DB e Storage.

---

## 12. Detecção de uso e publicação futura

Referências atuais detectadas:

- `games.cover_path`;
- `games.hero_path`;
- `platforms.icon_path`;
- `achievements.icon_path`;
- `guide_content_nodes` ativos com `type = image` e `data.assetId` correspondente.

Nodes, Sections e Steps retirados e Guides arquivados não contam como referência ativa. Quando existem usos, retire e hard delete são bloqueados com `MEDIA_ASSET_IN_USE`, e a UI informa onde o asset está sendo usado.

`first_published_at` permanece reservado para o futuro fluxo de publishing. A API server-only `markMediaAssetsFirstPublished(...)` é idempotente e preenche somente valores ainda nulos. Guide publishing não foi implementado na 10E.

---

## 13. Incidente Supavisor / postgres.js

Durante o QA, o Admin apresentava loading infinito depois de uma ou duas navegações. Requests terminavam em timeout de Function após aproximadamente 300 segundos.

Stack envolvida:

```text
postgres.js 3.4.9
+ Supabase Supavisor
+ Transaction Pooler
```

Queries sem parâmetros podiam ser enviadas em pipeline pelo `postgres.js`. Em determinadas sequências, o Supavisor Transaction Pooler não entregava uma resposta posterior, deixando a única conexão configurada como `max: 1` permanentemente ocupada.

A correção permanente mantém as listagens vulneráveis parametrizadas por uma condição neutra centralizada em `supavisorPipelineGuard()`. Foram protegidos:

- listagem/count de Games;
- listagem de Platforms;
- listagem/count de Media Assets;
- listagem de Games para escopo de mídia.

O paralelismo com `Promise.all` foi preservado. Não foram adotados full reload, Session Pooler, pool maior, timeout artificial ou retries infinitos.

Testes de regressão executam as queries Drizzle e verificam que os parâmetros chegam ao client postgres, com comentário explícito sobre a compatibilidade `postgres.js + Supavisor transaction mode`.

Os logs temporários usados para localizar o incidente foram removidos, e a navegação normal do Next.js foi restaurada.

---

## 14. Sharp e compatibilidade Linux/Vercel

`sharp@0.35.4` foi adicionado como dependência direta e fixada.

O lockfile foi corrigido para que o pacote raiz do Sharp e `@img/colour` não permanecessem marcados como opcionais no snapshot da aplicação. As dependências binárias específicas de plataforma continuam sendo resolvidas pelo próprio pacote.

Essa correção garante a instalação adequada do runtime Linux usado pelo build/deploy da Vercel, sem trocar a biblioteca de processamento nem criar um pipeline paralelo.

---

## 15. QA live e patches finais

### ADMIN

Validado ao vivo:

- login e navegação repetida entre Jogos, Mídia e Plataformas;
- biblioteca e detalhe;
- upload/finalize;
- edição de metadata;
- retire/restore;
- Game cover/hero;
- Platform icon;
- Achievement icon;
- hard delete elegível removendo DB + Storage.

### EDITOR

Validado:

- leitura e upload;
- seleção de mídia;
- edição de metadata;
- retire/restore quando sem referências;
- Game cover/hero;
- Achievement icon;
- bloqueio de Platform icon e hard delete.

### AUTHOR

Validado:

- leitura da biblioteca;
- upload e seleção de asset ativo;
- bloqueio de metadata, lifecycle e hard delete;
- ausência de relaxamento de RBAC.

### Patch final de hard delete

Após exclusão bem-sucedida, a página de detalhe anteriormente permanecia na URL removida e renderizava 404 antes de o redirect cliente ocorrer.

A correção moveu o sucesso para um redirect server-side em direção a `/admin/media`, com feedback:

```text
Asset excluído permanentemente.
```

A ordem e a semântica DB → Storage não foram alteradas. Falhas continuam sem redirect.

### Copy do Achievement Inspector

A copy que afirmava que o ícone não era editável ficou obsoleta depois da integração da 10E. O texto final informa que metadata externa fora do escopo permanece preservada e que o ícone pode ser editado no inspector.

---

## 16. Testes e validação final

Resultado final consolidado:

- **209/209 testes aprovados**;
- **35/35 arquivos de teste aprovados**;
- zero skips na execução integral com Supabase local;
- lint aprovado com zero warnings;
- typecheck aprovado;
- build Next.js aprovado;
- `db:check` aprovado;
- `git diff --check` aprovado;
- testes de arquitetura/boundaries aprovados;
- testes de integração PostgreSQL, Auth e Storage aprovados;
- regression tests do Supavisor aprovados.

O Preview final do patch foi construído pela Vercel com status `READY`, e `/login` respondeu `200`.

---

## 17. Schema e limites da etapa

- **Houve alteração de schema na 10E?** Não.
- **Houve migration nova?** Não.
- **RBAC foi alterado?** Não.
- **Guide Studio foi implementado?** Não.
- **Publishing de Guides foi implementado?** Não.

Também permaneceram fora de escopo:

- crop/rotate editor interativo;
- annotations;
- OCR;
- AI tagging;
- folders e tags de mídia;
- vídeo e hosting de vídeo;
- SVG/GIF/PDF;
- social upload;
- avatar system.

---

## 18. Git checkpoint e estado final aprovado

- **Commit:** `c7666005a2c51830f91a1c892b7531eb1fcb4f4d`
- **Mensagem:** `feat(admin): implement media management`
- **Branch:** `main`
- **Etapa aprovada:** Sim
- **Checkpoint realizado:** Sim
- **Schema/migrations alterados:** Não
- **Commit anterior:** `cc191ca30f543bd9a1959f75d37a630b59fa2dae` — ETAPA 10D

> A ETAPA 10E estabeleceu o Media Manager do LOCKED:0 como serviço editorial central de mídia. Uploads usam staging privado assinado, validação e normalização server-side, Storage final imutável e metadata em `media_assets`. A biblioteca, o Media Picker, o lifecycle, a detecção de uso e as integrações com Games, Platforms e Achievements foram aprovados com RBAC e schema preservados. O incidente Supavisor foi corrigido permanentemente, os patches finais de QA foram validados e o checkpoint `c7666005a2c51830f91a1c892b7531eb1fcb4f4d` encerrou oficialmente a etapa.
