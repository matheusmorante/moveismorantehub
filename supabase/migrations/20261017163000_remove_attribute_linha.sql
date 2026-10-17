-- Migration: 20261017163000_remove_attribute_linha.sql
-- Description: Remove o atributo redundante 'Linha', preservando e consolidando em 'Modelo/Linha'

DO $$
DECLARE
  v_linha_id UUID;
BEGIN
  -- 1. Obter ID do atributo 'Linha'
  SELECT id INTO v_linha_id FROM public.attributes WHERE lower(btrim(name)) = 'linha';

  -- 2. Migrar valores de 'Linha' para 'Modelo/Linha' em technical_specs nos produtos caso 'Modelo/Linha' não esteja preenchido
  UPDATE public.products p
  SET 
    technical_specs = jsonb_set(
      p.technical_specs,
      '{technicalValues,Modelo/Linha}',
      p.technical_specs->'technicalValues'->'Linha',
      true
    ),
    updated_at = NOW()
  WHERE (p.technical_specs->'technicalValues'->>'Linha') IS NOT NULL
    AND (p.technical_specs->'technicalValues'->>'Linha') NOT IN ('Não se aplica', 'nao se aplica', '')
    AND (
      p.technical_specs->'technicalValues'->>'Modelo/Linha' IS NULL
      OR p.technical_specs->'technicalValues'->>'Modelo/Linha' IN ('Não se aplica', 'nao se aplica', '')
    )
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  -- 3. Remover a chave 'Linha' de technicalValues nos produtos
  UPDATE public.products p
  SET 
    technical_specs = p.technical_specs #- '{technicalValues,Linha}',
    updated_at = NOW()
  WHERE p.technical_specs->'technicalValues' ? 'Linha'
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  -- 4. Remover a chave 'Linha' de draftProduct.technicalValues nos produtos se existir
  UPDATE public.products p
  SET 
    technical_specs = p.technical_specs #- '{draftProduct,technicalValues,Linha}',
    updated_at = NOW()
  WHERE p.technical_specs->'draftProduct'->'technicalValues' ? 'Linha'
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  -- 5. Remover eventual chave 'Linha' em product_variations.attributes se existir
  UPDATE public.product_variations pv
  SET attributes = pv.attributes - 'Linha'
  WHERE pv.attributes ? 'Linha';

  -- 6. Remover o atributo 'Linha' de category_attributes e de attributes
  IF v_linha_id IS NOT NULL THEN
    DELETE FROM public.category_attributes WHERE attribute_id = v_linha_id;
    DELETE FROM public.attribute_values WHERE attribute_id = v_linha_id;
    DELETE FROM public.attributes WHERE id = v_linha_id;
  END IF;

END $$;
