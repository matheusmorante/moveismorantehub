-- Corrige referências legadas em que a variação armazenada não pertence ao
-- produto da movimentação. A identidade operacional é sempre a variação do
-- próprio produto; o pai permanece apenas como agrupador compatível.

BEGIN;

WITH candidates AS (
  SELECT
    move.id AS move_id,
    variation.id AS variation_id,
    variation.name AS variation_name
  FROM public.inventory_moves AS move
  JOIN LATERAL (
    SELECT candidate.id, candidate.name
    FROM public.product_variations AS candidate
    WHERE candidate.product_id::text = move.product_id
    ORDER BY
      CASE
        WHEN lower(btrim(COALESCE(move.product_description, ''))) = lower(btrim(candidate.name)) THEN 0
        WHEN lower(btrim(COALESCE(move.product_name, ''))) = lower(btrim(candidate.name)) THEN 0
        ELSE 1
      END,
      candidate.created_at NULLS LAST,
      candidate.id
    LIMIT 1
  ) AS variation ON true
  WHERE move.product_id IS NOT NULL
    AND move.variation_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_variations AS own_variation
      WHERE own_variation.id::text = move.variation_id
        AND own_variation.product_id::text = move.product_id
    )
)
UPDATE public.inventory_moves AS move
SET
  variation_id = candidates.variation_id::text,
  product_name = candidates.variation_name,
  product_description = candidates.variation_name
FROM candidates
WHERE candidates.move_id = move.id;

-- Registros válidos também devem exibir a identidade da variação, nunca o
-- nome do produto-pai, para manter o ERP e o aplicativo semanticamente iguais.
UPDATE public.inventory_moves AS move
SET
  product_name = variation.name,
  product_description = variation.name
FROM public.product_variations AS variation
WHERE move.variation_id = variation.id::text
  AND move.product_id = variation.product_id::text
  AND NULLIF(btrim(variation.name), '') IS NOT NULL;

COMMIT;
