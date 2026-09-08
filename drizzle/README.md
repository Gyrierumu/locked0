# Drizzle migrations

Este é o único diretório de migrations SQL do PostgreSQL da Platify.

Fluxo adotado:

1. definir tabelas em `src/db/schema`;
2. executar `pnpm db:generate`;
3. revisar o SQL gerado neste diretório;
4. executar `pnpm db:migrate` no ambiente correto.

`drizzle push` não faz parte do fluxo de produção.
