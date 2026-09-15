-- Cada item confirmado de um recebimento pode gerar somente uma movimentação.
-- A posição do item permite que o mesmo produto apareça mais de uma vez no recebimento.

ALTER TABLE public.inventory_moves
  ADD COLUMN IF NOT EXISTS source_receipt_id uuid REFERENCES public.goods_receipts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_item_index integer;

ALTER TABLE public.inventory_moves
  DROP CONSTRAINT IF EXISTS inventory_moves_source_receipt_item_index_positive;

ALTER TABLE public.inventory_moves
  ADD CONSTRAINT inventory_moves_source_receipt_item_index_positive
  CHECK (source_item_index IS NULL OR source_item_index > 0) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_moves_source_receipt_item_unique
  ON public.inventory_moves (source_receipt_id, source_item_index)
  WHERE source_receipt_id IS NOT NULL AND source_item_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS inventory_moves_source_receipt_id_idx
  ON public.inventory_moves (source_receipt_id)
  WHERE source_receipt_id IS NOT NULL;
