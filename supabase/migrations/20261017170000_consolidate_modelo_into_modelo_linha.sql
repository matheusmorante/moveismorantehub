-- Migration: 20261017170000_consolidate_modelo_into_modelo_linha.sql
-- Description: Consolida o campo 'Modelo' em 'Modelo/Linha', garantindo campo único e compatibilidade de dados legados

DO $$
DECLARE
  v_modelo_id UUID;
BEGIN
  -- 1. Obter ID de eventual atributo 'Modelo' na tabela attributes
  SELECT id INTO v_modelo_id FROM public.attributes WHERE lower(btrim(name)) = 'modelo';

  -- 2. Migrar valores de 'Modelo' para 'Modelo/Linha' em technical_specs nos produtos caso 'Modelo/Linha' não esteja preenchido
  UPDATE public.products p
  SET 
    technical_specs = jsonb_set(
      p.technical_specs,
      '{technicalValues,Modelo/Linha}',
      p.technical_specs->'technicalValues'->'Modelo',
      true
    ),
    updated_at = NOW()
  WHERE (p.technical_specs->'technicalValues'->>'Modelo') IS NOT NULL
    AND (p.technical_specs->'technicalValues'->>'Modelo') NOT IN ('Não se aplica', 'nao se aplica', '')
    AND (
      p.technical_specs->'technicalValues'->>'Modelo/Linha' IS NULL
      OR p.technical_specs->'technicalValues'->>'Modelo/Linha' IN ('Não se aplica', 'nao se aplica', '')
    )
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  -- 3. Remover a chave 'Modelo' de technicalValues nos produtos (consolidando em Modelo/Linha)
  UPDATE public.products p
  SET 
    technical_specs = p.technical_specs #- '{technicalValues,Modelo}',
    updated_at = NOW()
  WHERE p.technical_specs->'technicalValues' ? 'Modelo'
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  -- 4. Remover eventual chave 'modelo' (minúscula) de technicalValues nos produtos
  UPDATE public.products p
  SET 
    technical_specs = p.technical_specs #- '{technicalValues,modelo}',
    updated_at = NOW()
  WHERE p.technical_specs->'technicalValues' ? 'modelo'
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  -- 5. Mesma consolidação para draftProduct.technicalValues caso exista
  UPDATE public.products p
  SET 
    technical_specs = jsonb_set(
      p.technical_specs,
      '{draftProduct,technicalValues,Modelo/Linha}',
      p.technical_specs->'draftProduct'->'technicalValues'->'Modelo',
      true
    ),
    updated_at = NOW()
  WHERE (p.technical_specs->'draftProduct'->'technicalValues'->>'Modelo') IS NOT NULL
    AND (p.technical_specs->'draftProduct'->'technicalValues'->>'Modelo') NOT IN ('Não se aplica', 'nao se aplica', '')
    AND (
      p.technical_specs->'draftProduct'->'technicalValues'->>'Modelo/Linha' IS NULL
      OR p.technical_specs->'draftProduct'->'technicalValues'->>'Modelo/Linha' IN ('Não se aplica', 'nao se aplica', '')
    )
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  UPDATE public.products p
  SET 
    technical_specs = (p.technical_specs #- '{draftProduct,technicalValues,Modelo}') #- '{draftProduct,technicalValues,modelo}',
    updated_at = NOW()
  WHERE (p.technical_specs->'draftProduct'->'technicalValues' ? 'Modelo' OR p.technical_specs->'draftProduct'->'technicalValues' ? 'modelo')
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';

  -- 6. Atualizar variações caso tenham atributo com name = 'Modelo'
  UPDATE public.product_variations
  SET attributes = (
    SELECT jsonb_agg(
      CASE 
        WHEN lower(btrim(elem->>'name')) = 'modelo' THEN jsonb_set(elem, '{name}', '"Modelo/Linha"')
        ELSE elem
      END
    )
    FROM jsonb_array_elements(attributes) AS elem
  )
  WHERE jsonb_typeof(attributes) = 'array'
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(attributes) AS elem
      WHERE lower(btrim(elem->>'name')) = 'modelo'
    );

  -- 7. Se houver atributo 'Modelo' na tabela attributes, deletar
  IF v_modelo_id IS NOT NULL THEN
    DELETE FROM public.category_attributes WHERE attribute_id = v_modelo_id;
    DELETE FROM public.attribute_values WHERE attribute_id = v_modelo_id;
    DELETE FROM public.attributes WHERE id = v_modelo_id;
  END IF;

END $$;
