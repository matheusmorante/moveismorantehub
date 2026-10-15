-- Otimização crítica de performance para triggers de integridade de artefatos de teste
-- Problema: Funções como assert_test_artifact_link, test_artifact_ref e assert_test_product_variation
-- realizavam comparações do tipo `WHERE r.id::text = p_id`.
-- Em colunas com chave primária UUID (products, product_variations, purchases, goods_receipts, accounts_payable),
-- a conversão `::text` na coluna impedia o PostgreSQL de utilizar o índice BTree da chave primária (PK),
-- forçando varreduras sequenciais completas (Seq Scan) com LockRows (FOR KEY SHARE) em cada trigger.
-- Em concorrência com atualizações de produtos ou pedidos, isso gerava contenção de locks e esgotamento
-- do statement_timeout (8s) com erro: 'canceling statement due to statement timeout'.
--
-- Solução:
-- 1. Fazer o parse/cast seguro de p_id para UUID quando o identificador for um UUID válido,
--    permitindo uso direto do índice da chave primária (Index Scan).
-- 2. Adicionar proteção de profundidade (pg_trigger_depth() > 1) em triggers de sincronização
--    de variações únicas para impedir recursão desnecessária.

BEGIN;

CREATE OR REPLACE FUNCTION public.assert_test_artifact_link(
  p_identity jsonb,
  p_table text,
  p_id text
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row jsonb; v_data jsonb; v_identity jsonb; v_is_test boolean; v_uuid uuid;
BEGIN
  IF nullif(p_id,'') IS NULL THEN RETURN; END IF;

  IF p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := p_id::uuid;
  ELSE
    v_uuid := NULL;
  END IF;

  IF p_table='products' THEN
    IF v_uuid IS NULL THEN RETURN; END IF;
    SELECT to_jsonb(p) INTO v_row FROM public.products p WHERE p.id = v_uuid FOR KEY SHARE;
  ELSIF p_table='orders' THEN
    SELECT to_jsonb(o) INTO v_row FROM public.orders o WHERE o.id = p_id FOR KEY SHARE;
  ELSIF p_table='product_variations' THEN
    IF v_uuid IS NULL THEN RETURN; END IF;
    SELECT to_jsonb(v) INTO v_row FROM public.product_variations v
      JOIN public.products p ON p.id=v.product_id WHERE v.id = v_uuid FOR KEY SHARE OF p,v;
  ELSE
    v_row:=public.test_artifact_ref(p_table,p_id);
  END IF;
  v_data:=public.test_artifact_row_data(p_table,v_row);
  v_is_test:=coalesce(v_data->>'is_test','false')='true' OR public.test_artifact_is_test(v_row);
  v_identity:=public.test_artifact_identity(v_data);
  IF (p_identity IS NULL AND v_is_test) OR
    (p_identity IS NOT NULL AND (NOT v_is_test OR v_identity IS DISTINCT FROM p_identity)) THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_LINK_MISMATCH: %',p_table;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.test_artifact_ref(p_table text, p_id text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row jsonb; v_uuid uuid;
BEGIN
  IF nullif(p_id,'') IS NULL THEN RETURN '{}'::jsonb; END IF;

  IF p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := p_id::uuid;
  ELSE
    v_uuid := NULL;
  END IF;

  CASE p_table
    WHEN 'orders' THEN SELECT to_jsonb(r) INTO v_row FROM public.orders r WHERE r.id = p_id;
    WHEN 'people' THEN SELECT to_jsonb(r) INTO v_row FROM public.people r WHERE r.id = p_id;
    WHEN 'products' THEN 
      IF v_uuid IS NULL THEN RETURN '{}'::jsonb; END IF;
      SELECT to_jsonb(r) INTO v_row FROM public.products r WHERE r.id = v_uuid;
    WHEN 'product_variations' THEN
      IF v_uuid IS NULL THEN RETURN '{}'::jsonb; END IF;
      SELECT to_jsonb(p) INTO v_row FROM public.product_variations v JOIN public.products p ON p.id=v.product_id WHERE v.id = v_uuid;
    WHEN 'accounts_receivable' THEN SELECT to_jsonb(r) INTO v_row FROM public.accounts_receivable r WHERE r.id = p_id;
    WHEN 'accounts_payable' THEN 
      IF v_uuid IS NULL THEN RETURN '{}'::jsonb; END IF;
      SELECT to_jsonb(r) INTO v_row FROM public.accounts_payable r WHERE r.id = v_uuid;
    WHEN 'purchases' THEN 
      IF v_uuid IS NULL THEN RETURN '{}'::jsonb; END IF;
      SELECT to_jsonb(r) INTO v_row FROM public.purchases r WHERE r.id = v_uuid;
    WHEN 'goods_receipts' THEN 
      IF v_uuid IS NULL THEN RETURN '{}'::jsonb; END IF;
      SELECT to_jsonb(r) INTO v_row FROM public.goods_receipts r WHERE r.id = v_uuid;
    ELSE RAISE EXCEPTION 'Unsupported test artifact reference: %', p_table;
  END CASE;
  RETURN coalesce(v_row,'{}'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION public.assert_test_product_variation(
  p_product_id text,
  p_variation_id text
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_parent text; v_uuid uuid;
BEGIN
  IF nullif(p_variation_id,'') IS NULL THEN RETURN; END IF;
  IF p_variation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := p_variation_id::uuid;
  ELSE
    RETURN;
  END IF;
  SELECT v.product_id::text INTO v_parent
  FROM public.product_variations v WHERE v.id = v_uuid;
  IF NOT FOUND OR v_parent IS DISTINCT FROM p_product_id THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_VARIATION_PRODUCT_MISMATCH';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_single_variation_after_product_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  PERFORM public.sync_single_variation_parent_data(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_single_variation_after_variation_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  PERFORM public.sync_single_variation_parent_data(CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

COMMIT;
