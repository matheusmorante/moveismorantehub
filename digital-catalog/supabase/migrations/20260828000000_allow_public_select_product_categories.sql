-- O catálogo público precisa ler os vínculos produto-categoria para aplicar
-- filtros por categoria. Escrita continua restrita a usuários autenticados.
DROP POLICY IF EXISTS "allow_select" ON public.product_categories;
DROP POLICY IF EXISTS "public_can_select_product_categories" ON public.product_categories;

CREATE POLICY "public_can_select_product_categories"
  ON public.product_categories
  FOR SELECT
  USING (true);
