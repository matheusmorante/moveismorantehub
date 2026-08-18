-- Recalcula os filhos já existentes. Esta migration complementar também é
-- executada em bancos que aplicaram a migration anterior antes da regra de
-- elegibilidade estar completa.
UPDATE public.products AS product
SET active = false
WHERE product.active IS TRUE
  AND (to_jsonb(product) ->> 'parent_id') IS NOT NULL
  AND (
    COALESCE(length(trim(to_jsonb(product) ->> 'description')), 0) < 2
    OR COALESCE(
      NULLIF(to_jsonb(product) ->> 'unit_price', '')::numeric,
      NULLIF(to_jsonb(product) ->> 'price', '')::numeric,
      0
    ) <= 0
    OR COALESCE(NULLIF(to_jsonb(product) ->> 'cost_price', '')::numeric, 0) <= 0
    OR (to_jsonb(product) ->> 'main_supplier_id') IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.product_categories AS product_category
      WHERE product_category.product_id = product.id
    )
  );
