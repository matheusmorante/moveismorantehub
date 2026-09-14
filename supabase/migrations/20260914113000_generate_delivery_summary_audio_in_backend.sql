-- Atualiza o resumo e seu áudio no servidor quando a operação mudar. A fila é
-- assíncrona: salvar um pedido nunca espera o Gemini terminar.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.enqueue_delivery_summary_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  job_secret text;
BEGIN
  SELECT decrypted_secret INTO job_secret
  FROM vault.decrypted_secrets
  WHERE name = 'delivery_summary_job_secret'
  LIMIT 1;

  -- Sem o segredo a chamada não é enviada. Isso evita expor um endpoint que
  -- pode consumir IA; o deploy configura o mesmo valor nas Edge Functions.
  IF coalesce(job_secret, '') = '' THEN
    RAISE WARNING 'delivery_summary_job_secret não configurado; resumo automático aguardando configuração.';
    RETURN coalesce(NEW, OLD);
  END IF;

  PERFORM net.http_post(
    url := 'https://hkoxhourxwlddgsfdgws.supabase.co/functions/v1/refresh-delivery-summaries',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-delivery-summary-job-secret', job_secret),
    body := jsonb_build_object('source', TG_TABLE_NAME)
  );
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_from_orders ON public.orders;
CREATE TRIGGER enqueue_delivery_summary_refresh_from_orders
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_delivery_summary_refresh();

DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_from_settings ON public.settings;
CREATE TRIGGER enqueue_delivery_summary_refresh_from_settings
AFTER INSERT OR UPDATE OR DELETE ON public.settings
FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_delivery_summary_refresh();

-- O texto pode vir de uma versão antiga do aplicativo. Mesmo nesse caso o
-- banco aciona o áudio, para que o player nunca seja o responsável por gerar.
CREATE OR REPLACE FUNCTION public.enqueue_delivery_summary_audio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  job_secret text;
BEGIN
  IF NEW.text_status <> 'READY' OR coalesce(NEW.text, '') = '' OR NEW.audio_status = 'READY' THEN
    RETURN NEW;
  END IF;
  SELECT decrypted_secret INTO job_secret FROM vault.decrypted_secrets WHERE name = 'delivery_summary_job_secret' LIMIT 1;
  IF coalesce(job_secret, '') = '' THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://hkoxhourxwlddgsfdgws.supabase.co/functions/v1/generate-delivery-summary-audio',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-delivery-summary-job-secret', job_secret),
    body := jsonb_build_object('scope', NEW.scope, 'text', NEW.text)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enqueue_delivery_summary_audio_trigger ON public.delivery_summaries;
CREATE TRIGGER enqueue_delivery_summary_audio_trigger
AFTER INSERT OR UPDATE OF text, text_status ON public.delivery_summaries
FOR EACH ROW EXECUTE FUNCTION public.enqueue_delivery_summary_audio();
