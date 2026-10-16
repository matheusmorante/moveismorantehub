-- Migration: 20261015200000_remove_sem_puxador_and_embutido_cava.sql
-- Description: Remove as opções 'Embutido / Cava' e 'Sem puxador' do atributo 'Material dos puxadores'

DO $$
DECLARE
  v_attr_id UUID;
BEGIN
  -- Obter o ID do atributo 'Material dos puxadores'
  SELECT id INTO v_attr_id FROM public.attributes WHERE name = 'Material dos puxadores';

  IF v_attr_id IS NOT NULL THEN
    -- Excluir 'Embutido / Cava' e 'Sem puxador'
    DELETE FROM public.attribute_values
    WHERE attribute_id = v_attr_id
      AND value IN ('Embutido / Cava', 'Sem puxador');
  END IF;

  -- Limpar eventual ocorrência desses valores em technical_specs caso existisse
  UPDATE public.products p
  SET 
    technical_specs = (p.technical_specs #- '{technicalValues,Material dos puxadores}'),
    updated_at = NOW()
  WHERE (p.technical_specs->'technicalValues'->>'Material dos puxadores') IN ('Embutido / Cava', 'Sem puxador')
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

END $$;
