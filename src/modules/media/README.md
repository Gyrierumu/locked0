# Media

O modulo Media implementa a biblioteca editorial do LOCKED:0 sem alterar o schema
congelado. Uploads entram primeiro no bucket privado de staging e somente imagens
decodificadas, normalizadas e sem metadata privada sao gravadas no bucket final
public-read.

## Storage

- `locked0-media-staging`: privado, temporario e gravavel pelo browser somente por
  signed upload emitido para um path server-generated;
- `locked0-media`: public-read, gravado apenas pelo adapter server-only, com objetos
  imutaveis e `Cache-Control: max-age=31536000`;
- tipos aceitos: JPEG, PNG, WebP e AVIF;
- limite: 10 MiB, 12.000 px por dimensao e 60 milhoes de pixels.

Execute `pnpm media:bootstrap -- --yes` de forma opt-in para criar ou reconciliar os
dois buckets usando a API oficial do Supabase. O comando usa as variaveis de ambiente
do projeto e nunca e executado automaticamente.

## Lifecycle

O binario final nunca e sobrescrito. Retirement preserva arquivo e identidade, e so
e permitido sem usos atuais. Hard delete e exclusivo de admin, exige asset nunca
publicado e sem usos, e remove primeiro a row para evitar referencias validas para um
objeto ausente. Uma eventual falha posterior do Storage e registrada como cleanup de
objeto orfao.

Usos em `guide_content_nodes` sao apenas detectados nesta etapa; Guide Studio e o
fluxo de publicacao permanecem fora do escopo.
