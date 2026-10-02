-- Search terms are commercial synonyms only; the official NCM description remains sourced from the catalog.
-- NCM 9403.50.00 describes wooden furniture of a kind used in bedrooms.
INSERT INTO public.ncm_aliases (ncm_code, term, weight, active)
SELECT '94035000', aliases.term, 5, true
FROM (VALUES
  ('guarda-roupa'),
  ('guarda roupa'),
  ('guarda-roupas'),
  ('guarda roupas'),
  ('roupeiro'),
  ('roupeiros'),
  ('armário de quarto'),
  ('armario de quarto'),
  ('armário para dormitório'),
  ('armario para dormitorio')
) AS aliases(term)
WHERE EXISTS (
  SELECT 1
  FROM public.ncms
  WHERE code = '94035000'
    AND active = true
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
)
ON CONFLICT (ncm_code, term)
DO UPDATE SET active = true, weight = EXCLUDED.weight, updated_at = now();
