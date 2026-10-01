-- Termos comerciais para localizar pufes estofados com armação de madeira.
-- A descrição oficial permanece mantida pela sincronização do catálogo NCM.
-- Referência: Solução de Consulta RFB publicada em 02/06/2014 para pufe
-- estofado com armação de madeira, NCM 9401.61.00.
INSERT INTO public.ncm_aliases (ncm_code, term, weight, active)
SELECT '94016100', aliases.term, 5, true
FROM (VALUES
  ('puff de madeira'),
  ('pufe de madeira'),
  ('puff com estrutura de madeira'),
  ('pufe com estrutura de madeira'),
  ('puff com armação de madeira'),
  ('pufe com armação de madeira')
) AS aliases(term)
WHERE EXISTS (
  SELECT 1
  FROM public.ncms
  WHERE code = '94016100'
    AND active = true
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
)
ON CONFLICT (ncm_code, term)
DO UPDATE SET active = true, weight = EXCLUDED.weight, updated_at = now();
