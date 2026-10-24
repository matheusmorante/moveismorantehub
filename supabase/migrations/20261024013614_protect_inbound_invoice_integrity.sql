CREATE OR REPLACE FUNCTION public.guard_inbound_invoice_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_company_cnpj text;
  v_recipient_cnpj text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'INBOUND_INVOICE_DELETE_BLOCKED: Notas fiscais de entrada não podem ser excluídas.';
  END IF;

  SELECT NULLIF(
    pg_catalog.regexp_replace(
      pg_catalog.upper(COALESCE(s.data ->> 'companyCnpj', '')),
      '[^A-Z0-9]',
      '',
      'g'
    ),
    ''
  )
  INTO v_company_cnpj
  FROM public.settings AS s
  WHERE s.id = 'app';

  IF v_company_cnpj IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'INBOUND_INVOICE_COMPANY_CNPJ_UNCONFIGURED: Configure o CNPJ da empresa antes de importar notas fiscais de entrada.';
  END IF;

  v_recipient_cnpj := NULLIF(
    pg_catalog.regexp_replace(
      pg_catalog.upper(COALESCE(NEW.destinatario_cnpj, '')),
      '[^A-Z0-9]',
      '',
      'g'
    ),
    ''
  );

  IF v_recipient_cnpj IS DISTINCT FROM v_company_cnpj THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'INBOUND_INVOICE_RECIPIENT_MISMATCH: Esta NF-e não pode ser importada porque o CNPJ do destinatário é diferente do CNPJ da empresa configurado no sistema.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_inbound_invoice_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_inbound_invoice_integrity() TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_inbound_invoice_integrity ON public.inbound_invoices;
CREATE TRIGGER guard_inbound_invoice_integrity
BEFORE INSERT OR UPDATE OR DELETE ON public.inbound_invoices
FOR EACH ROW
EXECUTE FUNCTION public.guard_inbound_invoice_integrity();

REVOKE DELETE, TRUNCATE ON TABLE public.inbound_invoices FROM PUBLIC, anon, authenticated, service_role;
