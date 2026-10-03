-- ==============================================================================
-- Migration: 20261002213000_add_sofa_dining_characteristics.sql
-- Descrição: Criação e padronização das características para Sala de Jantar
--            (Mesa, Conjuntos, Cadeiras) e Sofás (Lugares, Retrátil, Reclinável,
--            Molas, Almofadas, USB, etc.), vinculando às respectivas categorias.
-- ==============================================================================

DO $$
DECLARE
  v_attr_id UUID;
BEGIN

  -- ============================================================================
  -- 1. CARACTERÍSTICAS PARA MESA E CADEIRAS DE SALA DE JANTAR
  -- ============================================================================

  -- 1.1 Cadeira estofada (Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Cadeira estofada', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.2 Material da cadeira
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Material da cadeira', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Madeira maciça'),
    ('MDF'),
    ('MDP'),
    ('MDF/MDP'),
    ('Aço / Metal'),
    ('Alumínio'),
    ('Polipropileno / Plástico')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.3 Material do assento
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Material do assento', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Espuma D28'),
    ('Espuma D26'),
    ('Espuma D23'),
    ('Espuma D20'),
    ('MDF'),
    ('MDP'),
    ('Madeira maciça'),
    ('Estofado com tecido'),
    ('Material sintético / Corino'),
    ('Palha / Rattan'),
    ('Polipropileno / Plástico')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.4 Material do encosto
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Material do encosto', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('MDF'),
    ('MDP'),
    ('Madeira maciça'),
    ('Espuma com tecido'),
    ('Palha sextavada / Tela sintética'),
    ('Aço / Metal'),
    ('Polipropileno / Plástico')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.5 Densidade do assento
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Densidade do assento', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('D18'), ('D20'), ('D23'), ('D26'), ('D28'), ('D33'),
    ('18'), ('20'), ('23'), ('26'), ('28'), ('33')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 1.6 Altura da cadeira (cm)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Altura da cadeira', true, false, 'measure', 'cm')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'cm';

  -- 1.7 Largura da cadeira (cm)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Largura da cadeira', true, false, 'measure', 'cm')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'cm';

  -- 1.8 Profundidade da cadeira (cm)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Profundidade da cadeira', true, false, 'measure', 'cm')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'cm';

  -- 1.9 Altura do assento ao chão (cm)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Altura do assento ao chão', true, false, 'measure', 'cm')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'cm';

  -- 1.10 Peso suportado por cadeira (kg)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Peso suportado por cadeira', true, false, 'measure', 'kg')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'kg';

  -- ============================================================================
  -- 2. CARACTERÍSTICAS PARA SOFÁ E POLTRONAS
  -- ============================================================================

  -- 2.1 Quantidade de lugares
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Quantidade de lugares', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('1 lugar'),
    ('2 lugares'),
    ('3 lugares'),
    ('4 lugares'),
    ('5 lugares'),
    ('6 lugares'),
    ('7 lugares'),
    ('8 lugares'),
    ('10 lugares'),
    ('12 lugares'),
    ('Modular')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.2 Tipo de sofá
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Tipo de sofá', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Sofá tradicional / Fixo'),
    ('Sofá retrátil e reclinável'),
    ('Sofá retrátil'),
    ('Sofá reclinável'),
    ('Sofá-cama'),
    ('Sofá de canto / Em L'),
    ('Sofá com chaise'),
    ('Sofá modular'),
    ('Sofá living')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.3 Retrátil (Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Retrátil', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.4 Reclinável (Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Reclinável', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.5 Quantidade de posições do reclinável
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Quantidade de posições do reclinável', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Não reclinável'),
    ('2 posições'),
    ('3 posições'),
    ('4 posições'),
    ('5 posições'),
    ('Múltiplas posições'),
    ('Sim'),
    ('Não')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.6 Tipo de mola
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Tipo de mola', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Molas ensacadas (Pocket)'),
    ('Molas espirais (Bonnel)'),
    ('Molas zigue-zague (Nosag)'),
    ('Molas ensacadas e espirais'),
    ('Sem molas (Apenas percintas elásticas)'),
    ('Percintas elásticas italianas')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.7 Pillow top (Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Pillow top', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.8 Almofadas
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Almofadas', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Almofadas fixas'),
    ('Almofadas soltas'),
    ('Almofadas semi-fixas'),
    ('Almofadas com zíper / removíveis'),
    ('Acompanha almofadas decorativas'),
    ('Sim'),
    ('Não')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.9 Material das almofadas
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Material das almofadas', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES 
    ('Fibra siliconada'),
    ('Fibra siliconada e flocos de espuma'),
    ('Espuma D28'),
    ('Espuma D26'),
    ('Espuma D33'),
    ('Flocos de espuma'),
    ('Fibra 100% virgem siliconada')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.10 Entrada USB (Sim / Não)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Entrada USB', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.11 Quantidade de entradas USB (integer)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Quantidade de entradas USB', true, false, 'integer', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'integer', unit = NULL
  RETURNING id INTO v_attr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('1'), ('2'), ('3'), ('4')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 2.12 Profundidade fechado (cm)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Profundidade fechado', true, false, 'measure', 'cm')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'cm';

  -- 2.13 Profundidade aberto (cm)
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Profundidade aberto', true, false, 'measure', 'cm')
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'measure', unit = 'cm';

  -- ============================================================================
  -- 3. EXPANSÃO DE OPÇÕES PARA ATRIBUTOS EXISTENTES (TECIDO E DENSIDADE)
  -- ============================================================================

  -- 3.1 Tecidos adicionais de mercado (Magazine Luiza / Multiloja)
  SELECT id INTO v_attr_id FROM attributes WHERE lower(name) = 'tecido' LIMIT 1;
  IF v_attr_id IS NOT NULL THEN
    INSERT INTO attribute_values (attribute_id, value)
    SELECT v_attr_id, opt FROM (VALUES 
      ('Bouclé'),
      ('Chenille'),
      ('Corino'),
      ('Couro Natural'),
      ('Couro Sintético'),
      ('Jacquard'),
      ('Sarja'),
      ('Suede Amassado'),
      ('Suede Animale'),
      ('Suede Veludo'),
      ('Poliéster'),
      ('Facto'),
      ('Tecido impermeabilizado'),
      ('Algodão')
    ) AS t(opt)
    WHERE NOT EXISTS (
      SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
    );
  END IF;

  -- 3.2 Opções numéricas diretas para Densidade da Espuma
  SELECT id INTO v_attr_id FROM attributes WHERE lower(name) = 'densidade da espuma' LIMIT 1;
  IF v_attr_id IS NOT NULL THEN
    INSERT INTO attribute_values (attribute_id, value)
    SELECT v_attr_id, opt FROM (VALUES 
      ('18'), ('20'), ('23'), ('26'), ('28'), ('33'), ('45')
    ) AS t(opt)
    WHERE NOT EXISTS (
      SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
    );
  END IF;

  -- ============================================================================
  -- 4. VÍNCULOS COM CATEGORIAS (category_attributes)
  -- ============================================================================

  -- 4.1 Categorias de Sofás e Poltronas
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name IN ('Sofás', 'Poltronas')
    AND a.name IN (
      'Quantidade de lugares',
      'Tipo de sofá',
      'Retrátil',
      'Reclinável',
      'Quantidade de posições do reclinável',
      'Tecido',
      'Densidade da Espuma',
      'Tipo de mola',
      'Rodízios',
      'Pillow top',
      'Almofadas',
      'Material das almofadas',
      'Entrada USB',
      'Quantidade de entradas USB',
      'Profundidade fechado',
      'Profundidade aberto',
      'Material da estrutura',
      'Material dos pés',
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

  -- 4.2 Categoria: Cadeiras para Sala de Jantar
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Cadeiras para Sala de Jantar'
    AND a.name IN (
      'Cadeira estofada',
      'Material da cadeira',
      'Material do assento',
      'Material do encosto',
      'Densidade do assento',
      'Densidade da Espuma',
      'Altura da cadeira',
      'Largura da cadeira',
      'Profundidade da cadeira',
      'Altura do assento ao chão',
      'Peso suportado por cadeira',
      'Tecido',
      'Material da estrutura',
      'Material dos pés',
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

  -- 4.3 Categoria: Conjunto para Sala de Jantar
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Conjunto para Sala de Jantar'
    AND a.name IN (
      'Quantidade de lugares',
      'Cadeira estofada',
      'Material da cadeira',
      'Material do assento',
      'Material do encosto',
      'Densidade do assento',
      'Densidade da Espuma',
      'Altura da cadeira',
      'Largura da cadeira',
      'Profundidade da cadeira',
      'Altura do assento ao chão',
      'Peso suportado por cadeira',
      'Tecido',
      'Material da estrutura',
      'Material dos pés',
      'Espessura do MDF/MDP',
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

  -- 4.4 Categoria: Mesa para Sala de Jantar
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Mesa para Sala de Jantar'
    AND a.name IN (
      'Quantidade de lugares',
      'Cadeira estofada',
      'Peso suportado por cadeira',
      'Material da estrutura',
      'Material dos pés',
      'Espessura do MDF/MDP',
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

  -- 4.5 Categoria: Sala de Jantar (Geral)
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Sala de Jantar'
    AND a.name IN (
      'Quantidade de lugares',
      'Cadeira estofada',
      'Material da cadeira',
      'Material do assento',
      'Material do encosto',
      'Densidade do assento',
      'Altura da cadeira',
      'Largura da cadeira',
      'Profundidade da cadeira',
      'Altura do assento ao chão',
      'Peso suportado por cadeira',
      'Tecido',
      'Material da estrutura',
      'Material dos pés',
      'Espessura do MDF/MDP',
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

  -- 4.6 Categoria: Cadeiras para Escritório
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Cadeiras para Escritório'
    AND a.name IN (
      'Altura do assento ao chão',
      'Peso suportado por cadeira',
      'Material do assento',
      'Material do encosto',
      'Densidade do assento',
      'Densidade da Espuma',
      'Tecido',
      'Rodízios',
      'Pés reguláveis'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 4.7 Colchões e Camas/Bases Box (Pillow top, Tipo de mola)
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name IN ('Colchões', 'Camas/Bases Box')
    AND a.name IN (
      'Pillow top',
      'Tipo de mola',
      'Densidade da Espuma',
      'Tecido'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

END $$;
