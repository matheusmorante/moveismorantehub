-- Remove credenciais de integrações do JSON público de configurações e elimina
-- o último estado persistido da integração Bling, sem tocar nos demais dados do pedido.
DO $migration$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.save_order_transaction(text,jsonb,jsonb,jsonb,boolean)'::regprocedure
  ) INTO v_definition;

  IF position('v_is_registered_in_bling' IN v_definition) > 0 THEN
    IF position($old$v_order_data := COALESCE(p_order_payload->'order_data', '{}'::jsonb);$old$ IN v_definition) = 0 THEN
      RAISE EXCEPTION 'A definição remota de save_order_transaction diverge do formato esperado; nenhuma coluna será removida.';
    END IF;

    v_definition := replace(v_definition, E'    v_is_registered_in_bling boolean;\n', '');
    v_definition := replace(
      v_definition,
      E'    v_is_registered_in_bling := COALESCE((p_order_payload->>''is_registered_in_bling'')::boolean, false);\n',
      ''
    );
    v_definition := replace(
      v_definition,
      E'        stock_processed, is_stock_checked, is_registered_in_bling,\n',
      E'        stock_processed, is_stock_checked,\n'
    );
    v_definition := replace(
      v_definition,
      E'        v_stock_processed, v_is_stock_checked, v_is_registered_in_bling,\n',
      E'        v_stock_processed, v_is_stock_checked,\n'
    );
    v_definition := replace(
      v_definition,
      E'        is_registered_in_bling = EXCLUDED.is_registered_in_bling,\n',
      ''
    );
    v_definition := replace(
      v_definition,
      $old$v_order_data := COALESCE(p_order_payload->'order_data', '{}'::jsonb);$old$,
      $new$v_order_data := COALESCE(p_order_payload->'order_data', '{}'::jsonb) - 'isRegisteredInBling' - 'is_registered_in_bling';$new$
    );

    IF position('v_is_registered_in_bling' IN v_definition) > 0
      OR position('is_registered_in_bling = EXCLUDED.is_registered_in_bling' IN v_definition) > 0
      OR position('is_stock_checked, is_registered_in_bling' IN v_definition) > 0
      OR position('v_is_stock_checked, v_is_registered_in_bling' IN v_definition) > 0
      OR position($old$v_order_data := COALESCE(p_order_payload->'order_data', '{}'::jsonb);$old$ IN v_definition) > 0 THEN
      RAISE EXCEPTION 'A definição remota de save_order_transaction diverge do formato esperado; nenhuma coluna será removida.';
    END IF;

    EXECUTE v_definition;
  END IF;
END;
$migration$;

UPDATE public.orders
SET order_data = order_data - 'isRegisteredInBling' - 'is_registered_in_bling'
WHERE order_data ? 'isRegisteredInBling'
   OR order_data ? 'is_registered_in_bling';

-- A projeção mobile inclui a coluna removida. Recrie-a mantendo segurança e grants.
DO $view_guard$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_viewdef('public.order_list_items'::regclass, true)
  INTO v_definition;

  IF position('is_registered_in_bling' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'A definição remota de order_list_items diverge do formato esperado; nenhuma coluna será removida.';
  END IF;
END;
$view_guard$;

DROP VIEW public.order_list_items;

CREATE VIEW public.order_list_items WITH (security_invoker = true) AS
SELECT
  o.id,
  o.order_number,
  o.created_at,
  o.updated_at,
  COALESCE(o.status, o.order_data ->> 'status', 'pending') AS status,
  COALESCE(o.order_type, o.order_data ->> 'orderType', o.order_data ->> 'order_type', 'sale') AS order_type,
  COALESCE(o.order_index::text, o.order_data ->> 'orderIndex', o.order_data ->> 'order_index', o.order_number, '') AS order_index,
  COALESCE(NULLIF(o.customer_name, ''), o.order_data #>> '{customerData,fullName}', '') AS customer_name,
  COALESCE(o.total_amount, (o.order_data #>> '{paymentsSummary,totalOrderValue}')::numeric, 0::numeric) AS total_value,
  COALESCE(o.delivery_method, o.order_data #>> '{shipping,deliveryMethod}', o.order_data ->> 'deliveryMethod', '') AS delivery_method,
  COALESCE(o.scheduled_date::text, o.order_data #>> '{shipping,scheduling,date}', o.order_data #>> '{schedule,date}', '') AS scheduled_date,
  COALESCE(o.scheduled_start_time, o.order_data #>> '{shipping,scheduling,startTime}', o.order_data #>> '{schedule,startTime}', '') AS schedule_start_time,
  COALESCE(o.scheduled_end_time, o.order_data #>> '{shipping,scheduling,endTime}', o.order_data #>> '{schedule,endTime}', '') AS schedule_end_time,
  COALESCE((o.order_data #>> '{shipping,scheduling,pendingScheduling}')::boolean, false) AS pending_scheduling,
  COALESCE(o.order_data ->> 'handlingType', o.order_data ->> 'handling', '') AS handling_type,
  COALESCE(o.delivery_status, o.order_data ->> 'deliveryStatus', '') AS delivery_status,
  COALESCE(o.delivery_arrived_at::text, o.order_data ->> 'deliveryArrivedAt', '') AS delivery_arrived_at,
  COALESCE(o.delivery_started_at::text, o.order_data ->> 'deliveryStartedAt', '') AS delivery_started_at,
  COALESCE(o.order_data ->> 'unattendedReason', '') AS unattended_reason,
  COALESCE(o.marketing_origin, o.order_data ->> 'marketingOrigin', o.order_data #>> '{customerData,marketingOrigin}', '') AS marketing_origin,
  COALESCE(o.is_stock_checked, (o.order_data ->> 'isStockChecked')::boolean, false) AS is_stock_checked,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'handlingType', item.value ->> 'handlingType',
      'handling', item.value ->> 'handling'
    ))
    FROM jsonb_array_elements(COALESCE(o.items, o.order_data -> 'items', '[]'::jsonb)) AS item(value)
  ), '[]'::jsonb) AS item_handling
FROM public.orders AS o;

ALTER VIEW public.order_list_items OWNER TO postgres;
GRANT ALL ON TABLE public.order_list_items TO anon;
GRANT ALL ON TABLE public.order_list_items TO authenticated;
GRANT ALL ON TABLE public.order_list_items TO service_role;
GRANT ALL ON TABLE public.order_list_items TO postgres WITH GRANT OPTION;

ALTER TABLE public.orders DROP COLUMN IF EXISTS is_registered_in_bling;

UPDATE public.settings AS s
SET data = (
  (s.data
    - 'certificateBase64'
    - 'certificatePassword'
    - 'certificateFileName'
    - 'cscToken'
    - 'openRouteServiceApiKey'
    - 'googleMapsApiKey'
    - 'geminiApiKey'
    - 'blingConfig')
  || CASE
    WHEN jsonb_typeof(s.data->'whatsappConfig') = 'object'
      THEN jsonb_build_object('whatsappConfig', (s.data->'whatsappConfig') - 'accessToken')
    ELSE '{}'::jsonb
  END
  || CASE
    WHEN jsonb_typeof(s.data->'rolePermissions') = 'object'
      THEN jsonb_build_object('rolePermissions', (s.data->'rolePermissions') - 'viewBlingStock')
    ELSE '{}'::jsonb
  END
  || CASE
    WHEN jsonb_typeof(s.data->'importMappings') = 'array'
      THEN jsonb_build_object(
        'importMappings',
        COALESCE((
          SELECT jsonb_agg(mapping.value ORDER BY mapping.ordinality)
          FROM jsonb_array_elements(s.data->'importMappings') WITH ORDINALITY AS mapping(value, ordinality)
          WHERE lower(COALESCE(mapping.value->>'id', '')) NOT LIKE '%bling%'
            AND lower(COALESCE(mapping.value->>'name', '')) NOT LIKE '%bling%'
        ), '[]'::jsonb)
      )
    ELSE '{}'::jsonb
  END
)
WHERE s.id = 'app';

NOTIFY pgrst, 'reload schema';
