-- Direciona cancelamentos ao canal e áudio de alerta dedicados, inclusive com o app fechado.
CREATE OR REPLACE FUNCTION public.send_app_notification_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    is_new_scheduled_order BOOLEAN;
    is_order_cancelled BOOLEAN;
    is_order_updated BOOLEAN;
    messages JSONB;
BEGIN
    is_new_scheduled_order := NEW.type = 'order_created'
        AND lower(coalesce(NEW.order_data->>'status', '')) IN ('scheduled', 'agendado');
    is_order_cancelled := NEW.type = 'order_edited'
        AND lower(coalesce(NEW.order_data->>'status', '')) IN ('cancelled', 'cancelado');
    is_order_updated := NEW.type = 'order_edited';

    SELECT jsonb_agg(
        jsonb_build_object(
            'to', token,
            'sound', CASE
                WHEN is_new_scheduled_order THEN 'levelup.mp3'
                WHEN is_order_cancelled THEN 'order_cancelled.mp3'
                WHEN is_order_updated THEN 'order_updated.mp3'
                ELSE 'default'
            END,
            'title', NEW.title,
            'body', NEW.message,
            'channelId', CASE
                WHEN is_new_scheduled_order THEN 'morante_scheduled_orders_v1'
                WHEN is_order_cancelled THEN 'morante_order_cancelled_v1'
                WHEN is_order_updated THEN 'morante_order_updated_v1'
                ELSE 'morante_general_v1'
            END,
            'priority', 'high',
            '_displayInForeground', true,
            'data', jsonb_build_object(
                'orderId', NEW.order_id,
                'type', NEW.type,
                'status', NEW.order_data->>'status',
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
            headers := jsonb_build_object('Accept', 'application/json', 'Content-Type', 'application/json'),
            body := messages
        );
    END IF;

    RETURN NEW;
END;
$$;
