-- Usa order_data.is_test, marcador explícito já consumido pelo domínio fiscal.
-- A permissão é verificada no banco para impedir que um cliente alterado marque
-- um pedido como teste sem ser administrador. Esta migration não altera dados.
-- Rollback manual: DROP TRIGGER IF EXISTS enforce_order_test_mode_admin ON public.orders;
--                  DROP FUNCTION IF EXISTS public.enforce_order_test_mode_admin();
CREATE OR REPLACE FUNCTION public.enforce_order_test_mode_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_old_is_test boolean := false;
  v_new_is_test boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old_is_test := COALESCE(OLD.order_data->>'is_test' = 'true', false);
  END IF;

  IF NEW.order_data IS NOT NULL
     AND pg_catalog.jsonb_typeof(NEW.order_data) = 'object'
     AND NEW.order_data ? 'is_test' THEN
    IF pg_catalog.jsonb_typeof(NEW.order_data->'is_test') = 'boolean' THEN
      v_new_is_test := NEW.order_data->>'is_test' = 'true';
    ELSIF TG_OP = 'UPDATE'
       AND NEW.order_data->'is_test' IS NOT DISTINCT FROM OLD.order_data->'is_test' THEN
      -- Deixa passar um marcador legado sem mudança, caso esteja serializado como texto.
      v_new_is_test := NEW.order_data->>'is_test' = 'true';
    ELSE
      RAISE EXCEPTION 'order_data.is_test deve ser booleano'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND v_old_is_test
     AND NOT COALESCE(NEW.order_data ? 'is_test', false) THEN
    -- Atualizações antigas que não conhecem o campo não apagam o marcador existente.
    IF NEW.order_data IS NULL THEN
      NEW.order_data := OLD.order_data;
    ELSIF pg_catalog.jsonb_typeof(NEW.order_data) = 'object' THEN
      NEW.order_data := pg_catalog.jsonb_set(
        NEW.order_data,
        '{is_test}',
        OLD.order_data->'is_test',
        true
      );
    ELSE
      RAISE EXCEPTION 'order_data inválido para preservar o marcador de teste'
        USING ERRCODE = '22023';
    END IF;
    v_new_is_test := true;
  END IF;

  IF v_old_is_test IS DISTINCT FROM v_new_is_test
     AND (v_old_is_test OR v_new_is_test)
     AND NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Somente administradores podem marcar ou desmarcar pedidos como teste'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_order_test_mode_admin()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_order_test_mode_admin ON public.orders;
CREATE TRIGGER enforce_order_test_mode_admin
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_test_mode_admin();
