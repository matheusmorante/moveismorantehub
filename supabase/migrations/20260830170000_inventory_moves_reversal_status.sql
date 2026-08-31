-- Migration para adicionar campos de status e motivo de estorno em inventory_moves
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'effective';
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS reversal_reason TEXT;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS related_entity_id TEXT;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS related_entity_type TEXT;

-- Atualizar status legados
UPDATE public.inventory_moves 
SET status = 'effective' 
WHERE status IS NULL OR status = 'active';

UPDATE public.inventory_moves 
SET status = 'reversed' 
WHERE status = 'cancelled';
