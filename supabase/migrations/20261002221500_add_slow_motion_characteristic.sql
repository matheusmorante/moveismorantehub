-- ==============================================================================
-- Migration: 20261002221500_add_slow_motion_characteristic.sql
-- Descrição: Criação da característica "Slow motion / Fechamento suave" (Sim / Não)
--            e vinculação a todas as categorias de móveis que possuem portas.
-- ==============================================================================

DO $$
DECLARE
  v_attr_id UUID;
BEGIN

  -- 1. Inserir ou atualizar o atributo Slow motion / Fechamento suave
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Slow motion / Fechamento suave', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_attr_id;

  -- 2. Inserir opções Sim e Não
  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_attr_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_attr_id AND lower(value) = lower(t.opt)
  );

  -- 3. Vincular a todas as categorias que possuem características de porta
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT DISTINCT v_attr_id, ca.category_id, false
  FROM category_attributes ca
  JOIN attributes a ON a.id = ca.attribute_id
  WHERE a.name IN ('Quantidade de portas', 'Tipo de portas', 'Material das portas')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

END $$;
