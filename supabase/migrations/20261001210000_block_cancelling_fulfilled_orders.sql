CREATE OR REPLACE FUNCTION public.prevent_cancelling_fulfilled_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF lower(btrim(COALESCE(NEW.status, ''))) IN ('cancelled', 'cancelado')
     AND (
       lower(btrim(COALESCE(OLD.status, ''))) IN ('fulfilled', 'atendido', 'completed')
       OR lower(btrim(COALESCE(OLD.delivery_status, OLD.order_data #>> '{shipping,deliveryStatus}', ''))) IN (
         'in_transit', 'in-transit', 'delivered', 'completed', 'finished', 'collected',
         'em_transito', 'entregue', 'concluido', 'coletado'
       )
       OR NULLIF(btrim(COALESCE(OLD.order_data #>> '{shipping,deliveryStartedAt}', '')), '') IS NOT NULL
       OR NULLIF(btrim(COALESCE(OLD.order_data #>> '{shipping,deliveryArrivedAt}', '')), '') IS NOT NULL
       OR NULLIF(btrim(COALESCE(OLD.order_data #>> '{shipping,deliveryFinishedAt}', '')), '') IS NOT NULL
       OR NULLIF(btrim(COALESCE(OLD.order_data #>> '{shipping,unattendedAt}', '')), '') IS NOT NULL
       OR NULLIF(btrim(COALESCE(OLD.order_data #>> '{shipping,pickupConfirmedAt}', '')), '') IS NOT NULL
       OR NULLIF(btrim(COALESCE(OLD.order_data->>'deliveryFinishedAt', '')), '') IS NOT NULL
       OR NULLIF(btrim(COALESCE(OLD.order_data->>'pickupConfirmedAt', '')), '') IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'A mercadoria já circulou; registre uma devolução.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_cancelling_fulfilled_order ON public.orders;
CREATE TRIGGER prevent_cancelling_fulfilled_order
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_cancelling_fulfilled_order();

COMMENT ON FUNCTION public.prevent_cancelling_fulfilled_order() IS
  'Impede cancelamento direto de pedido fulfilled, que representa mercadoria entregue ou retirada; usar devolução.';
