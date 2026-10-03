-- Migration: 20261002204500_ensure_product_characteristics.sql
-- Garante os campos solicitados para características de produtos,
-- atualizando equivalentes existentes com segurança e criando os novos atributos.

-- 1. Renomear 'Contém espelho' / 'Espelho' para 'Possui espelho' (radio: Sim / Não)
DO $$
DECLARE
  v_attr_id uuid;
BEGIN
  SELECT id INTO v_attr_id FROM public.attributes WHERE lower(trim(name)) IN ('contém espelho', 'espelho', 'espelhos', 'possui espelho') LIMIT 1;
  IF v_attr_id IS NOT NULL THEN
    UPDATE public.attributes
    SET name = 'Possui espelho', data_type = 'radio'
    WHERE id = v_attr_id;

    INSERT INTO public.attribute_values (attribute_id, value)
    VALUES (v_attr_id, 'Sim'), (v_attr_id, 'Não')
    ON CONFLICT (attribute_id, value) DO NOTHING;

    -- Migrar em products.technical_specs preservando dados existentes
    UPDATE public.products
    SET technical_specs = jsonb_set(
      coalesce(technical_specs, '{}'::jsonb),
      '{technicalValues}',
      jsonb_build_object(
        'Possui espelho', coalesce(technical_specs->'technicalValues'->'Possui espelho', technical_specs->'technicalValues'->'Contém espelho', technical_specs->'technicalValues'->'Espelho')
      ) || (coalesce(technical_specs->'technicalValues', '{}'::jsonb) - 'Contém espelho' - 'Espelho'),
      true
    )
    WHERE technical_specs->'technicalValues' ? 'Contém espelho'
       OR technical_specs->'technicalValues' ? 'Espelho';

    -- Migrar em product_variations.attributes
    UPDATE public.product_variations
    SET attributes = (attributes - 'Contém espelho' - 'Espelho') || jsonb_build_object('Possui espelho', coalesce(attributes->'Possui espelho', attributes->'Contém espelho', attributes->'Espelho'))
    WHERE attributes ? 'Contém espelho' OR attributes ? 'Espelho';
  ELSE
    INSERT INTO public.attributes (name, data_type, active)
    VALUES ('Possui espelho', 'radio', true)
    RETURNING id INTO v_attr_id;

    INSERT INTO public.attribute_values (attribute_id, value)
    VALUES (v_attr_id, 'Sim'), (v_attr_id, 'Não')
    ON CONFLICT (attribute_id, value) DO NOTHING;
  END IF;
END $$;

-- 2. Renomear 'Sistema de deslizamento da gaveta' para 'Tipo/material da corrediça'
DO $$
DECLARE
  v_attr_id uuid;
BEGIN
  SELECT id INTO v_attr_id FROM public.attributes WHERE lower(trim(name)) IN ('sistema de deslizamento da gaveta', 'tipo de corrediça', 'tipo/material da corrediça') LIMIT 1;
  IF v_attr_id IS NOT NULL THEN
    UPDATE public.attributes
    SET name = 'Tipo/material da corrediça', data_type = 'radio'
    WHERE id = v_attr_id;

    -- Migrar em products.technical_specs preservando dados existentes
    UPDATE public.products
    SET technical_specs = jsonb_set(
      coalesce(technical_specs, '{}'::jsonb),
      '{technicalValues}',
      jsonb_build_object(
        'Tipo/material da corrediça', coalesce(technical_specs->'technicalValues'->'Tipo/material da corrediça', technical_specs->'technicalValues'->'Sistema de deslizamento da gaveta', technical_specs->'technicalValues'->'Tipo de corrediça')
      ) || (coalesce(technical_specs->'technicalValues', '{}'::jsonb) - 'Sistema de deslizamento da gaveta' - 'Tipo de corrediça'),
      true
    )
    WHERE technical_specs->'technicalValues' ? 'Sistema de deslizamento da gaveta'
       OR technical_specs->'technicalValues' ? 'Tipo de corrediça';

    -- Migrar em product_variations.attributes
    UPDATE public.product_variations
    SET attributes = (attributes - 'Sistema de deslizamento da gaveta' - 'Tipo de corrediça') || jsonb_build_object('Tipo/material da corrediça', coalesce(attributes->'Tipo/material da corrediça', attributes->'Sistema de deslizamento da gaveta', attributes->'Tipo de corrediça'))
    WHERE attributes ? 'Sistema de deslizamento da gaveta' OR attributes ? 'Tipo de corrediça';
  ELSE
    INSERT INTO public.attributes (name, data_type, active)
    VALUES ('Tipo/material da corrediça', 'radio', true)
    RETURNING id INTO v_attr_id;

    INSERT INTO public.attribute_values (attribute_id, value)
    VALUES
      (v_attr_id, 'Corrediça metálica simples'),
      (v_attr_id, 'Corrediça telescópica'),
      (v_attr_id, 'Corrediça telescópica com amortecedor'),
      (v_attr_id, 'Corrediça invisível / oculta'),
      (v_attr_id, 'Guia de madeira'),
      (v_attr_id, 'Guia plástica')
    ON CONFLICT (attribute_id, value) DO NOTHING;
  END IF;
END $$;

-- 3. Criação e garantia dos demais atributos com tipos e opções iniciais
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

-- Executar criação dos atributos
SELECT public._upsert_characteristic('Marca', 'radio', NULL, ARRAY['Móveis Morante']);
SELECT public._upsert_characteristic('Modelo', 'radio', NULL, ARRAY[]::text[]);
SELECT public._upsert_characteristic('Linha', 'radio', NULL, ARRAY[]::text[]);

SELECT public._upsert_characteristic('Material das portas', 'radio', NULL, ARRAY[
  '100% MDF',
  'MDP',
  'MDF/MDP',
  'Vidro',
  'Espelho',
  'MDF/Vidro',
  'MDP/Vidro',
  'Alumínio/Vidro',
  'Madeira Maciça'
]);

SELECT public._upsert_characteristic('Espessura do MDF/MDP', 'radio', NULL, ARRAY[
  '12 mm',
  '15 mm',
  '18 mm',
  '22 mm',
  '25 mm'
]);

SELECT public._upsert_characteristic('Material do fundo', 'radio', NULL, ARRAY[
  'HDF 3mm',
  'MDF 3mm',
  'MDP',
  'Madeira'
]);

SELECT public._upsert_characteristic('Material do cabideiro', 'radio', NULL, ARRAY[
  'Alumínio',
  'Madeira',
  'Metal / Aço',
  'Plástico'
]);

SELECT public._upsert_characteristic('Quantidade de cabideiros', 'integer', NULL, ARRAY[]::text[]);

SELECT public._upsert_characteristic('Calceiro', 'radio', NULL, ARRAY['Sim', 'Não']);

SELECT public._upsert_characteristic('Tipo de puxador', 'radio', NULL, ARRAY[
  'Cava / Embutido',
  'Externo',
  'Concha',
  'Perfil',
  'Ponto',
  'Sem puxador'
]);

SELECT public._upsert_characteristic('Pés reguláveis', 'radio', NULL, ARRAY['Sim', 'Não']);
SELECT public._upsert_characteristic('Rodízios', 'radio', NULL, ARRAY['Sim', 'Não']);

SELECT public._upsert_characteristic('Quantidade de prateleiras', 'integer', NULL, ARRAY[]::text[]);

SELECT public._upsert_characteristic('Material das prateleiras', 'radio', NULL, ARRAY[
  '100% MDF',
  'MDP',
  'MDF/MDP',
  'Vidro',
  'Madeira Maciça'
]);

SELECT public._upsert_characteristic('Peso suportado por prateleira', 'measure', 'kg', ARRAY[]::text[]);

SELECT public._upsert_characteristic('Maleiro', 'radio', NULL, ARRAY['Sim', 'Não']);
SELECT public._upsert_characteristic('Divisão ele e ela', 'radio', NULL, ARRAY['Sim', 'Não']);

SELECT public._upsert_characteristic('Quantidade de espelhos', 'integer', NULL, ARRAY[]::text[]);
SELECT public._upsert_characteristic('Comprimento do espelho', 'measure', 'cm', ARRAY[]::text[]);
SELECT public._upsert_characteristic('Largura do espelho', 'measure', 'cm', ARRAY[]::text[]);
SELECT public._upsert_characteristic('Altura do espelho', 'measure', 'cm', ARRAY[]::text[]);

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS public._upsert_characteristic(text, text, text, text[]);
