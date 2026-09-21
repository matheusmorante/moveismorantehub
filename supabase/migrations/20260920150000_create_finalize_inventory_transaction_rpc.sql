-- Migration para criar a RPC transacional idempotente para finalização de inventário offline-first

CREATE OR REPLACE FUNCTION public.finalize_inventory_transaction(
  p_audit_id uuid,
  p_code text,
  p_observation jsonb,
  p_items jsonb,
  p_responsible_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $function$
DECLARE
  v_now timestamptz := now();
  v_item record;
  v_moves jsonb := '[]'::jsonb;
  v_move_id uuid;
  v_header_id uuid;
BEGIN
  IF p_audit_id IS NULL THEN
    RAISE EXCEPTION 'O identificador do inventário (p_audit_id) é obrigatório';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Os itens do inventário (p_items) devem ser uma lista JSON';
  END IF;

  -- Bloqueio consultivo para evitar race conditions no mesmo audit_id
  PERFORM pg_advisory_xact_lock(hashtext(p_audit_id::text));

  -- Validação de Idempotência
  -- Se já existe um movimento de inventário com este related_entity_id e type='adjustment', retorna sucesso imediato
  IF EXISTS (
    SELECT 1 FROM public.inventory_moves 
    WHERE related_entity_id = p_audit_id::text AND type = 'adjustment'
  ) THEN
    RETURN jsonb_build_object('auditId', p_audit_id, 'status', 'already_processed', 'moves', '[]');
  END IF;

  -- 1. Insere o Marker inicial que representa a conclusão do inventário
  INSERT INTO public.inventory_moves (
    product_id, type, quantity, date, label, observation, related_entity_id, status, created_at
  ) VALUES (
    NULL, -- Header não pertence a um produto específico
    'adjustment', 
    0, 
    v_now, 
    'Inventário #' || p_code, 
    p_observation, 
    p_audit_id::text, 
    'effective', 
    v_now
  ) RETURNING id INTO v_header_id;

  -- 2. Lança os ajustes individuais
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF NULLIF(v_item.value->>'productId', '') IS NOT NULL THEN
      INSERT INTO public.inventory_moves (
        product_id, 
        variation_id, 
        product_description, 
        type, 
        quantity, 
        date, 
        label, 
        observation, 
        related_entity_id, 
        status, 
        created_at
      ) VALUES (
        (v_item.value->>'productId')::uuid, 
        NULLIF(v_item.value->>'variationId', '')::uuid,
        COALESCE(v_item.value->>'name', 'Item do inventário'), 
        'adjustment', 
        0, 
        v_now, 
        'Ajuste lançado pelo inventário #' || p_code, 
        jsonb_build_object(
          'note', 'Saldo definido pelo inventário #' || p_code, 
          'targetStock', (v_item.value->>'physicalCount')::numeric, 
          'source', 'inventory_audit'
        ), 
        p_audit_id::text, 
        'effective', 
        v_now
      ) RETURNING id INTO v_move_id;

      v_moves := v_moves || jsonb_build_array(jsonb_build_object('productId', v_item.value->>'productId', 'inventoryMoveId', v_move_id));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('auditId', p_audit_id, 'status', 'processed', 'moves', v_moves);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.finalize_inventory_transaction(uuid, text, jsonb, jsonb, text) TO anon, authenticated, service_role;
