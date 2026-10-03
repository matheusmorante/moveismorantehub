-- ==============================================================================
-- Migration: 20261002233000_add_drawer_materials_and_table_characteristics.sql
-- Descrição: 
--   1. Criação da característica "Material das gavetas" vinculada a categorias com gavetas.
--   2. Criação das características "Superfície de vidro" e "Canto arredondado" (Sim / Não)
--      vinculadas a mesas de jantar e escritório.
--   3. Remoção de características de portas de "Mesas para Escritório" (mesas não possuem portas).
-- ==============================================================================

DO $$
DECLARE
  v_mat_gavetas_id UUID;
  v_sup_vidro_id UUID;
  v_canto_arr_id UUID;
  v_category_id UUID;
BEGIN

  -- 1. Característica "Material das gavetas"
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Material das gavetas', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_mat_gavetas_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_mat_gavetas_id, opt FROM (VALUES 
    ('100% MDF'),
    ('MDF/MDP'),
    ('MDP'),
    ('Madeira Maciça'),
    ('MDF/Vidro'),
    ('MDP/Vidro'),
    ('HDF')
  ) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_mat_gavetas_id AND lower(value) = lower(t.opt)
  );

  -- Vincular a todas as categorias que possuem características de gavetas
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT DISTINCT v_mat_gavetas_id, ca.category_id, false
  FROM category_attributes ca
  JOIN attributes a ON a.id = ca.attribute_id
  WHERE a.name IN ('Quantidade de gavetas', 'Tipo/material da corrediça')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;


  -- 2. Característica "Superfície de vidro"
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Superfície de vidro', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_sup_vidro_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_sup_vidro_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_sup_vidro_id AND lower(value) = lower(t.opt)
  );


  -- 3. Característica "Canto arredondado"
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Canto arredondado', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_canto_arr_id;

  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_canto_arr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_canto_arr_id AND lower(value) = lower(t.opt)
  );


  -- 4. Vincular "Superfície de vidro" e "Canto arredondado" a categorias de mesas de jantar e escritório
  FOR v_category_id IN
    SELECT id FROM categories 
    WHERE name IN (
      'Mesa para Sala de Jantar',
      'Conjunto para Sala de Jantar',
      'Sala de Jantar',
      'Mesas para Escritório',
      'Escritório'
    )
  LOOP
    INSERT INTO category_attributes (attribute_id, category_id, is_required)
    VALUES 
      (v_sup_vidro_id, v_category_id, false),
      (v_canto_arr_id, v_category_id, false)
    ON CONFLICT (attribute_id, category_id) DO NOTHING;
  END LOOP;


  -- 5. Remover características de portas da categoria "Mesas para Escritório"
  DELETE FROM category_attributes
  WHERE category_id IN (SELECT id FROM categories WHERE name = 'Mesas para Escritório')
    AND attribute_id IN (
      SELECT id FROM attributes 
      WHERE name IN (
        'Quantidade de portas',
        'Tipo de portas',
        'Material das portas',
        'Slow motion / Fechamento suave'
      )
    );

END $$;
