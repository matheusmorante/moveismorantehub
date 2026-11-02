BEGIN;

-- A nota fica reservada ao primeiro recebimento que a utiliza, em qualquer
-- estado. A lista e o formulário continuam permitindo atualizar o mesmo ID.
CREATE UNIQUE INDEX goods_receipts_fiscal_key_unique
  ON public.goods_receipts (
    (pg_catalog.regexp_replace(fiscal_key, '[^0-9]', '', 'g'))
  )
  WHERE NULLIF(pg_catalog.regexp_replace(fiscal_key, '[^0-9]', '', 'g'), '') IS NOT NULL;

-- Mantém o índice parcial anterior para preservar o histórico da migration;
-- o índice acima passa a ser a garantia geral para os novos recebimentos.

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
  SELECT DISTINCT pg_catalog.regexp_replace(r.fiscal_key, '[^0-9]', '', 'g')
  FROM public.goods_receipts AS r
  WHERE NULLIF(pg_catalog.regexp_replace(r.fiscal_key, '[^0-9]', '', 'g'), '') IS NOT NULL
    AND pg_catalog.regexp_replace(r.fiscal_key, '[^0-9]', '', 'g') = ANY(p_keys)
    AND (p_exclude_receipt_id IS NULL OR r.id <> p_exclude_receipt_id);
$$;

REVOKE ALL ON FUNCTION public.in_use_goods_receipt_keys(text[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.in_use_goods_receipt_keys(text[], uuid) TO authenticated, service_role;

COMMIT;
