-- Normalização idempotente das características padrão por nome canônico.
UPDATE public.attributes SET data_type = 'integer'
WHERE lower(trim(name)) IN ('altura', 'largura', 'profundidade');
UPDATE public.attributes SET data_type = 'measure'
WHERE lower(trim(name)) = 'peso';
UPDATE public.attributes SET data_type = 'radio'
WHERE lower(trim(name)) IN ('densidade de espuma', 'tecido', 'sistema de deslizamento da gaveta', 'cor', 'estrutura');
UPDATE public.attributes SET data_type = 'multi_select'
WHERE lower(trim(name)) IN ('tipo de porta', 'tipo de pés', 'tipo de puxador', 'acabamento');
UPDATE public.attributes SET data_type = 'integer'
WHERE lower(trim(name)) IN ('quantidade de gavetas', 'quantidade de portas');

-- Renomeia o padrão canônico sem criar duplicidade e mantém seus valores.
UPDATE public.attributes SET name = 'Contém espelhos', data_type = 'radio'
WHERE lower(trim(name)) = 'espelho'
  AND NOT EXISTS (SELECT 1 FROM public.attributes a2 WHERE lower(trim(a2.name)) = 'contém espelhos');
UPDATE public.attribute_values SET value = CASE
  WHEN lower(trim(value)) IN ('sim', 'true', 'com espelho', 'contém espelho') THEN 'Sim'
  ELSE 'Não'
END
WHERE attribute_id IN (SELECT id FROM public.attributes WHERE lower(trim(name)) = 'contém espelhos');
DELETE FROM public.attribute_values av
WHERE av.attribute_id IN (SELECT id FROM public.attributes WHERE lower(trim(name)) = 'contém espelhos')
  AND av.value NOT IN ('Sim', 'Não');
INSERT INTO public.attribute_values(attribute_id, value)
SELECT a.id, v.value
FROM public.attributes a CROSS JOIN (VALUES ('Sim'), ('Não')) v(value)
WHERE lower(trim(a.name)) = 'contém espelhos'
  AND NOT EXISTS (SELECT 1 FROM public.attribute_values av WHERE av.attribute_id = a.id AND av.value = v.value);
UPDATE public.product_variations SET attributes = (attributes - 'Espelho') || jsonb_build_object('Contém espelhos', COALESCE(attributes->'Espelho', '"Não"'::jsonb))
WHERE attributes ? 'Espelho' AND NOT (attributes ? 'Contém espelhos');

-- Tipo de porta: valores combinados passam a representar opções atômicas.
DO $$
DECLARE r record; atoms jsonb;
BEGIN
  FOR r IN SELECT id, attributes->>'Tipo de porta' AS value FROM public.product_variations
    WHERE attributes ? 'Tipo de porta' AND attributes->>'Tipo de porta' LIKE '%+%'
  LOOP
    SELECT jsonb_agg(trimmed) INTO atoms
    FROM (SELECT to_jsonb(trim(value)) AS trimmed FROM unnest(string_to_array(r.value, '+')) value) parts;
    UPDATE public.product_variations SET attributes = jsonb_set(attributes, '{Tipo de porta}', COALESCE(atoms, '[]'::jsonb)) WHERE id = r.id;
  END LOOP;
END $$;
UPDATE public.attribute_values
SET value = 'Bater'
WHERE attribute_id IN (SELECT id FROM public.attributes WHERE lower(trim(name)) = 'tipo de porta')
  AND lower(trim(value)) LIKE '%bater%+%'
  AND lower(trim(value)) NOT LIKE '%correr%'
  AND lower(trim(value)) NOT LIKE '%basculante%';
DELETE FROM public.attribute_values av
WHERE av.attribute_id IN (SELECT id FROM public.attributes WHERE lower(trim(name)) = 'tipo de porta')
  AND lower(trim(av.value)) LIKE '%+%';

-- Remove somente o padrão exato, incluindo seus vínculos e valores.
DELETE FROM public.category_attributes WHERE attribute_id IN (
  SELECT id FROM public.attributes WHERE lower(trim(name)) = 'complexidade de montagem'
);
DELETE FROM public.attribute_values WHERE attribute_id IN (
  SELECT id FROM public.attributes WHERE lower(trim(name)) = 'complexidade de montagem'
);
UPDATE public.product_variations SET attributes = attributes - 'Complexidade de montagem'
WHERE attributes ? 'Complexidade de montagem';
DELETE FROM public.attributes WHERE lower(trim(name)) = 'complexidade de montagem';
