-- Printing needs only orders with items enabled for the assembly schedule.
CREATE OR REPLACE FUNCTION public.list_order_assembly_print_ids()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  WITH configured AS (
    SELECT data FROM public.settings WHERE id='app'
  ), matched AS (
    SELECT o.id,o.created_at FROM public.orders o CROSS JOIN configured s
    WHERE COALESCE(o.deleted,false)=false AND o.order_data->>'deleted' IS DISTINCT FROM 'true'
      AND COALESCE(NULLIF(o.status,''),o.order_data->>'status','') NOT LIKE 'cancel%'
      AND NOT public.order_list_is_test(pg_catalog.to_jsonb(o))
      AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(
        CASE WHEN pg_catalog.jsonb_typeof(o.order_data->'items')='array' THEN o.order_data->'items' ELSE '[]'::jsonb END) i
        JOIN pg_catalog.jsonb_array_elements(COALESCE(s.data->CASE
          WHEN COALESCE(NULLIF(o.delivery_method,''),o.order_data#>>'{shipping,deliveryMethod}','delivery')='pickup'
          THEN 'pickupHandlingOptions' ELSE 'deliveryHandlingOptions' END,'[]'::jsonb)) opt
        ON opt->>'label'=pg_catalog.btrim(i->>'handlingType')
        WHERE opt->>'includeInAssemblySchedule'='true')
  ) SELECT COALESCE(pg_catalog.jsonb_agg(id ORDER BY created_at DESC,id),'[]'::jsonb) FROM matched;
$fn$;
REVOKE ALL ON FUNCTION public.list_order_assembly_print_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_order_assembly_print_ids() TO authenticated,service_role;
