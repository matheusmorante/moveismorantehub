-- Adiciona colunas data_type e unit na tabela attributes se não existirem
ALTER TABLE public.attributes
ADD COLUMN IF NOT EXISTS data_type varchar DEFAULT 'list',
ADD COLUMN IF NOT EXISTS unit varchar;

-- Configura tipo Numérico Real (measure)
UPDATE public.attributes
SET data_type = 'measure'
WHERE lower(name) IN ('altura', 'largura', 'profundidade', 'peso');

-- Configura tipo Numérico Inteiro (integer)
UPDATE public.attributes
SET data_type = 'integer'
WHERE lower(name) IN ('quantidade de gavetas', 'quantidade de portas');

-- Configura tipo Escolha Única (radio)
UPDATE public.attributes
SET data_type = 'radio'
WHERE lower(name) IN (
  'densidade da espuma',
  'tecido',
  'sistema de deslizamento da gaveta',
  'tipo de porta',
  'tipo de pés',
  'tipo de puxador',
  'acabamento',
  'cor',
  'estrutura'
);

-- Ajusta Espelhos -> Espelho, radio, opções 'Sim' e 'Não'
DO $$
DECLARE
  v_esp_id uuid;
BEGIN
  SELECT id INTO v_esp_id FROM public.attributes WHERE lower(name) IN ('espelho', 'espelhos') LIMIT 1;
  IF v_esp_id IS NOT NULL THEN
    UPDATE public.attributes SET name = 'Espelho', data_type = 'radio' WHERE id = v_esp_id;
    UPDATE public.attribute_values SET value = 'Sim' WHERE attribute_id = v_esp_id AND lower(value) IN ('com espelho', 'sim');
    IF NOT EXISTS (SELECT 1 FROM public.attribute_values WHERE attribute_id = v_esp_id AND lower(value) = 'não') THEN
      INSERT INTO public.attribute_values (attribute_id, value) VALUES (v_esp_id, 'Não');
    END IF;

    UPDATE public.products
    SET technical_specs = jsonb_set(
      jsonb_set(
        technical_specs,
        '{technicalValues}',
        (technical_specs->'technicalValues') - 'Espelhos'
      ),
      '{technicalValues,Espelho}',
      to_jsonb('Sim'::text)
    )
    WHERE technical_specs->'technicalValues' ? 'Espelhos';

    UPDATE public.product_variations
    SET attributes = (attributes - 'Espelhos') || jsonb_build_object('Espelho', 'Sim')
    WHERE attributes ? 'Espelhos';
  END IF;
END $$;

-- Remove Complexidade da Montagem
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.attributes WHERE lower(name) LIKE '%complexidade%montagem%' LOOP
    DELETE FROM public.category_attributes WHERE attribute_id = r.id;
    DELETE FROM public.attribute_values WHERE attribute_id = r.id;
    DELETE FROM public.attributes WHERE id = r.id;
  END LOOP;
END $$;
