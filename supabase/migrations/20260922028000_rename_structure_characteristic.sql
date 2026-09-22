UPDATE public.attributes SET name = 'Material da estrutura' WHERE lower(trim(name)) IN ('estrutura', 'material da estrutura');
UPDATE public.attributes SET data_type = 'radio' WHERE lower(trim(name)) = 'material da estrutura';
UPDATE public.products
SET technical_specs = jsonb_set(coalesce(technical_specs, '{}'::jsonb), '{technicalValues}',
  jsonb_build_object('Material da estrutura', coalesce(technical_specs->'technicalValues'->'Material da estrutura', technical_specs->'technicalValues'->'Estrutura'))
  || (coalesce(technical_specs->'technicalValues', '{}'::jsonb) - 'Estrutura' - 'Material da estrutura'), true)
WHERE technical_specs->'technicalValues' ? 'Estrutura';
