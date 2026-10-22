INSERT INTO public.ncm_aliases (ncm_code, term, weight, active)
VALUES
  ('94039100', 'Pé de madeira', 5, true),
  ('94039100', 'Pés de madeira', 5, true),
  ('94039900', 'Pé de plástico', 5, true),
  ('94039900', 'Pés de plástico', 5, true)
ON CONFLICT (ncm_code, term) DO UPDATE
SET active = true,
    updated_at = now();

DO $$
BEGIN
  UPDATE public.ncms
  SET is_active = true
  WHERE code = '94039900'
    AND official_description = '-- Outras'
    AND active IS TRUE
    AND (start_date IS NULL OR start_date <= current_date)
    AND (end_date IS NULL OR end_date >= current_date)
    AND is_active IS DISTINCT FROM true;

  IF NOT FOUND AND NOT EXISTS (
    SELECT 1
    FROM public.ncms
    WHERE code = '94039900'
      AND official_description = '-- Outras'
      AND active IS TRUE
      AND (start_date IS NULL OR start_date <= current_date)
      AND (end_date IS NULL OR end_date >= current_date)
      AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'NCM 94039900 is not current and active; activation was not applied';
  END IF;
END;
$$;
