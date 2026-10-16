-- Migration: 20261015190000_replace_madeira_with_madeira_macica_in_puxadores.sql
-- Description: Substitui a opção genérica 'Madeira' por 'Madeira Maciça' em 'Material dos puxadores' e atualiza os produtos correspondentes.

DO $$
DECLARE
  v_attr_id UUID;
BEGIN
  -- 1. Obter o ID do atributo 'Material dos puxadores'
  SELECT id INTO v_attr_id FROM public.attributes WHERE name = 'Material dos puxadores';
  
  IF v_attr_id IS NOT NULL THEN
    -- 2. Atualizar o valor em attribute_values de 'Madeira' para 'Madeira Maciça'
    UPDATE public.attribute_values
    SET value = 'Madeira Maciça'
    WHERE attribute_id = v_attr_id AND value = 'Madeira';
  END IF;

  -- 3. Atualizar produtos do catálogo que continham 'Madeira' em 'Material dos puxadores' para 'Madeira Maciça'
  UPDATE public.products p
  SET 
    technical_specs = jsonb_set(
      COALESCE(p.technical_specs, '{"technicalValues": {}}'::jsonb),
      '{technicalValues,Material dos puxadores}',
      to_jsonb('Madeira Maciça'::text)
    ),
    updated_at = NOW()
  WHERE (p.technical_specs->'technicalValues'->>'Material dos puxadores') = 'Madeira'
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

END $$;
