-- Android não altera o som de um canal já existente. Usa um novo canal com o áudio nativo da APK.
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
            'sound', 'levelup.mp3',
            'title', NEW.title,
            'body', NEW.message,
            'channelId', 'levelup-v2',
            'priority', 'high',
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
            headers := jsonb_build_object('Accept', 'application/json', 'Content-Type', 'application/json'),
            body := messages
        );
    END IF;

    RETURN NEW;
END;
$$;
