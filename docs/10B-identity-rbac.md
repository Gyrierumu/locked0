# LOCKED:0 — ETAPA 10B — Identity + RBAC + Admin Shell

## 1. Status

- **Estado:** ✅ Aprovada
- **Nome da etapa:** Identity + RBAC + Admin Shell
- **Objetivo principal:** estabelecer autenticação server-side, identidade verificada, papéis administrativos e proteção do Admin
- **Base de dados:** schema congelado da ETAPA 10A
- **Autenticação:** Supabase Auth
- **Autorização:** `user_roles` + regras server-side
- **Branch:** `main`
- **Etapa anterior:** 10A / 10A.1
- **Próxima etapa:** 10C — Catalog Admin
- **Commit final:** não registrado neste resumo por não estar disponível no contexto canônico atual

> Esta etapa transformou a baseline de Identity da 10A em um sistema administrativo realmente utilizável e protegido.

---

## 2. Objetivo

A ETAPA 10B teve como objetivo criar a fundação de identidade e autorização do LOCKED:0.

A aplicação precisava deixar de tratar autenticação como detalhe de infraestrutura e passar a possuir um contrato claro para:

- identificar o usuário autenticado;
- verificar a sessão no servidor;
- resolver roles;
- calcular a role efetiva;
- proteger rotas administrativas;
- permitir login/logout mínimos;
- expor um `CurrentActor` consistente para a Application;
- impedir que decisões de autorização dependam do client.

Além disso, a etapa precisava disponibilizar o primeiro **Admin Shell** funcional para sustentar as etapas administrativas seguintes.

---

## 3. Escopo implementado

A 10B entregou:

- integração server-side com Supabase Auth;
- leitura de identidade autenticada a partir de claims verificadas;
- contratos de identidade;
- resolução de roles via `user_roles`;
- hierarquia `admin > editor > author`;
- cálculo de role efetiva;
- `CurrentActor`;
- proteção server-side de `/admin`;
- login mínimo;
- logout;
- Admin Shell;
- rechecagem de autorização no layout administrativo;
- bootstrap do primeiro usuário admin;
- testes de identity e RBAC;
- validação ao vivo do fluxo de login/admin/logout em Preview.

---

## 4. Fora de escopo

A 10B **não** implementou:

- registro público de usuários;
- OAuth social;
- onboarding de usuários finais;
- recuperação de senha customizada;
- gerenciamento avançado de contas;
- UI pública de perfil;
- RLS completo;
- permissões granulares por feature além do necessário para a fundação administrativa;
- Catalog Admin;
- Achievement Manager;
- Media Manager;
- Guide Studio;
- social features.

Esses itens pertencem a etapas posteriores.

---

## 5. Decisões arquiteturais

### 5.1 Auth como fonte de identidade

Supabase Auth continua sendo a fonte de identidade autenticada.

A aplicação não duplica credenciais nem tenta manter um sistema paralelo de login.

### 5.2 Claims verificadas no servidor

A sessão confiável deve ser obtida por mecanismo de verificação server-side.

A implementação aprovada usa claims verificadas e não deve confiar em estado client-side como fonte de verdade.

### 5.3 `CurrentActor` como contrato da Application

Foi criado um contrato de ator atual para evitar que cada feature leia Auth e roles de forma diferente.

Forma conceitual:

```ts
type CurrentActor = {
  userId: string
  email?: string
  profile: Profile | null
  roles: Role[]
  effectiveRole: Role
}
```

A presença exata de campos auxiliares pode evoluir, mas o princípio deve permanecer: features consomem um ator já verificado, não detalhes crus de sessão.

### 5.4 Role efetiva

A hierarquia aprovada é:

```text
admin > editor > author
```

Quando um usuário possui mais de uma role, a role efetiva é a de maior privilégio.

### 5.5 Proteção em mais de uma camada

A proteção administrativa não depende apenas do proxy ou da UI.

A arquitetura usa:

- proteção inicial de rota;
- rechecagem no servidor;
- autorização novamente nas mutations de cada feature.

### 5.6 Profile opcional

A presença de `profiles` não é pré-condição para acesso administrativo.

Um usuário autenticado com role válida pode formar um `CurrentActor` mesmo sem Profile.

---

## 6. Regras de domínio e contratos

### Roles

Roles administrativas canônicas:

```text
author
editor
admin
```

### Ordem de privilégio

```text
admin > editor > author
```

### Acesso administrativo

Todas as três roles podem acessar o Admin quando a feature permite.

O helper conceitual equivalente a `canAccessAdmin` considera:

- admin;
- editor;
- author.

### CurrentActor

O ator atual deve conter:

- `userId`;
- `email` quando disponível;
- `profile` ou `null`;
- conjunto de roles;
- role efetiva.

### Ausência de Profile

Não bloqueia autenticação nem acesso administrativo quando a role é válida.

### Autorização

Nunca confiar em:

- role enviada pelo client;
- parâmetro de formulário como fonte de privilégio;
- estado visual;
- claims não verificadas.

---

## 7. Modelo de dados

A 10B utiliza principalmente as tabelas da baseline:

### Identity

- `profiles`
- `user_roles`

### Supabase Auth

- `auth.users`

As relações com `auth.users` já haviam sido preparadas na 10A.

### Schema

- **Houve alteração de schema nesta etapa?** Não.
- **Houve migration?** Não.
- **Baseline Drizzle alterada?** Não.

A 10B consumiu o modelo já congelado.

---

## 8. Arquitetura da implementação

Fluxo conceitual:

```text
Supabase Auth
    ↓
Identity Infrastructure
    ↓
CurrentActor / Role Resolution
    ↓
Application authorization
    ↓
Admin Delivery/UI
```

### Infrastructure

Responsável por:

- integração com Supabase Auth;
- leitura/verificação de claims;
- acesso às roles persistidas.

### Application

Responsável por:

- construir identidade aplicável ao domínio;
- exigir role mínima;
- expor contrato de ator para features.

### Delivery / UI

Responsável por:

- login;
- logout;
- Admin Shell;
- redirects;
- mensagens apropriadas de acesso.

---

## 9. Rotas e experiência administrativa

A etapa estabeleceu o fluxo administrativo mínimo.

### `/login`

Responsável por:

- autenticação;
- retorno ao destino desejado quando aplicável;
- não expor detalhes internos de autorização.

### `/admin`

Responsável por:

- servir como entrada do Admin;
- exigir sessão válida;
- exigir role administrativa;
- renderizar o Admin Shell.

### Admin Shell

Inclui a estrutura-base de:

- header;
- identidade da sessão;
- role efetiva;
- navegação;
- área de conteúdo.

As features específicas passaram a ser adicionadas nas etapas posteriores.

---

## 10. RBAC e segurança

### AUTHOR

Pode:

- acessar o Admin;
- consumir features read-only quando a etapa correspondente permitir.

Não recebe automaticamente permissão de mutação.

### EDITOR

Pode:

- acessar o Admin;
- executar operações editoriais permitidas por feature.

### ADMIN

Pode:

- acessar o Admin;
- executar operações editoriais;
- executar operações administrativas adicionais quando definidas pela feature.

### Revalidação

A autorização deve ser revalidada no servidor em cada mutation relevante.

### Proxy

O proxy é deliberadamente leve.

Ele não substitui a autorização real da aplicação.

### Layout administrativo

O layout de `/admin` revalida a identidade e o acesso.

---

## 11. Fluxos principais

### Login

1. usuário acessa `/login`;
2. credenciais são processadas pelo Supabase Auth;
3. sessão é estabelecida;
4. identidade é verificada no servidor;
5. roles são resolvidas;
6. usuário é enviado ao Admin quando autorizado.

### Acesso ao Admin

1. request chega a `/admin`;
2. sessão é verificada;
3. usuário é identificado;
4. `user_roles` é consultada;
5. role efetiva é calculada;
6. acesso é permitido ou bloqueado.

### Logout

1. usuário aciona logout;
2. sessão Supabase é encerrada;
3. acesso administrativo deixa de estar disponível;
4. navegação retorna ao fluxo público/login.

### Bootstrap do primeiro admin

1. usuário existe em Supabase Auth;
2. uma role `admin` é inserida em `user_roles`;
3. esse usuário passa a acessar o Admin como administrador.

---

## 12. Comportamentos transacionais

A 10B não introduziu grandes transactions de domínio.

As operações principais são:

- leitura da identidade;
- leitura de roles;
- resolução de role efetiva;
- criação/bootstrap de role.

Transactions complexas ficam para features posteriores.

---

## 13. Testes e checks

A etapa incluiu testes para:

- identidade autenticada;
- ausência de Profile;
- resolução de roles;
- hierarquia de roles;
- acesso ao Admin;
- bloqueio de acesso;
- comportamento de login/logout;
- helpers de autorização.

### Resultado final conhecido

- testes da etapa aprovados;
- lint aprovado;
- typecheck aprovado;
- build aprovado;
- `db:check` preservado;
- sem drift de schema.

Os números exatos da suíte original da 10B não estão disponíveis no contexto canônico atual e não são inventados neste documento.

---

## 14. QA manual / Preview

A QA ao vivo validou:

### Usuário anônimo

- acesso a `/admin` não foi permitido;
- houve redirect para login.

### Usuário ADMIN

- login funcionou;
- Admin Shell carregou;
- role efetiva foi exibida;
- sessão foi reconhecida como válida;
- logout funcionou.

### Persistência de proteção

Após logout:

- o Admin voltou a exigir autenticação.

A etapa foi aprovada ao vivo antes do início da 10C.

---

## 15. Bugs encontrados e corrigidos

Não há bug funcional específico da 10B preservado como decisão canônica neste momento.

A etapa foi refinada até estabilizar:

- autenticação;
- role resolution;
- Admin protection;
- login/logout;
- CurrentActor.

O estado final aprovado deve ser considerado a referência.

---

## 16. Estado final dos fixtures de QA

A 10B dependeu de um usuário administrativo real para QA.

O documento canônico **não** registra:

- senha;
- token;
- cookie;
- secret;
- credenciais temporárias.

A única informação estrutural relevante é:

- existe pelo menos um usuário com role `admin` em `user_roles`;
- esse usuário foi suficiente para validar o Admin Shell e as etapas seguintes.

---

## 17. Arquivos e módulos relevantes

Principais áreas relacionadas:

```text
src/modules/identity/
src/app/(admin)/
src/config/
```

Pontos conceituais principais:

- infraestrutura Supabase Auth;
- resolução de CurrentActor;
- permissions / role helpers;
- login;
- logout;
- proteção de `/admin`;
- Admin Shell;
- testes de Identity/RBAC.

A lista completa de arquivos da execução original não é necessária neste resumo canônico.

---

## 18. Decisões que NÃO devem ser revertidas

- Supabase Auth continua sendo a fonte de identidade.
- `user_roles` continua sendo a fonte de autorização administrativa.
- A role efetiva respeita `admin > editor > author`.
- Profile é opcional para formar um ator autenticado.
- CurrentActor deve encapsular a identidade usada pela Application.
- Autorização nunca deve confiar apenas no client.
- Proxy não substitui autorização server-side.
- Layout/admin e mutations relevantes devem revalidar acesso.
- Não criar sistema paralelo de roles dentro de Auth metadata como substituto de `user_roles`.
- Não exigir registro público ou OAuth como pré-condição para as features administrativas.
- Não alterar schema apenas para simplificar RBAC.

---

## 19. Limitações conhecidas

Ao final da 10B ainda não existiam:

- Catalog Admin;
- Achievement Manager;
- Media Manager;
- Guide Studio;
- onboarding público;
- OAuth;
- registro aberto;
- profile UI;
- social graph;
- autorização granular por recurso além do necessário para as features administrativas subsequentes.

Esses itens pertencem a etapas futuras.

---

## 20. Dependências para próximas etapas

A 10B fornece a fundação de autorização para:

### 10C — Catalog Admin

- AUTHOR read-only;
- EDITOR com mutações editoriais;
- ADMIN com capacidades administrativas adicionais.

### 10D — Achievement Manager

- queries acessíveis a AUTHOR;
- mutations a partir de EDITOR;
- ADMIN como superset.

### 10E — Media Manager

A mesma infraestrutura de CurrentActor e RBAC deve ser reutilizada.

### 10F+

Guide Studio e publishing também devem reutilizar os contratos de identidade da 10B, sem implementar uma segunda camada de autenticação.

---

## 21. Git checkpoint

- **Commit:** não disponível no contexto canônico atual
- **Mensagem:** não disponível no contexto canônico atual
- **Branch:** `main`
- **Etapa aprovada:** Sim
- **Working tree limpo após checkpoint:** esperado, mas o SHA histórico não está registrado neste contexto
- **Schema/migrations alterados:** Não

Quando o commit histórico exato da 10B for recuperado do Git, esta seção pode ser atualizada.

---

## 22. Estado final aprovado

> A ETAPA 10B estabeleceu a fundação de Identity e RBAC do LOCKED:0. Supabase Auth passou a fornecer a identidade autenticada, `user_roles` passou a fornecer as roles administrativas, `CurrentActor` consolidou o contrato de identidade para a Application e `/admin` passou a ser protegido server-side. A partir deste checkpoint, todas as etapas administrativas seguintes devem reutilizar essa infraestrutura e não criar mecanismos paralelos de autenticação ou autorização.
