-- =====================================================
-- Migration: Criar tabela de Oportunidades
-- =====================================================

-- 1. Tabela de oportunidades
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  badge_color TEXT NOT NULL DEFAULT 'bg-red-600',
  border_color TEXT NOT NULL DEFAULT 'border-orange-500',
  border_style TEXT NOT NULL DEFAULT 'solid',
  badge_animation TEXT NOT NULL DEFAULT 'pulse',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Coluna FK em products
ALTER TABLE products ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL;

-- 3. Seed dos 3 tipos iniciais
INSERT INTO opportunities (name, slug, badge_color, border_color) VALUES
  ('Salvado', 'salvado', 'bg-red-600', 'border-orange-500'),
  ('Liquidação - Últimas Unidades', 'liquidacao', 'bg-amber-600', 'border-amber-500'),
  ('Última Unidade - Mostruário', 'mostruario', 'bg-purple-600', 'border-purple-500')
ON CONFLICT (slug) DO NOTHING;

-- 4. Migrar dados existentes (is_salvado = true → vincular ao "Salvado")
UPDATE products 
SET opportunity_id = (SELECT id FROM opportunities WHERE slug = 'salvado') 
WHERE is_salvado = true AND opportunity_id IS NULL;

-- 5. Habilitar RLS
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Leitura pública de oportunidades" 
  ON opportunities FOR SELECT 
  USING (true);

-- Política de admin (gerencia total)
CREATE POLICY "Admin gerencia oportunidades" 
  ON opportunities FOR ALL 
  USING (auth.email() = 'matheusmorante002@gmail.com');
