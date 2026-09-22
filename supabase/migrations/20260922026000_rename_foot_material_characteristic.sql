UPDATE public.attributes
SET name = 'Material dos pés'
WHERE lower(trim(name)) IN ('material de pés', 'material dos pés');

UPDATE public.attributes
SET data_type = 'radio'
WHERE lower(trim(name)) = 'material dos pés';

UPDATE public.products
SET technical_specs = jsonb_set(
  coalesce(technical_specs, '{}'::jsonb),
  '{technicalValues}',
  jsonb_build_object(
    'Material dos pés', coalesce(technical_specs->'technicalValues'->'Material dos pés', technical_specs->'technicalValues'->'Material de pés')
  ) || (coalesce(technical_specs->'technicalValues', '{}'::jsonb) - 'Material de pés' - 'Material dos pés'),
  true
)
WHERE technical_specs->'technicalValues' ? 'Material de pés';
