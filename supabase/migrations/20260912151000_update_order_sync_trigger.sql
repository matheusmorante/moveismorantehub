-- =============================================================================
-- Migration: 20260912151000_update_order_sync_trigger.sql
-- Objetivo: Atualizar o trigger sync_order_columns para estabelecer as colunas
--           físicas normalizadas como FONTE DE VERDADE (Master), mantendo
--           o JSONB order_data como cópia sincronizada de compatibilidade.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_order_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Se o cliente enviou order_data (formato legado ou com snapshots):
  IF NEW.order_data IS NOT NULL AND jsonb_typeof(NEW.order_data) = 'object' THEN
    -- 1. Colunas físicas: priorizam o valor normalizado passado no UPDATE/INSERT; se nulo, extrai do JSONB
    NEW.order_number := COALESCE(NEW.order_number, NEW.id::text);
    NEW.order_index := COALESCE(
        NEW.order_index, 
        CASE WHEN (NEW.order_data->>'orderIndex') ~ '^[0-9]+$' THEN (NEW.order_data->>'orderIndex')::integer ELSE NULL END
    );
    NEW.status := COALESCE(NEW.status, NEW.order_data->>'status', 'draft');
    NEW.order_type := COALESCE(NEW.order_type, NEW.order_data->>'orderType', NEW.order_data->>'order_type', 'sale');
    NEW.customer_id := COALESCE(NEW.customer_id, NEW.order_data->'customerData'->>'id');
    NEW.customer_name := COALESCE(NULLIF(NEW.customer_name, ''), NEW.order_data->'customerData'->>'fullName');
    NEW.seller_name := COALESCE(NEW.seller_name, NEW.order_data->>'seller');
    
    -- Busca automática do seller_id a partir da tabela profiles caso ainda não informado
    IF NEW.seller_id IS NULL AND NEW.seller_name IS NOT NULL THEN
      SELECT id INTO NEW.seller_id 
      FROM public.profiles 
      WHERE LOWER(TRIM(first_name || ' ' || COALESCE(last_name, ''))) = LOWER(TRIM(NEW.seller_name)) 
      LIMIT 1;
    END IF;

    NEW.items := COALESCE(NEW.items, NEW.order_data->'items', '[]'::jsonb);
    NEW.total_amount := COALESCE(NEW.total_amount, (NEW.order_data->'paymentsSummary'->>'totalOrderValue')::numeric, 0);
    NEW.payment_method := COALESCE(NEW.payment_method, NEW.order_data->'payments'->0->>'method');
    NEW.channel := COALESCE(NEW.channel, NEW.order_data->>'channel', 'Catálogo Digital');
    NEW.scheduled_date := COALESCE(
        NEW.scheduled_date, 
        CASE WHEN (NEW.order_data#>>'{shipping,scheduling,date}') ~ '^\d{4}-\d{2}-\d{2}$' 
             THEN (NEW.order_data#>>'{shipping,scheduling,date}')::date ELSE NULL END
    );
    NEW.delivery_method := COALESCE(NEW.delivery_method, NEW.order_data#>>'{shipping,deliveryMethod}', NEW.order_data->>'deliveryMethod');
    NEW.delivery_status := COALESCE(NEW.delivery_status, NEW.order_data->>'deliveryStatus');
    NEW.deleted := COALESCE(NEW.deleted, (NEW.order_data->>'deleted')::boolean, false);
    NEW.stock_processed := COALESCE(NEW.stock_processed, (NEW.order_data->>'stockProcessed')::boolean, false);

    -- 2. Sincronização server-side do JSONB (Cópia de compatibilidade/read-only)
    -- Garante que clientes antigos que leiam order_data.status ou order_data.orderType recebam o valor da coluna master
    NEW.order_data := jsonb_set(NEW.order_data, '{status}', to_jsonb(NEW.status), true);
    NEW.order_data := jsonb_set(NEW.order_data, '{orderType}', to_jsonb(NEW.order_type), true);
    IF NEW.order_index IS NOT NULL THEN
      NEW.order_data := jsonb_set(NEW.order_data, '{orderIndex}', to_jsonb(NEW.order_index), true);
      NEW.order_data := jsonb_set(NEW.order_data, '{orderNumber}', to_jsonb(NEW.order_index), true);
    END IF;
  ELSE
    -- Se o cliente enviou apenas colunas estruturadas (sem order_data):
    NEW.order_number := COALESCE(NEW.order_number, NEW.id::text);
    NEW.status := COALESCE(NEW.status, 'draft');
    NEW.order_type := COALESCE(NEW.order_type, 'sale');
    NEW.total_amount := COALESCE(NEW.total_amount, 0);
    NEW.deleted := COALESCE(NEW.deleted, false);
    NEW.stock_processed := COALESCE(NEW.stock_processed, false);
  END IF;

  RETURN NEW;
END;
$function$;
