-- Migra as dimensões antigas para as características do produto sem sobrescrever valores já preenchidos.
UPDATE public.products
SET technical_specs = jsonb_set(
  coalesce(technical_specs, '{}'::jsonb),
  '{technicalValues}',
  coalesce(technical_specs->'technicalValues', '{}'::jsonb) ||
  jsonb_strip_nulls(jsonb_build_object(
    'Altura', CASE WHEN nullif(trim(coalesce(technical_specs->'technicalValues'->>'Altura','')), '') IS NULL AND nullif(trim(coalesce(height,'')), '') IS NOT NULL THEN replace(trim(height), ',', '.') END,
    'Largura', CASE WHEN nullif(trim(coalesce(technical_specs->'technicalValues'->>'Largura','')), '') IS NULL AND nullif(trim(coalesce(width,'')), '') IS NOT NULL THEN replace(trim(width), ',', '.') END,
    'Profundidade', CASE WHEN nullif(trim(coalesce(technical_specs->'technicalValues'->>'Profundidade','')), '') IS NULL AND nullif(trim(coalesce(depth,'')), '') IS NOT NULL THEN replace(trim(depth), ',', '.') END
  )),
  true
)
WHERE nullif(trim(coalesce(height,'')), '') IS NOT NULL
   OR nullif(trim(coalesce(width,'')), '') IS NOT NULL
   OR nullif(trim(coalesce(depth,'')), '') IS NOT NULL;
