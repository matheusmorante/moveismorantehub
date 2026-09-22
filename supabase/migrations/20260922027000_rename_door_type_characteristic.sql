UPDATE public.attributes
SET name = 'Tipo de portas'
WHERE lower(trim(name)) IN ('tipo de porta', 'tipo de portas');

UPDATE public.attributes
SET data_type = 'radio'
WHERE lower(trim(name)) = 'tipo de portas';

UPDATE public.products
SET technical_specs = jsonb_set(
  coalesce(technical_specs, '{}'::jsonb),
  '{technicalValues}',
  jsonb_build_object(
    'Tipo de portas', coalesce(technical_specs->'technicalValues'->'Tipo de portas', technical_specs->'technicalValues'->'Tipo de Porta')
  ) || (coalesce(technical_specs->'technicalValues', '{}'::jsonb) - 'Tipo de Porta' - 'Tipo de portas'),
  true
)
WHERE technical_specs->'technicalValues' ? 'Tipo de Porta';
