-- Adicionar colunas de status e vínculo de entidade em inventory_moves para estorno e auditoria
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS related_entity_id TEXT;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS related_entity_type TEXT;

-- Atualizar status padrão para registros legados que estejam nulos
UPDATE public.inventory_moves SET status = 'active' WHERE status IS NULL;
