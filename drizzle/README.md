# Drizzle migrations

Este é o único diretório de migrations SQL do PostgreSQL da Platify.

`0000_baseline.sql` é a baseline inicial das 25 tabelas pertencentes ao produto. A tabela
`auth.users` pertence ao Supabase: o schema Drizzle apenas a referencia e nenhuma migration
da aplicação deve criá-la, substituí-la ou removê-la.

Fluxo adotado:

1. definir tabelas em `src/db/schema`;
2. executar `pnpm db:generate`;
3. revisar o SQL gerado neste diretório;
4. executar `pnpm db:check`;
5. executar `pnpm db:migrate` somente no ambiente explicitamente escolhido.

`drizzle push` não faz parte do fluxo de produção. RLS e policies detalhadas não pertencem à
baseline 10A e serão definidas em uma etapa posterior; não há permissões públicas amplas aqui.
O Supabase CLI é apenas o runtime PostgreSQL/Auth local e não mantém uma árvore paralela de
migrations: a fonte de verdade permanece `src/db/schema` → `drizzle/`.
