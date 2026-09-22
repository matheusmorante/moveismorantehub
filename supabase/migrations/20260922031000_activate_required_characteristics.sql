UPDATE public.products
SET technical_specs = jsonb_set(
  coalesce(technical_specs, '{}'::jsonb),
  '{technicalValues}',
  (coalesce(technical_specs->'technicalValues', '{}'::jsonb)
    - 'Cor' - 'Material da estrutura')
    || jsonb_build_object(
      'Cor', CASE WHEN lower(trim(coalesce(technical_specs->'technicalValues'->>'Cor',''))) IN ('não se aplica', 'na', 'n/a') THEN '' ELSE technical_specs->'technicalValues'->'Cor' END,
      'Material da estrutura', CASE WHEN lower(trim(coalesce(technical_specs->'technicalValues'->>'Material da estrutura',''))) IN ('não se aplica', 'na', 'n/a') THEN '' ELSE technical_specs->'technicalValues'->'Material da estrutura' END
    ), true)
WHERE technical_specs->'technicalValues' ?| array['Cor', 'Material da estrutura'];

UPDATE public.product_variations
SET attributes = (
  SELECT coalesce(jsonb_agg(
    CASE WHEN lower(trim(coalesce(item->>'value',''))) IN ('não se aplica', 'na', 'n/a')
      AND lower(trim(coalesce(item->>'name',''))) IN ('cor', 'material da estrutura')
      THEN jsonb_set(item, '{value}', '""'::jsonb, true) ELSE item END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(coalesce(attributes, '[]'::jsonb)) item
)
WHERE attributes IS NOT NULL;
