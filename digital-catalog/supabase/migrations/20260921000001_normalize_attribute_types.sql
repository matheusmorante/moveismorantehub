-- Normaliza os tipos legados sem alterar opções, valores de produtos ou unidades.
UPDATE public.attributes
SET data_type = CASE
  WHEN data_type IN ('text', 'text_long') THEN 'text_short'
  WHEN data_type = 'number' THEN 'integer'
  WHEN data_type = 'list' OR data_type IS NULL THEN 'radio'
  ELSE data_type
END
WHERE data_type IS NULL
   OR data_type IN ('text', 'text_long', 'number', 'list');
