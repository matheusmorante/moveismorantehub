-- A migration é autossuficiente para bancos criados antes dos campos do ERP.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'draft';

ALTER TABLE public.products
    ALTER COLUMN active SET DEFAULT false;

-- Produtos trazidos do catálogo não entram ativos no ERP sem cumprir os
-- requisitos internos: nome, preço, categoria, fornecedor e preço de custo.
UPDATE public.products AS product
SET active = false
WHERE product.active IS TRUE
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
