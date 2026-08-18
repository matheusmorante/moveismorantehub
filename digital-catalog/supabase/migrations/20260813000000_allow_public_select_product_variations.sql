-- Remove a política de leitura restrita e permite a leitura pública das variações de produtos
DROP POLICY IF EXISTS "allow_select" ON public.product_variations;

CREATE POLICY "allow_public_select" 
  ON public.product_variations 
  FOR SELECT 
  USING (true);
