-- Migration: 20261015170000_update_puxadores_characteristics.sql
-- Descrição: Ajusta opções de 'Tipo de puxador' para lista canônica:
-- 1. Alça, 2. Perfil, 3. Cava, 4. Passante, 5. Concha
-- e adiciona 'MDF' e 'MDP' em 'Material dos puxadores'.

DO $$
DECLARE
  v_tipo_puxador_id uuid;
  v_mat_puxadores_id uuid;
BEGIN
  SELECT id INTO v_tipo_puxador_id FROM public.attributes WHERE name = 'Tipo de puxador' LIMIT 1;
  SELECT id INTO v_mat_puxadores_id FROM public.attributes WHERE name = 'Material dos puxadores' LIMIT 1;

  IF v_tipo_puxador_id IS NOT NULL THEN
    -- Limpar opções antigas
    DELETE FROM public.attribute_values WHERE attribute_id = v_tipo_puxador_id;

    -- Inserir as novas opções na ordem exata solicitada
    INSERT INTO public.attribute_values (attribute_id, value, sort_order)
    VALUES
      (v_tipo_puxador_id, 'Alça', 1),
      (v_tipo_puxador_id, 'Perfilado', 2),
      (v_tipo_puxador_id, 'Cava', 3),
      (v_tipo_puxador_id, 'Passante', 4),
      (v_tipo_puxador_id, 'Concha', 5);
  END IF;

  IF v_mat_puxadores_id IS NOT NULL THEN
    -- Inserir MDF e MDP
    INSERT INTO public.attribute_values (attribute_id, value, sort_order)
    VALUES (v_mat_puxadores_id, 'MDF', 1)
    ON CONFLICT (attribute_id, value) DO UPDATE SET sort_order = 1;

    INSERT INTO public.attribute_values (attribute_id, value, sort_order)
    VALUES (v_mat_puxadores_id, 'MDP', 2)
    ON CONFLICT (attribute_id, value) DO UPDATE SET sort_order = 2;

    -- Ordenação canônica das demais opções
    UPDATE public.attribute_values SET sort_order = 3 WHERE attribute_id = v_mat_puxadores_id AND value = 'Madeira';
    UPDATE public.attribute_values SET sort_order = 4 WHERE attribute_id = v_mat_puxadores_id AND value = 'Alumínio / Metal';
    UPDATE public.attribute_values SET sort_order = 5 WHERE attribute_id = v_mat_puxadores_id AND value = 'Plástico / ABS';
    UPDATE public.attribute_values SET sort_order = 6 WHERE attribute_id = v_mat_puxadores_id AND value = 'Embutido / Cava';
    UPDATE public.attribute_values SET sort_order = 7 WHERE attribute_id = v_mat_puxadores_id AND value = 'Sem puxador';
  END IF;

  -- Atualizar produtos existentes
  UPDATE public.products p
  SET technical_specs = jsonb_set(
    technical_specs,
    '{technicalValues,Tipo de puxador}',
    '"Alça"'::jsonb
  )
  WHERE p.technical_specs->'technicalValues'->>'Tipo de puxador' IN (
    'Comum (Alongado / Botão de 1 furo / Concha)',
    'Comum (Alongado / Botão de 1 furo)',
    'Externo'
  )
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  UPDATE public.products p
  SET technical_specs = jsonb_set(
    technical_specs,
    '{technicalValues,Tipo de puxador}',
    '"Cava"'::jsonb
  )
  WHERE p.technical_specs->'technicalValues'->>'Tipo de puxador' IN ('Cava / Embutido', 'Cava / Usinado')
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  UPDATE public.products p
  SET technical_specs = jsonb_set(
    technical_specs,
    '{technicalValues,Tipo de puxador}',
    '"Perfilado"'::jsonb
  )
  WHERE p.technical_specs->'technicalValues'->>'Tipo de puxador' = 'Perfil'
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  UPDATE public.products p
  SET technical_specs = jsonb_set(
    technical_specs,
    '{technicalValues,Tipo de puxador}',
    '"Passante"'::jsonb
  )
  WHERE p.technical_specs->'technicalValues'->>'Tipo de puxador' IN ('Passante (Chapa passante)')
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';
END $$;
