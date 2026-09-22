-- Renomeia características sem perder os valores já preenchidos nos produtos.
UPDATE public.attributes
SET name = 'Material de pés'
WHERE lower(trim(name)) = 'tipo de pés';

UPDATE public.attributes
SET name = 'Material dos puxadores'
WHERE lower(trim(name)) = 'tipo de puxador';

UPDATE public.attributes
SET data_type = 'radio'
WHERE lower(trim(name)) IN ('material de pés', 'material dos puxadores');

UPDATE public.products
SET technical_specs = jsonb_set(
  coalesce(technical_specs, '{}'::jsonb),
  '{technicalValues}',
  jsonb_build_object(
    'Material de pés', coalesce(technical_specs->'technicalValues'->'Material de pés', technical_specs->'technicalValues'->'Tipo de Pés'),
    'Material dos puxadores', coalesce(technical_specs->'technicalValues'->'Material dos puxadores', technical_specs->'technicalValues'->'Tipo de Puxador')
  ) || (coalesce(technical_specs->'technicalValues', '{}'::jsonb) - 'Tipo de Pés' - 'Tipo de Puxador' - 'Material de pés' - 'Material dos puxadores'),
  true
)
WHERE technical_specs->'technicalValues' ? 'Tipo de Pés'
   OR technical_specs->'technicalValues' ? 'Tipo de Puxador';
