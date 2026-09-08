# Search

Responsável pela abstração de busca. A implementação inicial usará PostgreSQL FTS e `pg_trgm` consumindo apenas APIs públicas de `catalog` e `guides`.

Não contém regras de catálogo ou guias e não acessa internals desses módulos.
