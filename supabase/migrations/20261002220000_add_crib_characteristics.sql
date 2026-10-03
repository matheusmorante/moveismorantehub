-- ==============================================================================
-- Migration: 20261002220000_add_crib_characteristics.sql
-- Descrição: Criação e configuração de características para Berços e quartos
--            infantis (Berço 3 em 1, Vira mini cama, Dimensões do colchão
--            recomendado, Estrado regulável, Grades fixas, Tipo de grade,
--            Padrão do berço e Acompanha colchão).
-- ==============================================================================

DO $$
DECLARE
  v_attr_id UUID;
BEGIN

  -- ============================================================================
  -- 1. NOVAS CARACTERÍSTICAS PARA BERÇOS
  -- ============================================================================

  -- 1.1 Berço 3 em 1 (radio: Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Berço 3 em 1', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.2 Vira mini cama (radio: Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Vira mini cama', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.3 Comprimento do colchão recomendado (measure: cm)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Comprimento do colchão recomendado', true, false, 'measure', 'cm')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'cm';

  -- 1.4 Largura do colchão recomendado (measure: cm)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Largura do colchão recomendado', true, false, 'measure', 'cm')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'cm';

  -- 1.5 Tamanho recomendado do colchão (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Tamanho recomendado do colchão', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('70x130 cm (Padrão Americano)'),
    ('60x130 cm (Padrão Nacional)'),
    ('Mini Berço'),
    ('Berço Oval / Redondo')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.6 Estrado regulável (radio: Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Estrado regulável', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.7 Grades fixas (radio: Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Grades fixas', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.8 Tipo de grade (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Tipo de grade', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Fixas'),
    ('Móveis'),
    ('Uma grade móvel'),
    ('Grade regulável'),
    ('Sem grade')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.9 Padrão do berço (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Padrão do berço', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Americano (colchão 70x130)'),
    ('Nacional (colchão 60x130)'),
    ('Mini Berço'),
    ('Berço Mini Cama'),
    ('Berço 3 em 1 / Multifuncional'),
    ('Berço Co-Sleeper / Acoplado'),
    ('Berço Portátil / Desmontável')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.10 Acompanha colchão (radio: Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Acompanha colchão', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- ============================================================================
  -- 2. VÍNCULOS COM CATEGORIAS (category_attributes)
  -- ============================================================================

  -- 2.1 Categoria: Berços
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Berços'
    AND a.name IN (
      'Berço 3 em 1',
      'Vira mini cama',
      'Padrão do berço',
      'Comprimento do colchão recomendado',
      'Largura do colchão recomendado',
      'Tamanho recomendado do colchão',
      'Estrado regulável',
      'Grades fixas',
      'Tipo de grade',
      'Acompanha colchão',
      'Rodízios',
      'Peso suportado',
      'Tamanho do colchão',
      'Material da estrutura',
      'Material dos pés',
      'Acabamento',
      'Cor',
      'Espessura do MDF/MDP',
      'Quantidade de gavetas',
      'Tipo/material da corrediça',
      'Marca',
      'Modelo',
      'Linha',
      'Altura',
      'Largura',
      'Profundidade',
      'Peso'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.2 Categorias de Camas e Beliches que também usam "Acompanha colchão"
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name IN ('Camas/Bases Box', 'Beliches', 'Treliches')
    AND a.name = 'Acompanha colchão'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

END $$;
