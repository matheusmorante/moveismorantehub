-- ==============================================================================
-- Migration: 20261002214500_add_mattress_characteristics.sql
-- Descrição: Criação e configuração de características para Colchões, Camas Box,
--            Cabeceiras e Quartos (Tamanho do colchão, Firmeza, Dupla face,
--            Revestimento, Peso suportado, etc.).
-- ==============================================================================

DO $$
DECLARE
  v_attr_id UUID;
BEGIN

  -- ============================================================================
  -- 1. NOVAS CARACTERÍSTICAS PARA COLCHÕES E CAMAS
  -- ============================================================================

  -- 1.1 Tamanho do colchão (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Tamanho do colchão', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Solteiro (88x188)'),
    ('Solteiro Especial / Solteirão (96x188 ou 100x200)'),
    ('Viúva (128x188)'),
    ('Casal (138x188)'),
    ('Queen Size (158x198)'),
    ('King Size (193x203)'),
    ('Super King (200x200)'),
    ('Berço / Infantil (60x130)'),
    ('Berço Americano (70x130)'),
    ('Solteiro'),
    ('Casal'),
    ('Queen'),
    ('King')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.2 Firmeza (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Firmeza', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Macio'),
    ('Intermediário (Médio)'),
    ('Firme'),
    ('Extra Firme'),
    ('Ortopédico'),
    ('Baixa (Macio)'),
    ('Média (Intermediário)'),
    ('Alta (Firme)')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.3 Dupla face (radio: Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Dupla face', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.4 Revestimento (radio)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Revestimento', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Malha'),
    ('Malha com fibras de bambu'),
    ('Jacquard'),
    ('Poliéster'),
    ('Malha e Poliéster'),
    ('Matelassê'),
    ('Algodão'),
    ('Suede'),
    ('Courvin / Corino impermeável'),
    ('Tecido Antiacaro e Antialérgico'),
    ('Plastificado / Hospitalar'),
    ('Tecido com Íons de Prata')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.5 Peso suportado (measure: kg)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Peso suportado', true, false, 'measure', 'kg')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'kg'
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Até 80 kg por pessoa'),
    ('Até 90 kg por pessoa'),
    ('Até 100 kg por pessoa'),
    ('Até 110 kg por pessoa'),
    ('Até 120 kg por pessoa'),
    ('Até 130 kg por pessoa'),
    ('Até 140 kg por pessoa'),
    ('Até 150 kg por pessoa'),
    ('Acima de 150 kg por pessoa'),
    ('80 kg'),
    ('90 kg'),
    ('100 kg'),
    ('110 kg'),
    ('120 kg'),
    ('130 kg'),
    ('140 kg'),
    ('150 kg')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- ============================================================================
  -- 2. EXPANDIR OPÇÕES EM ATRIBUTOS EXISTENTES (TIPO DE MOLA E PILLOW TOP)
  -- ============================================================================

  -- 2.1 Tipo de mola (incluindo colchão de espuma)
  SELECT id INTO v_attr_id FROM attributes WHERE lower(name) = 'tipo de mola' LIMIT 1;
  IF v_attr_id IS NOT NULL THEN
    INSERT INTO attribute_values (attribute_id, value)
    SELECT v_attr_id, opt FROM (VALUES 
      ('Sem molas (Colchão de espuma)'),
      ('Molas ensacadas individualmente'),
      ('Molas Bonnel'),
      ('Molas LFK'),
      ('Molas Miracoil'),
      ('Molas Verticoil')
    ) AS t(opt)
    WHERE NOT EXISTS (
      SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
    );
  END IF;

  -- 2.2 Pillow top (adicionar tipos comuns de mercado)
  SELECT id INTO v_attr_id FROM attributes WHERE lower(name) = 'pillow top' LIMIT 1;
  IF v_attr_id IS NOT NULL THEN
    INSERT INTO attribute_values (attribute_id, value)
    SELECT v_attr_id, opt FROM (VALUES 
      ('Euro Pillow'),
      ('Pillow Top Americano'),
      ('Double Pillow'),
      ('Pillow In'),
      ('Sem Pillow Top')
    ) AS t(opt)
    WHERE NOT EXISTS (
      SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
    );
  END IF;

  -- ============================================================================
  -- 3. VÍNCULOS COM CATEGORIAS (category_attributes)
  -- ============================================================================

  -- 3.1 Categoria: Colchões
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Colchões'
    AND a.name IN (
      'Tamanho do colchão',
      'Tipo de mola',
      'Densidade da Espuma',
      'Firmeza',
      'Dupla face',
      'Revestimento',
      'Pillow top',
      'Peso suportado',
      'Tecido',
      'Cor',
      'Marca',
      'Modelo',
      'Linha',
      'Altura',
      'Largura',
      'Profundidade',
      'Peso'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 3.2 Categoria: Camas/Bases Box
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Camas/Bases Box'
    AND a.name IN (
      'Tamanho do colchão',
      'Peso suportado',
      'Revestimento',
      'Pillow top',
      'Tipo de mola',
      'Densidade da Espuma',
      'Rodízios',
      'Tecido',
      'Material da estrutura',
      'Material dos pés',
      'Cor',
      'Marca',
      'Modelo',
      'Linha',
      'Altura',
      'Largura',
      'Profundidade',
      'Peso'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 3.3 Categoria: Cabeceiras
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Cabeceiras'
    AND a.name IN (
      'Tamanho do colchão',
      'Tecido',
      'Material da estrutura',
      'Cor',
      'Acabamento',
      'Marca',
      'Modelo',
      'Linha',
      'Altura',
      'Largura',
      'Profundidade',
      'Peso'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 3.4 Categorias: Beliches, Treliches e Berços
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name IN ('Beliches', 'Treliches', 'Berços')
    AND a.name IN (
      'Tamanho do colchão',
      'Peso suportado'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 3.5 Categoria: Sofás (Peso suportado)
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Sofás'
    AND a.name = 'Peso suportado'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

END $$;
