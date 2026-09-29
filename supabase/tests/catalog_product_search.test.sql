BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(19);

INSERT INTO public.categories (id, name, slug, type)
VALUES ('10000000-0000-0000-0000-000000000001', 'TEST_AUT Sala de Jantar', 'test-aut-catalog-search', 'category');

INSERT INTO public.products (id, name, slug, price, status, active, is_salvado, deleted_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Guarda-Roupa Casal TEST_AUT CATALOG SEARCH', 'test-aut-guarda-roupa', 950, 'published', false, true, null),
  ('20000000-0000-0000-0000-000000000002', 'Sofá Retrátil TEST_AUT CATALOG SEARCH', 'test-aut-sofa-retratil', 1800, 'published', true, false, null),
  ('20000000-0000-0000-0000-000000000003', 'Cômoda 4 Gavetas TEST_AUT CATALOG SEARCH', 'test-aut-comoda', 700, 'published', true, false, null),
  ('20000000-0000-0000-0000-000000000004', 'Rack Painel TV TEST_AUT CATALOG SEARCH', 'test-aut-rack-painel', 1200, 'published', true, false, null),
  ('20000000-0000-0000-0000-000000000005', 'Conjunto Mesa de Jantar TEST_AUT CATALOG SEARCH', 'test-aut-mesa-jantar', 2200, 'published', true, false, null),
  ('20000000-0000-0000-0000-000000000006', 'Poltrona Aurora TEST_AUT CATALOG SEARCH', 'test-aut-poltrona-exata', 1400, 'published', true, false, null),
  ('20000000-0000-0000-0000-000000000007', 'Poltrona Aurorq TEST_AUT CATALOG SEARCH', 'test-aut-poltrona-fuzzy', 1400, 'published', true, false, null),
  ('20000000-0000-0000-0000-000000000008', 'Guarda-Roupa Oculto TEST_AUT CATALOG SEARCH', 'test-aut-guarda-roupa-oculto', 950, 'published', true, false, null),
  ('20000000-0000-0000-0000-000000000009', 'Guarda-Roupa Pai Oculto TEST_AUT CATALOG SEARCH', 'test-aut-guarda-roupa-pai-oculto', 950, 'hidden', true, false, null),
  ('20000000-0000-0000-0000-000000000010', 'Guarda-Roupa Apagado TEST_AUT CATALOG SEARCH', 'test-aut-guarda-roupa-apagado', 950, 'published', true, false, now()),
  ('20000000-0000-0000-0000-000000000011', 'Guarda-Roupa Rascunho TEST_AUT CATALOG SEARCH', 'test-aut-guarda-roupa-rascunho', 950, 'draft', true, false, null),
  ('20000000-0000-0000-0000-000000000012', 'Aparador Azul TEST_AUT CATALOG SEARCH', 'test-aut-aparador-description-only', 950, 'published', true, false, null);

UPDATE public.products
SET description = 'guarda roupa sofa retratil comoda'
WHERE id = '20000000-0000-0000-0000-000000000012';

INSERT INTO public.products (id, name, slug, price, promo_price, status, active, is_salvado, deleted_at)
VALUES ('20000000-0000-0000-0000-000000000013', 'Poltrona Promocional TEST_AUT CATALOG SEARCH', 'test-aut-poltrona-promocional', 500, 100, 'published', true, false, null);

INSERT INTO public.product_variations (id, product_id, name, status, active)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Guarda-Roupa Casal TEST_AUT CATALOG SEARCH', 'published', false),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Sofá Retrátil TEST_AUT CATALOG SEARCH', 'published', true),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Cômoda 4 Gavetas TEST_AUT CATALOG SEARCH', 'published', true),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'Rack Painel TV TEST_AUT CATALOG SEARCH', 'published', true),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'Conjunto Mesa de Jantar TEST_AUT CATALOG SEARCH', 'published', true),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'Poltrona Aurora TEST_AUT CATALOG SEARCH', 'published', true),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'Poltrona Aurorq TEST_AUT CATALOG SEARCH', 'published', true),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', 'Guarda-Roupa Oculto TEST_AUT CATALOG SEARCH', 'hidden', true),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000010', 'Guarda-Roupa Apagado TEST_AUT CATALOG SEARCH', 'published', true),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000011', 'Guarda-Roupa Rascunho TEST_AUT CATALOG SEARCH', 'published', true);

INSERT INTO public.product_variations (id, product_id, name, status, active, price, use_parent_price)
VALUES ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000002', 'Sofá Retrátil TEST_AUT CATALOG SEARCH preço especial', 'published', true, 450, false);

INSERT INTO public.product_categories (product_id, category_id)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001');

SELECT is(
  public.normalize_catalog_search('  SOFÁ-Cama  '),
  'sofa cama',
  'normaliza acentos, maiúsculas, hífens e espaços'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('SOFÁ-RETRÁTIL TEST_AUT CATALOG SEARCH') s WHERE s.product_id = '20000000-0000-0000-0000-000000000002'),
  'encontra o nome exato mesmo com caixa e acentos diferentes'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('sofa retrati test aut catalog search') s WHERE s.product_id = '20000000-0000-0000-0000-000000000002'),
  'tolera o acento removido e o final incompleto de retrátil'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('guard roupa test aut catalog search') s WHERE s.product_id = '20000000-0000-0000-0000-000000000001'),
  'tolera erro de uma letra em duas palavras'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('guarda ropa test aut catalog search') s WHERE s.product_id = '20000000-0000-0000-0000-000000000001'),
  'tolera erro de uma letra em roupa'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('roupeiro') s WHERE s.product_id = '20000000-0000-0000-0000-000000000001'),
  'resolve o sinônimo roupeiro para guarda-roupa'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('armário de quarto') s WHERE s.product_id = '20000000-0000-0000-0000-000000000001'),
  'resolve armário de quarto para guarda-roupa'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('comda') s WHERE s.product_id = '20000000-0000-0000-0000-000000000003'),
  'corrige a omissão de uma letra em cômoda'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('rack painel') s WHERE s.product_id = '20000000-0000-0000-0000-000000000004'),
  'combina termos de rack e painel'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('mesa jantar') s WHERE s.product_id = '20000000-0000-0000-0000-000000000005'),
  'encontra conjuntos de mesa de jantar com palavras separadas'
);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.search_catalog_product_page('zzqxf inexistente') s),
  'não retorna resultados para texto inexistente'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM public.search_catalog_product_page('guarda roupa') s
    WHERE s.product_id = '20000000-0000-0000-0000-000000000012'
  ),
  'ignora descrição quando o nome do produto não corresponde'
);
SELECT ok(
  EXISTS (SELECT 1 FROM public.search_catalog_product_page('guarda roupa casal test aut catalog search') s WHERE s.product_id = '20000000-0000-0000-0000-000000000001'),
  'mostra item publicado mesmo com produto e variação ERP inativos'
);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.search_catalog_product_page('guarda roupa oculto test aut catalog search') s),
  'não retorna pai com variação oculta, produto oculto, apagado ou rascunho'
);
SELECT is(
  (SELECT s.product_id FROM public.search_catalog_product_page('poltrona aurora test aut catalog search') s ORDER BY s.match_rank, s.match_score DESC LIMIT 1),
  '20000000-0000-0000-0000-000000000006'::uuid,
  'correspondência exata fica acima da aproximação'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.search_catalog_product_page(
      'guard roupa test aut catalog search',
      ARRAY['10000000-0000-0000-0000-000000000001']::uuid[],
      NULL,
      'salvados',
      900,
      1000,
      1,
      15,
      'newest'
    ) s
    WHERE s.product_id = '20000000-0000-0000-0000-000000000001'
  ),
  'combina busca, categoria, salvados e faixa de preço antes da página'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.search_catalog_product_page(
      'poltrona promocional', NULL, NULL, 'all', 80, 150, 1, 15, 'newest'
    ) s
    WHERE s.product_id = '20000000-0000-0000-0000-000000000013'
  ),
  'filtra pelo preço promocional exibido quando o produto não tem variações'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.search_catalog_product_page(
      'sofa retratil', NULL, NULL, 'all', 400, 500, 1, 15, 'newest'
    ) s
    WHERE s.product_id = '20000000-0000-0000-0000-000000000002'
  ),
  'filtra pelo preço da variação que substitui o preço do produto'
);
SELECT ok(
  (SELECT count(*) = 1 AND max(s.total_count) > 1
   FROM public.search_catalog_product_page('guarda roupa', NULL, NULL, 'all', 0, 10000, 1, 1, 'newest') s),
  'retorna só um item na página e mantém a contagem total filtrada'
);

SELECT * FROM finish();
ROLLBACK;
