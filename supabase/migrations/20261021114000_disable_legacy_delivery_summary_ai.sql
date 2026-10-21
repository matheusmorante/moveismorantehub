-- Desativa o pipeline legado que reprocessava resumos e gerava áudio ao alterar pedidos.
DROP TRIGGER IF EXISTS enqueue_delivery_summary_audio_trigger ON public.delivery_summaries;
DROP FUNCTION IF EXISTS public.enqueue_delivery_summary_audio();

DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_orders_delete ON public.orders;
DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_orders_insert ON public.orders;
DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_orders_update ON public.orders;
DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_from_orders ON public.orders;
DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_from_settings ON public.settings;
DROP FUNCTION IF EXISTS public.enqueue_delivery_summary_refresh();

DELETE FROM vault.secrets WHERE name = 'delivery_summary_job_secret';
