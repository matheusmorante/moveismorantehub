-- ==============================================================================
-- Migration: 20261002224500_enrich_further_furniture_characteristics.sql
-- Descrição: Criação de características complementares de mercado (Formato,
--            Quantidade de cubas, Posição da cuba, Acompanha pia/cuba,
--            Acompanha tampo, Quantidade de bocas) e vinculação às categorias
--            onde faltavam (Tampos, Pias, Balcões, Beliches, Cabeceiras, etc.).
-- ==============================================================================

DO $$
DECLARE
  v_attr_id UUID;
BEGIN

  -- ============================================================================
  -- 1. NOVAS CARACTERÍSTICAS
  -- ============================================================================

  -- 1.1 Formato (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Formato', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Retangular'),
    ('Quadrado'),
    ('Redondo'),
    ('Oval'),
    ('Canto Copo'),
    ('Canto Moeda'),
    ('Em L')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.2 Quantidade de cubas (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Quantidade de cubas', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('1 cuba (Simples)'),
    ('2 cubas (Dupla)'),
    ('1 cuba e meia')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.3 Posição da cuba (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Posição da cuba', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Central'),
    ('Esquerda'),
    ('Direita')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.4 Acompanha pia / cuba (radio: Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Acompanha pia / cuba', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.5 Acompanha tampo (radio: Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Acompanha tampo', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.6 Quantidade de bocas (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Quantidade de bocas', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('4 bocas'),
    ('5 bocas'),
    ('2 bocas'),
    ('Universal / Para recortar')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- ============================================================================
  -- 2. VÍNCULOS COM CATEGORIAS
  -- ============================================================================

  -- 2.1 Formato em Mesas, Conjuntos e Tampos
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name = 'Formato'
    AND c.name IN ('Mesa para Sala de Jantar', 'Conjunto para Sala de Jantar', 'Tampos', 'Mesas para Escritório', 'Sala de Jantar')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.2 Quantidade de lugares em Tampos
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name = 'Quantidade de lugares'
    AND c.name = 'Tampos'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.3 Peso suportado em Mesa de Jantar e Conjunto
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name = 'Peso suportado'
    AND c.name IN ('Mesa para Sala de Jantar', 'Conjunto para Sala de Jantar')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.4 Pias: Quantidade de cubas, Posição da cuba
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name IN ('Quantidade de cubas', 'Posição da cuba')
    AND c.name IN ('Pias', 'Balcões para Pia')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.5 Acompanha pia / cuba em Balcões e Conjuntos de Banheiro
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name = 'Acompanha pia / cuba'
    AND c.name IN ('Balcões para Pia', 'Conjuntos para Banheiro', 'Banheiro', 'Cozinha')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.6 Acompanha tampo em Balcões
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name = 'Acompanha tampo'
    AND c.name IN ('Balcões para Pia', 'Balcões para Cooktop', 'Cozinhas Moduladas e Compactas')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.7 Quantidade de bocas em Balcões para Cooktop
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name = 'Quantidade de bocas'
    AND c.name IN ('Balcões para Cooktop', 'Cozinhas Moduladas e Compactas')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.8 Rodízios em Beliches e Treliches (para cama auxiliar / gavetão)
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name = 'Rodízios'
    AND c.name IN ('Beliches', 'Treliches')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.9 Nichos em Armários Aéreos e Mesas de Cabeceira
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name = 'Quantidade de nichos'
    AND c.name IN ('Armários Aéreos', 'Mesas de Cabeceira')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.10 LED e Entrada USB em Mesas de Cabeceira
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name IN ('Possui LED', 'Entrada USB')
    AND c.name = 'Mesas de Cabeceira'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.11 Possui espelho em Cabeceiras
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE a.name = 'Possui espelho'
    AND c.name = 'Cabeceiras'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

END $$;
