-- Especificações Técnicas obrigatórias são exigidas em todos os produtos,
-- independentemente das categorias vinculadas.
ALTER TABLE public.attributes
  ADD COLUMN IF NOT EXISTS is_globally_required boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS attributes_globally_required_active_idx
  ON public.attributes (is_globally_required)
  WHERE active IS TRUE AND is_globally_required IS TRUE;

-- O nome comercial da especificação passa a representar a estrutura do item.
UPDATE public.attributes
SET name = 'Estrutura'
WHERE lower(name) = 'material';

-- Preserva dados legados já gravados com a antiga chave JSON.
UPDATE public.products
SET technical_specs = jsonb_set(
  technical_specs,
  '{technicalValues}',
  ((technical_specs->'technicalValues') - 'Material')
    || jsonb_build_object('Estrutura', technical_specs->'technicalValues'->'Material')
)
WHERE technical_specs->'technicalValues' ? 'Material';

UPDATE public.product_variations
SET attributes = (attributes - 'Material') || jsonb_build_object('Estrutura', attributes->'Material')
WHERE attributes ? 'Material';
