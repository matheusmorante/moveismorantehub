-- A variação é a identidade operacional do estoque.
-- product_id continua como pai derivado para compatibilidade e agrupamento;
-- nenhuma movimentação de produto deve depender apenas dele.

BEGIN;

-- Corrige produtos antigos que ainda não receberam a variação padrão.
-- Serviços não movimentam estoque e permanecem sem variação operacional.
DO $$
DECLARE
  product RECORD;
  variation_sku text;
  sku_suffix integer;
BEGIN
  FOR product IN
    SELECT p.*
    FROM public.products AS p
    WHERE COALESCE(p.item_type, 'product') IN ('product', 'composition')
      AND NOT EXISTS (
        SELECT 1
        FROM public.product_variations AS variation
        WHERE variation.product_id = p.id
      )
    ORDER BY p.id
  LOOP
    variation_sku := NULL;
    IF NULLIF(btrim(product.code::text), '') IS NOT NULL THEN
      sku_suffix := 1;
      LOOP
        variation_sku := btrim(product.code::text) || '-' || lpad(sku_suffix::text, 2, '0');
        EXIT WHEN NOT EXISTS (
          SELECT 1
          FROM public.product_variations AS existing_sku
          WHERE existing_sku.sku = variation_sku
        );
        sku_suffix := sku_suffix + 1;
      END LOOP;
    END IF;

    INSERT INTO public.product_variations (
      product_id,
      name,
      sku,
      price,
      stock,
      attributes,
      use_parent_price,
      use_parent_promo_price,
      use_parent_dimensions,
      use_parent_description,
      use_parent_name,
      status,
      active
    )
    VALUES (
      product.id,
      COALESCE(NULLIF(btrim(product.name), ''), NULLIF(btrim(product.description), ''), 'Variação padrão'),
      variation_sku,
      COALESCE(product.unit_price, 0),
      COALESCE(product.stock, 0),
      '{}'::jsonb,
      true,
      true,
      true,
      true,
      true,
      COALESCE(NULLIF(product.status, ''), 'published'),
      COALESCE(product.active, true)
    );
  END LOOP;
END $$;

-- Reassocia movimentos legados sem variation_id somente quando existe uma
-- variação do próprio produto. A descrição exata tem prioridade; nos demais
-- casos a primeira variação estável é usada para não voltar ao pai.
WITH candidates AS (
  SELECT
    move.id AS move_id,
    variation.id AS variation_id,
    variation.name AS variation_name,
    row_number() OVER (
      PARTITION BY move.id
      ORDER BY
        CASE
          WHEN lower(btrim(COALESCE(move.product_description, ''))) = lower(btrim(variation.name)) THEN 0
          WHEN lower(btrim(COALESCE(move.product_name, ''))) = lower(btrim(variation.name)) THEN 0
          ELSE 1
        END,
        variation.created_at NULLS LAST,
        variation.id
    ) AS candidate_rank
  FROM public.inventory_moves AS move
  JOIN public.product_variations AS variation
    ON variation.product_id::text = move.product_id
  WHERE move.product_id IS NOT NULL
    AND move.variation_id IS NULL
)
UPDATE public.inventory_moves AS move
SET
  variation_id = candidates.variation_id::text,
  product_description = candidates.variation_name
FROM candidates
WHERE candidates.move_id = move.id
  AND candidates.candidate_rank = 1;

-- Mantém também o ERP Web alinhado ao nome da variação em registros antigos
-- que já tinham variation_id, mas ainda guardavam o nome do pai.
UPDATE public.inventory_moves AS move
SET product_description = variation.name
FROM public.product_variations AS variation
  WHERE move.variation_id = variation.id::text
  AND move.product_id = variation.product_id::text
  AND NULLIF(btrim(variation.name), '') IS NOT NULL;

-- Marcadores de sessão podem continuar sem product_id; qualquer movimento
-- vinculado a um produto, porém, precisa ter variation_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_moves_require_variation_identity'
      AND conrelid = 'public.inventory_moves'::regclass
  ) THEN
    ALTER TABLE public.inventory_moves
      ADD CONSTRAINT inventory_moves_require_variation_identity
      CHECK (product_id IS NULL OR variation_id IS NOT NULL)
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.inventory_moves
  VALIDATE CONSTRAINT inventory_moves_require_variation_identity;

COMMIT;
