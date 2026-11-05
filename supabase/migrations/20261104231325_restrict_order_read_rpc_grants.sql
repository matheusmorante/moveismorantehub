-- Supabase default privileges may grant anon explicitly; keep these ERP/app reads authenticated.
REVOKE ALL ON FUNCTION
  public.order_schedule_date_value(text),
  public.order_schedule_option(jsonb),
  public.order_operational_schedule_date(jsonb,boolean,boolean,timestamptz),
  public.order_assembly_kind(text,jsonb),
  public.order_schedule_matches(jsonb,text,jsonb,jsonb),
  public.list_order_schedule_ids(text,jsonb,integer,integer),
  public.search_order_operation_ids(jsonb,integer),
  public.list_order_assembly_print_ids()
FROM anon;
