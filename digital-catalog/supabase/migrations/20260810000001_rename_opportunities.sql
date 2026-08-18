-- =====================================================
-- Migration: Renomear Oportunidades
-- =====================================================

-- Atualizar o nome da oportunidade Salvados para "Queima dos Salvados"
UPDATE opportunities 
SET name = 'Queima dos Salvados' 
WHERE slug = 'salvado';

-- Atualizar o nome da oportunidade Liquidação para "Mega Liquidação"
UPDATE opportunities 
SET name = 'Mega Liquidação' 
WHERE slug = 'liquidacao';

-- Corrigir a flag is_salvado para produtos existentes que foram salvos incorretamente
UPDATE products 
SET is_salvado = (
  CASE 
    WHEN opportunity_id = (SELECT id FROM opportunities WHERE slug = 'salvado') THEN true
    ELSE false
  END
)
WHERE opportunity_id IS NOT NULL;

