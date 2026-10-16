-- Migration: 20261015170000_warranty_terms_tracking.sql
-- Tabela e funções para registro, versionamento e rastreabilidade do Termo de Garantia

CREATE TABLE IF NOT EXISTS public.warranty_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  document_version INTEGER NOT NULL DEFAULT 1,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  file_hash_sha256 TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  sent_at TIMESTAMPTZ,
  send_recipient TEXT,
  send_channel TEXT DEFAULT 'whatsapp',
  send_mode TEXT,
  api_message_id TEXT,
  api_response JSONB,
  delivery_status TEXT NOT NULL DEFAULT 'not_sent',
  delivery_status_updated_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_warranty_terms_order_id ON public.warranty_terms(order_id);
CREATE INDEX IF NOT EXISTS idx_warranty_terms_api_message_id ON public.warranty_terms(api_message_id) WHERE api_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_terms_hash ON public.warranty_terms(file_hash_sha256);

ALTER TABLE public.warranty_terms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'warranty_terms' AND policyname = 'warranty_terms_select') THEN
    CREATE POLICY "warranty_terms_select" ON public.warranty_terms FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'warranty_terms' AND policyname = 'warranty_terms_insert') THEN
    CREATE POLICY "warranty_terms_insert" ON public.warranty_terms FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'warranty_terms' AND policyname = 'warranty_terms_update') THEN
    CREATE POLICY "warranty_terms_update" ON public.warranty_terms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('warranty-terms', 'warranty-terms', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read warranty terms'
  ) THEN
    CREATE POLICY "Public read warranty terms" ON storage.objects
      FOR SELECT USING (bucket_id = 'warranty-terms');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated insert warranty terms'
  ) THEN
    CREATE POLICY "Authenticated insert warranty terms" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'warranty-terms');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated update warranty terms'
  ) THEN
    CREATE POLICY "Authenticated update warranty terms" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'warranty-terms');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_warranty_term(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_next_version INTEGER;
BEGIN
  SELECT id, status, order_type, order_number, order_index, created_at, customer_id, customer_name, deleted, order_data
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Pedido % não encontrado.', p_order_id;
  END IF;

  IF LOWER(COALESCE(v_order.status, '')) = 'draft' THEN
    RAISE EXCEPTION 'ORDER_IS_DRAFT: O Termo de Garantia não pode ser emitido para pedidos em rascunho.';
  END IF;

  IF COALESCE(v_order.deleted, false) = true THEN
    RAISE EXCEPTION 'ORDER_DELETED: Pedido cancelado ou excluído.';
  END IF;

  IF COALESCE(v_order.order_type, 'sale') NOT IN ('sale', 'showroom') THEN
    RAISE EXCEPTION 'INVALID_ORDER_TYPE: O Termo de Garantia é exclusivo para pedidos de venda.';
  END IF;

  SELECT COALESCE(MAX(document_version), 0) + 1
  INTO v_next_version
  FROM public.warranty_terms
  WHERE order_id = p_order_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'description', oi.description,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'handling_type', oi.handling_type,
      'observation', oi.observation
    ) ORDER BY oi.item_index
  ), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_number', COALESCE(v_order.order_number, v_order.order_index::text, v_order.id),
    'status', v_order.status,
    'order_type', v_order.order_type,
    'date', v_order.created_at,
    'customer_id', v_order.customer_id,
    'customer_name', v_order.customer_name,
    'items', v_items,
    'next_version', v_next_version,
    'order_data', v_order.order_data
  );
END;
$$;
