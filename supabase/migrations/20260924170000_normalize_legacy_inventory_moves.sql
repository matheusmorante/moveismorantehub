-- Normaliza registros antigos de estoque sem duplicar movimentações.
-- Fonte de verdade: public.inventory_moves.
-- A migração é idempotente e só resolve vínculos determinísticos.

BEGIN;

ALTER TABLE public.inventory_moves
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'effective',
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS related_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS related_entity_type TEXT;

-- Registros anteriores à coluna status continuam efetivos por padrão.
UPDATE public.inventory_moves
SET status = 'effective'
WHERE status IS NULL OR btrim(status) = '';

-- Preserva o vínculo normalizado disponível no modelo antigo, sem inferir
-- se o pedido é de venda ou compra.
UPDATE public.inventory_moves
SET related_entity_id = order_id
WHERE (related_entity_id IS NULL OR btrim(related_entity_id) = '')
  AND order_id IS NOT NULL
  AND btrim(order_id) <> '';

-- Reconcile apenas quando o nome legado encontra exatamente um produto.
-- Casos ambíguos ou sem correspondência permanecem pendentes para revisão.
WITH unique_product_match AS (
  SELECT
    move.id AS move_id,
    min(product.id::text) AS product_id
  FROM public.inventory_moves AS move
  JOIN public.products AS product
    ON lower(btrim(product.name)) = lower(btrim(move.product_name))
  WHERE (move.product_id IS NULL OR btrim(move.product_id::text) = '')
    AND move.product_name IS NOT NULL
    AND btrim(move.product_name) <> ''
  GROUP BY move.id
  HAVING count(product.id) = 1
)
UPDATE public.inventory_moves AS move
SET product_id = match.product_id
FROM unique_product_match AS match
WHERE move.id = match.move_id;

CREATE INDEX IF NOT EXISTS inventory_moves_product_id_date_idx
  ON public.inventory_moves (product_id, date DESC);

CREATE INDEX IF NOT EXISTS inventory_moves_status_date_idx
  ON public.inventory_moves (status, date DESC);

-- Auditoria operacional para acompanhar o que ainda não pôde ser convertido
-- automaticamente. Não expõe dados novos ao app nem altera registros ambíguos.
CREATE OR REPLACE VIEW public.inventory_move_normalization_audit AS
SELECT
  move.id,
  move.product_id,
  move.product_name,
  move.variation_id,
  move.order_id,
  CASE
    WHEN move.product_id IS NOT NULL AND btrim(move.product_id::text) <> '' THEN 'normalized'
    WHEN move.product_name IS NULL OR btrim(move.product_name) = '' THEN 'missing_product_identity'
    WHEN count(product.id) = 0 THEN 'legacy_product_not_found'
    WHEN count(product.id) > 1 THEN 'legacy_product_ambiguous'
    ELSE 'pending_review'
  END AS normalization_status
FROM public.inventory_moves AS move
LEFT JOIN public.products AS product
  ON lower(btrim(product.name)) = lower(btrim(move.product_name))
GROUP BY move.id, move.product_id, move.product_name, move.variation_id, move.order_id;

GRANT SELECT ON public.inventory_move_normalization_audit TO authenticated;

COMMIT;
