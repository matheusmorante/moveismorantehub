BEGIN;

-- A chave normalizada precisa preservar letras do CNPJ alfanumérico.
CREATE UNIQUE INDEX goods_receipts_fiscal_key_alphanumeric_unique
  ON public.goods_receipts (
    (pg_catalog.upper(pg_catalog.regexp_replace(fiscal_key, '[./[:space:]-]', '', 'g')))
  )
  WHERE NULLIF(pg_catalog.upper(pg_catalog.regexp_replace(fiscal_key, '[./[:space:]-]', '', 'g')), '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.in_use_goods_receipt_keys(
  p_keys text[],
  p_exclude_receipt_id uuid DEFAULT NULL
)
RETURNS TABLE (fiscal_key text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT DISTINCT pg_catalog.upper(pg_catalog.regexp_replace(r.fiscal_key, '[./[:space:]-]', '', 'g'))
  FROM public.goods_receipts AS r
  WHERE NULLIF(pg_catalog.upper(pg_catalog.regexp_replace(r.fiscal_key, '[./[:space:]-]', '', 'g')), '') IS NOT NULL
    AND pg_catalog.upper(pg_catalog.regexp_replace(r.fiscal_key, '[./[:space:]-]', '', 'g')) = ANY(p_keys)
    AND (p_exclude_receipt_id IS NULL OR r.id <> p_exclude_receipt_id);
$$;

REVOKE ALL ON FUNCTION public.in_use_goods_receipt_keys(text[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.in_use_goods_receipt_keys(text[], uuid) TO authenticated, service_role;

COMMIT;
