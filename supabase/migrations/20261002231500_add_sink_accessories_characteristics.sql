-- ==============================================================================
-- Migration: 20261002231500_add_sink_accessories_characteristics.sql
-- Descrição: Criação das características "Acompanha válvula" e "Acompanha sifão" (Sim / Não)
--            e vinculação às categorias Pias, Balcões para Pia e Conjuntos para Banheiro.
-- ==============================================================================

DO $$
DECLARE
  v_valvula_id UUID;
  v_sifao_id UUID;
  v_category_id UUID;
BEGIN

  -- 1. Inserir ou atualizar a característica "Acompanha válvula"
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Acompanha válvula', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_valvula_id;

  -- Inserir opções Sim e Não
  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_valvula_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_valvula_id AND lower(value) = lower(t.opt)
  );

  -- 2. Inserir ou atualizar a característica "Acompanha sifão"
  INSERT INTO attributes (name, active, is_globally_required, data_type, unit)
  VALUES ('Acompanha sifão', true, false, 'radio', NULL)
  ON CONFLICT (name) DO UPDATE 
    SET active = true, data_type = 'radio', unit = NULL
  RETURNING id INTO v_sifao_id;

  -- Inserir opções Sim e Não
  INSERT INTO attribute_values (attribute_id, value)
  SELECT v_sifao_id, opt FROM (VALUES ('Sim'), ('Não')) AS t(opt)
  WHERE NOT EXISTS (
    SELECT 1 FROM attribute_values WHERE attribute_id = v_sifao_id AND lower(value) = lower(t.opt)
  );

  -- 3. Vincular às categorias: Pias, Balcões para Pia e Conjuntos para Banheiro
  FOR v_category_id IN
    SELECT id FROM categories WHERE name IN ('Pias', 'Balcões para Pia', 'Conjuntos para Banheiro')
  LOOP
    INSERT INTO category_attributes (attribute_id, category_id, is_required)
    VALUES 
      (v_valvula_id, v_category_id, false),
      (v_sifao_id, v_category_id, false)
    ON CONFLICT (attribute_id, category_id) DO NOTHING;
  END LOOP;

END $$;
