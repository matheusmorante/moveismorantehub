-- Migration: Adicionar status de entrega ativa na tabela team_locations
-- Permite que a localização do usuário só fique visível para outros colegas quando estiver em entrega ativa

ALTER TABLE public.team_locations 
ADD COLUMN IF NOT EXISTS is_delivering BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS active_order_id TEXT NULL,
ADD COLUMN IF NOT EXISTS active_order_code TEXT NULL;

-- Criar índice para buscas eficientes de membros em rota
CREATE INDEX IF NOT EXISTS idx_team_locations_is_delivering 
ON public.team_locations (is_delivering) 
WHERE is_delivering = true;
