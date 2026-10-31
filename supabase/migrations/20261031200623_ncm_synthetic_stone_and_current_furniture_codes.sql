-- Keep only codes verified against the current official NCM catalog.
DO $$
DECLARE
  invalid_codes text;
BEGIN
  SELECT string_agg(expected.code, ', ' ORDER BY expected.code)
  INTO invalid_codes
  FROM (
    VALUES
      ('68109900', '-- Outras'),
      ('94018000', '- Outros assentos'),
      ('94031000', '- Móveis de metal, do tipo utilizado em escritórios'),
      ('94032010', 'Do tipo utilizado em cozinhas'),
      ('94032090', 'Outros'),
      ('94033000', '- Móveis de madeira, do tipo utilizado em escritórios'),
      ('94037000', '- Móveis de plástico')
  ) AS expected(code, official_description)
  LEFT JOIN public.ncms AS actual
    ON actual.code = expected.code
   AND actual.official_description = expected.official_description
   AND actual.active IS TRUE
   AND (actual.start_date IS NULL OR actual.start_date <= current_date)
   AND (actual.end_date IS NULL OR actual.end_date >= current_date)
  WHERE actual.code IS NULL;

  IF invalid_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Expected current official NCM rows are missing or changed: %', invalid_codes;
  END IF;
END;
$$;

UPDATE public.ncms
SET is_active = true
WHERE code IN ('68109900', '94018000', '94031000', '94032010', '94032090', '94033000', '94037000')
  AND active IS TRUE
  AND (start_date IS NULL OR start_date <= current_date)
  AND (end_date IS NULL OR end_date >= current_date)
  AND is_active IS DISTINCT FROM true;

INSERT INTO public.ncm_aliases (ncm_code, term, weight, active)
VALUES
  ('68109900', 'Pia de mármore sintético', 10, true),
  ('68109900', 'Pia de marmorite', 8, true),
  ('68109900', 'Tanque de mármore sintético', 7, true),
  ('68109900', 'Cuba de mármore sintético', 6, true),
  ('68109900', 'Lavatório de mármore sintético', 6, true),
  ('68109900', 'Balcão de mármore sintético', 5, true),
  ('68109900', 'Pia de pedra artificial', 5, true),
  ('94018000', 'Cadeira de plástico', 8, true),
  ('94018000', 'Banqueta de plástico', 7, true),
  ('94018000', 'Assento de plástico', 6, true),
  ('94031000', 'Arquivo de aço para escritório', 8, true),
  ('94031000', 'Estante de aço para escritório', 7, true),
  ('94031000', 'Móvel de metal para escritório', 6, true),
  ('94032010', 'Armário de cozinha de aço', 8, true),
  ('94032010', 'Balcão de cozinha de aço', 7, true),
  ('94032010', 'Móvel de metal para cozinha', 6, true),
  ('94032090', 'Móvel de metal fora de cozinhas', 7, true),
  ('94032090', 'Estante de metal', 6, true),
  ('94032090', 'Armário de metal', 5, true),
  ('94033000', 'Escrivaninha de madeira', 8, true),
  ('94033000', 'Mesa de escritório de madeira', 7, true),
  ('94033000', 'Estante de madeira para escritório', 6, true),
  ('94037000', 'Armário de plástico', 8, true),
  ('94037000', 'Mesa de plástico', 7, true),
  ('94037000', 'Fruteira de plástico', 6, true)
ON CONFLICT (ncm_code, term) DO UPDATE
SET weight = EXCLUDED.weight,
    active = true,
    updated_at = now();
