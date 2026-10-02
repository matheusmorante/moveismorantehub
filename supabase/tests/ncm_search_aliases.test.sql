BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(5);

SELECT ok(
  EXISTS (SELECT 1 FROM public.search_ncms('guar', 10) WHERE code = '94035000'),
  'encontra móveis de quarto pelo prefixo guar'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.search_ncms('guarda roupa', 10) WHERE code = '94035000'),
  'encontra o NCM por guarda roupa sem hífen'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.search_ncms('roupeiro', 10) WHERE code = '94035000'),
  'encontra o NCM pelo sinônimo roupeiro'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.search_ncms('94035000', 10) WHERE code = '94035000'),
  'mantém a busca direta pelo código NCM'
);

SELECT is(
  (SELECT official_description FROM public.search_ncms('guarda roupa', 10) WHERE code = '94035000'),
  (SELECT official_description FROM public.ncms WHERE code = '94035000'),
  'a busca por alias preserva a descrição oficial do catálogo'
);

SELECT * FROM finish();
ROLLBACK;
