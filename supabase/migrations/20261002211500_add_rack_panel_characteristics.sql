-- Migration: 20261002211500_add_rack_panel_characteristics.sql
-- Adiciona características de Rack e Painel (Nichos, Polegadas suportadas, Passa fios, Possui LED)
-- e vincula às categorias Rack, Painel, Homes e Guarda-Roupas.

-- 1. Criação dos atributos
CREATE OR REPLACE FUNCTION public._upsert_characteristic(
  p_name text,
  p_data_type text,
  p_unit text DEFAULT NULL,
  p_options text[] DEFAULT ARRAY[]::text[]
) RETURNS void AS $$
DECLARE
  v_id uuid;
  v_opt text;
BEGIN
  INSERT INTO public.attributes (name, data_type, unit, active)
  VALUES (p_name, p_data_type, p_unit, true)
  ON CONFLICT (name) DO UPDATE
  SET data_type = EXCLUDED.data_type,
      unit = coalesce(EXCLUDED.unit, public.attributes.unit)
  RETURNING id INTO v_id;

  IF array_length(p_options, 1) > 0 THEN
    FOREACH v_opt IN ARRAY p_options LOOP
      INSERT INTO public.attribute_values (attribute_id, value)
      VALUES (v_id, v_opt)
      ON CONFLICT (attribute_id, value) DO NOTHING;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT public._upsert_characteristic('Quantidade de nichos', 'integer', NULL, ARRAY[]::text[]);
SELECT public._upsert_characteristic('Polegadas suportadas', 'integer', '"', ARRAY[]::text[]);
SELECT public._upsert_characteristic('Passa fios', 'radio', NULL, ARRAY['Sim', 'Não']);
SELECT public._upsert_characteristic('Possui LED', 'radio', NULL, ARRAY['Sim', 'Não']);

DROP FUNCTION IF EXISTS public._upsert_characteristic(text, text, text, text[]);

-- 2. Vincular atributos às categorias especificadas
DO $$
DECLARE
  v_attr_id uuid;
  v_cat_id uuid;
  v_cat_name text;
  v_attr_name text;
  v_target_categories text[] := ARRAY['Racks', 'Painéis', 'Homes'];
  v_target_attributes text[] := ARRAY['Quantidade de nichos', 'Polegadas suportadas', 'Passa fios', 'Possui LED'];
BEGIN
  -- Vínculos para Racks, Painéis e Homes
  FOREACH v_cat_name IN ARRAY v_target_categories LOOP
    SELECT id INTO v_cat_id FROM public.categories WHERE type = 'category' AND lower(trim(name)) = lower(trim(v_cat_name)) LIMIT 1;
    IF v_cat_id IS NOT NULL THEN
      FOREACH v_attr_name IN ARRAY v_target_attributes LOOP
        SELECT id INTO v_attr_id FROM public.attributes WHERE lower(trim(name)) = lower(trim(v_attr_name)) LIMIT 1;
        IF v_attr_id IS NOT NULL THEN
          INSERT INTO public.category_attributes (category_id, attribute_id, is_required)
          VALUES (v_cat_id, v_attr_id, false)
          ON CONFLICT (attribute_id, category_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Adicionar portas e gavetas a Painéis também (conforme mencionado pelo usuário)
  SELECT id INTO v_cat_id FROM public.categories WHERE type = 'category' AND lower(trim(name)) = 'painéis' LIMIT 1;
  IF v_cat_id IS NOT NULL THEN
    FOREACH v_attr_name IN ARRAY ARRAY['Quantidade de portas', 'Tipo de portas', 'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador'] LOOP
      SELECT id INTO v_attr_id FROM public.attributes WHERE lower(trim(name)) = lower(trim(v_attr_name)) LIMIT 1;
      IF v_attr_id IS NOT NULL THEN
        INSERT INTO public.category_attributes (category_id, attribute_id, is_required)
        VALUES (v_cat_id, v_attr_id, false)
        ON CONFLICT (attribute_id, category_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Vínculo de Possui LED para Guarda-Roupas
  SELECT id INTO v_cat_id FROM public.categories WHERE type = 'category' AND lower(trim(name)) = 'guarda-roupas' LIMIT 1;
  SELECT id INTO v_attr_id FROM public.attributes WHERE lower(trim(name)) = 'possui led' LIMIT 1;
  IF v_cat_id IS NOT NULL AND v_attr_id IS NOT NULL THEN
    INSERT INTO public.category_attributes (category_id, attribute_id, is_required)
    VALUES (v_cat_id, v_attr_id, false)
    ON CONFLICT (attribute_id, category_id) DO NOTHING;
  END IF;
END $$;
