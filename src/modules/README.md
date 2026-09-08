# Módulos de produto

Cada diretório abaixo é um bounded context do monólito modular. O código começa pelo `domain`, passa por `application` e chega a `delivery`; integrações concretas ficam em `infrastructure`.

APIs públicas futuras devem usar somente:

- `contracts.ts` para contratos serializáveis e compartilháveis;
- `server.ts` para operações públicas server-side;
- `ui.ts` para componentes públicos.

Subpastas de camada só devem ser criadas quando contiverem implementação real. Um módulo nunca acessa internals de outro módulo.

Dependências permitidas entre contextos:

```text
catalog <- guides <- progress
   ^          ^
   +-- search-+

media (serviço auxiliar)
identity (identidade e autorização)
```

`catalog` e `guides` não conhecem `progress`. A interface administrativa usa os mesmos módulos; não existe módulo `admin`.
