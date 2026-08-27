-- Push nativo para o app fechado: o banco envia à Expo assim que uma
-- notificação de pedido é criada. Não depende do navegador do ERP permanecer aberto.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.send_app_notification_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    messages JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'to', token,
            'title', NEW.title,
            'body', NEW.message,
            'sound', 'default',
            'channelId', 'morante_alerts_v2',
            'priority', 'high',
            'badge', 1,
            '_contentAvailable', true,
            'data', jsonb_build_object(
                'orderId', NEW.order_id,
                'type', NEW.type,
                'scheduleText', NEW.schedule_text
            )
        )
    )
    INTO messages
    FROM public.push_tokens
    WHERE token LIKE 'ExponentPushToken[%'
       OR token LIKE 'ExpoPushToken[%';

    IF messages IS NOT NULL THEN
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := jsonb_build_object(
                'Accept', 'application/json',
                'Content-Type', 'application/json'
            ),
            body := messages
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS send_app_notification_push_trigger ON public.app_notifications;

CREATE TRIGGER send_app_notification_push_trigger
AFTER INSERT ON public.app_notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_app_notification_push();
