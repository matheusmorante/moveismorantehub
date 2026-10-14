-- Migration: Product Trash Lifecycle (Mover para lixeira, elegibilidade, restauração e expiração de 30 dias)
-- Segue rigorosamente a política de atomicidade, preservação de dados e segurança de execução.

CREATE INDEX IF NOT EXISTS idx_inventory_moves_product_id
  ON public.inventory_moves(product_id);

CREATE OR REPLACE FUNCTION app_private.get_product_trash_impediment(p_product_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_var_ids_text text[];
  v_var_ids_uuid uuid[];
BEGIN
  IF p_product_id IS NULL THEN
    RETURN 'ID do produto não informado.';
  END IF;

  IF auth.uid() IS NULL OR NOT app_private.has_delete_products_permission() THEN
    RETURN 'Seu perfil não possui permissão para mover produtos para a lixeira.';
  END IF;

  -- 1. Verifica se há estoque físico ativo no produto pai ou variações
  IF EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = p_product_id
      AND COALESCE(product.stock::numeric, 0) <> 0
  ) OR EXISTS (
    SELECT 1
    FROM public.product_variations AS variation
    WHERE variation.product_id = p_product_id
      AND COALESCE(variation.stock::numeric, 0) <> 0
  ) THEN
    RETURN 'Produto possui estoque físico que deve ser baixado antes de mover para a lixeira.';
  END IF;

  SELECT
    COALESCE(pg_catalog.array_agg(variation.id::text), ARRAY[]::text[]),
    COALESCE(pg_catalog.array_agg(variation.id), ARRAY[]::uuid[])
  INTO v_var_ids_text, v_var_ids_uuid
  FROM public.product_variations AS variation
  WHERE variation.product_id = p_product_id;

  -- 2. Verifica devoluções (pedidos de devolução vinculados)
  IF EXISTS (
    SELECT 1
    FROM public.order_items AS item
    JOIN public.orders AS order_record ON order_record.id = item.order_id
    WHERE (item.product_id = p_product_id::text OR item.variation_id = ANY(v_var_ids_text))
      AND (
        order_record.return_order_id IS NOT NULL
        OR order_record.linked_order_id IS NOT NULL
        OR order_record.order_type = 'return'
        OR order_record.status = 'returned'
      )
  ) THEN
    RETURN 'Produto vinculado a uma devolução';
  END IF;

  -- 3. Verifica vendas (incluindo pedidos cancelados que devem ser preservados)
  IF EXISTS (
    SELECT 1
    FROM public.order_items AS item
    WHERE item.product_id = p_product_id::text
       OR item.variation_id = ANY(v_var_ids_text)
  ) OR EXISTS (
    SELECT 1
    FROM public.orders AS order_record
    WHERE COALESCE(order_record.items::text, '') LIKE '%' || p_product_id::text || '%'
       OR COALESCE(order_record.order_data::text, '') LIKE '%' || p_product_id::text || '%'
  ) THEN
    RETURN 'Produto possui variações vinculadas a vendas';
  END IF;

  -- 4. Verifica movimentações históricas de estoque
  IF EXISTS (
    SELECT 1
    FROM public.inventory_moves AS move
    WHERE move.product_id = p_product_id::text
       OR move.variation_id = ANY(v_var_ids_text)
  ) THEN
    RETURN 'Produto com movimentação histórica de estoque que deve ser preservada';
  END IF;

  -- 5. Verifica documentos fiscais, recebimentos e compras
  IF EXISTS (
    SELECT 1
    FROM public.goods_receipt_items AS item
    WHERE item.product_id = p_product_id
       OR item.variation_id = ANY(v_var_ids_uuid)
  ) OR EXISTS (
    SELECT 1
    FROM public.inbound_invoice_items AS item
    WHERE item.product_id = p_product_id
       OR item.variation_id = ANY(v_var_ids_uuid)
  ) OR EXISTS (
    SELECT 1
    FROM public.purchase_items AS item
    WHERE item.product_id = p_product_id::text
       OR item.variation_id = ANY(v_var_ids_text)
  ) OR EXISTS (
    SELECT 1
    FROM public.inbound_invoices AS invoice
    WHERE COALESCE(invoice.itens::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.purchases AS purchase
    WHERE COALESCE(purchase.items::text, '') LIKE '%' || p_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1
    FROM public.goods_receipts AS receipt
    WHERE COALESCE(receipt.items::text, '') LIKE '%' || p_product_id::text || '%'
  ) THEN
    RETURN 'Produto vinculado a documento fiscal';
  END IF;

  -- 6. Verifica demais referências impeditivas e foreign keys
  IF app_private.product_has_references(p_product_id) THEN
    RETURN 'Este produto não pode ser movido para a lixeira porque possui operações históricas vinculadas a uma ou mais variações.';
  END IF;

  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.get_product_trash_impediment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.get_product_trash_impediment(uuid) TO authenticated;

-- Função em lote para obter a elegibilidade de exclusão/lixeira na listagem de produtos
CREATE OR REPLACE FUNCTION public.get_products_trash_eligibility(p_product_ids uuid[])
RETURNS TABLE (
  product_id uuid,
  can_trash boolean,
  trash_block_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_id uuid;
  v_is_draft boolean;
  v_status text;
  v_deleted boolean;
  v_impediment text;
BEGIN
  IF p_product_ids IS NULL OR pg_catalog.cardinality(p_product_ids) = 0 THEN
    RETURN;
  END IF;

  FOREACH v_id IN ARRAY p_product_ids
  LOOP
    SELECT product.is_draft, product.status, product.deleted
    INTO v_is_draft, v_status, v_deleted
    FROM public.products AS product
    WHERE product.id = v_id;

    IF NOT FOUND THEN
      product_id := v_id;
      can_trash := false;
      trash_block_reason := 'Produto não encontrado';
      RETURN NEXT;
    ELSIF COALESCE(v_is_draft, false) IS TRUE OR v_status = 'draft' THEN
      product_id := v_id;
      can_trash := false;
      trash_block_reason := 'Rascunhos devem ser descartados diretamente';
      RETURN NEXT;
    ELSIF COALESCE(v_deleted, false) IS TRUE THEN
      product_id := v_id;
      can_trash := false;
      trash_block_reason := 'Produto já está na lixeira';
      RETURN NEXT;
    ELSE
      v_impediment := app_private.get_product_trash_impediment(v_id);
      product_id := v_id;
      can_trash := (v_impediment IS NULL);
      trash_block_reason := v_impediment;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_products_trash_eligibility(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_products_trash_eligibility(uuid[]) TO authenticated;

-- Move transacionalmente produto pai e todas as suas variações para a lixeira
CREATE OR REPLACE FUNCTION public.move_product_to_trash(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_product record;
  v_impediment text;
  v_previous_state jsonb;
  v_trash_metadata jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.has_delete_products_permission() THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'permission_denied',
      'message', 'Seu perfil não possui permissão para mover produtos para a lixeira.'
    );
  END IF;

  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'product_not_found',
      'message', 'Produto não encontrado.'
    );
  END IF;

  IF COALESCE(v_product.is_draft, false) IS TRUE OR v_product.status = 'draft' THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'draft_not_allowed',
      'message', 'Rascunhos devem ser descartados diretamente e não movidos para a lixeira.'
    );
  END IF;

  IF COALESCE(v_product.deleted, false) IS TRUE THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'already_in_trash',
      'message', 'Este produto já está na lixeira.'
    );
  END IF;

  -- Bloqueia todas as variações para evitar inserção simultânea ou uso em venda
  PERFORM 1
  FROM public.product_variations
  WHERE product_id = p_product_id
  FOR UPDATE;

  -- Valida novamente no banco se há vínculos impeditivos (concorrência segura)
  v_impediment := app_private.get_product_trash_impediment(p_product_id);
  IF v_impediment IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'product_in_use',
      'message', v_impediment
    );
  END IF;

  -- Captura os estados anteriores de ativação e visibilidade
  SELECT pg_catalog.jsonb_build_object(
    'parent', pg_catalog.jsonb_build_object(
      'active', v_product.active,
      'status', v_product.status
    ),
    'variations', (
      SELECT COALESCE(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', pv.id,
            'active', pv.active,
            'status', pv.status
          )
        ),
        '[]'::jsonb
      )
      FROM public.product_variations AS pv
      WHERE pv.product_id = p_product_id
    )
  )
  INTO v_previous_state;

  v_trash_metadata := pg_catalog.jsonb_build_object(
    'deleted_at', pg_catalog.now(),
    'deleted_by', auth.uid(),
    'retention_until', pg_catalog.now() + interval '30 days',
    'previous_state', v_previous_state
  );

  -- 1. Desativar no ERP (active = false)
  -- 2. Ocultar no catálogo digital (status = 'hidden')
  -- 3. Remover das listagens operacionais (deleted = true, deleted_at = now())
  -- 4. Preservar dados e metadados por 30 dias
  UPDATE public.products
  SET
    active = false,
    status = 'hidden',
    deleted = true,
    deleted_at = pg_catalog.now(),
    technical_specs = pg_catalog.jsonb_set(
      COALESCE(technical_specs, '{}'::jsonb),
      '{trash_metadata}',
      v_trash_metadata
    ),
    updated_at = pg_catalog.now()
  WHERE id = p_product_id;

  -- Atualiza todas as variações do conjunto
  UPDATE public.product_variations
  SET
    active = false,
    status = 'hidden',
    updated_at = pg_catalog.now()
  WHERE product_id = p_product_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'code', 'moved_to_trash',
    'message', 'Produto e variações movidos para a lixeira com sucesso.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.move_product_to_trash(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_product_to_trash(uuid) TO authenticated;

-- Restaura transacionalmente produto pai e todas as suas variações da lixeira
CREATE OR REPLACE FUNCTION public.restore_product_from_trash(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_product record;
  v_previous_state jsonb;
  v_parent_active boolean;
  v_parent_status text;
  v_var_entry jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.has_delete_products_permission() THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'permission_denied',
      'message', 'Seu perfil não possui permissão para restaurar produtos da lixeira.'
    );
  END IF;

  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'product_not_found',
      'message', 'Produto não encontrado.'
    );
  END IF;

  IF COALESCE(v_product.deleted, false) IS NOT TRUE THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'not_in_trash',
      'message', 'Este produto não está na lixeira.'
    );
  END IF;

  -- Extrai os estados anteriores registrados antes da ida à lixeira
  v_previous_state := v_product.technical_specs -> 'trash_metadata' -> 'previous_state';
  v_parent_active := COALESCE((v_previous_state -> 'parent' ->> 'active')::boolean, true);
  v_parent_status := COALESCE(v_previous_state -> 'parent' ->> 'status', 'published');

  -- Produtos Salvado nunca ativam no ERP por regra de negócio
  IF v_product.product_kind = 'salvado' THEN
    v_parent_active := false;
  END IF;

  -- Restaura produto pai
  UPDATE public.products
  SET
    active = v_parent_active,
    status = v_parent_status,
    deleted = false,
    deleted_at = NULL,
    technical_specs = COALESCE(technical_specs, '{}'::jsonb) - 'trash_metadata',
    updated_at = pg_catalog.now()
  WHERE id = p_product_id;

  -- Restaura cada variação para o seu estado individual anterior
  IF v_previous_state -> 'variations' IS NOT NULL AND pg_catalog.jsonb_array_length(v_previous_state -> 'variations') > 0 THEN
    FOR v_var_entry IN SELECT * FROM pg_catalog.jsonb_array_elements(v_previous_state -> 'variations')
    LOOP
      UPDATE public.product_variations
      SET
        active = COALESCE((v_var_entry ->> 'active')::boolean, v_parent_active),
        status = COALESCE(v_var_entry ->> 'status', v_parent_status),
        updated_at = pg_catalog.now()
      WHERE product_id = p_product_id
        AND id = (v_var_entry ->> 'id')::uuid;
    END LOOP;
  ELSE
    UPDATE public.product_variations
    SET
      active = v_parent_active,
      status = v_parent_status,
      updated_at = pg_catalog.now()
    WHERE product_id = p_product_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'code', 'restored_from_trash',
    'message', 'Produto e variações restaurados com sucesso.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.restore_product_from_trash(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_product_from_trash(uuid) TO authenticated;

-- Rotina de limpeza periódica de produtos expirados após 30 dias na lixeira
CREATE OR REPLACE FUNCTION public.cleanup_expired_trash_products()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_product record;
  v_impediment text;
  v_deleted_count integer := 0;
  v_blocked_count integer := 0;
BEGIN
  FOR v_product IN
    SELECT product.id
    FROM public.products AS product
    WHERE product.deleted = true
      AND product.deleted_at IS NOT NULL
      AND product.deleted_at <= (pg_catalog.now() - interval '30 days')
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Reavalia se há impedimentos ou vínculos históricos
    v_impediment := app_private.get_product_trash_impediment(v_product.id);
    IF v_impediment IS NULL AND NOT app_private.product_has_references(v_product.id) THEN
      PERFORM pg_catalog.set_config('morantehub.allow_unreferenced_product_delete', 'on', true);

      -- Exclui registros auxiliares permitidos
      DELETE FROM public.product_images WHERE product_id = v_product.id;
      DELETE FROM public.product_categories WHERE product_id = v_product.id;
      DELETE FROM public.product_variations WHERE product_id = v_product.id;
      DELETE FROM public.products WHERE id = v_product.id;

      v_deleted_count := v_deleted_count + 1;
    ELSE
      v_blocked_count := v_blocked_count + 1;
    END IF;
  END LOOP;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'blocked_count', v_blocked_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_expired_trash_products() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_trash_products() TO authenticated, service_role;

-- Agendamento diário da rotina de limpeza após 30 dias via pg_cron
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.unschedule('cleanup-expired-trash-products')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-trash-products');

    PERFORM cron.schedule(
      'cleanup-expired-trash-products',
      '0 7 * * *',
      'SELECT public.cleanup_expired_trash_products();'
    );
  END IF;
END;
$do$;
