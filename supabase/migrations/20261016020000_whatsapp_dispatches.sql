-- Migration: 20261016020000_whatsapp_dispatches.sql
-- Tabela e índices para rastreamento de envios de mensagens do WhatsApp Cloud API com sincronização via Webhooks

CREATE TABLE IF NOT EXISTS public.whatsapp_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'order_confirmation',
  message_content TEXT,
  api_message_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
  error_code TEXT,
  failure_reason TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_dispatches_order_id ON public.whatsapp_dispatches(order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_dispatches_api_message_id ON public.whatsapp_dispatches(api_message_id) WHERE api_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_dispatches_phone ON public.whatsapp_dispatches(recipient_phone);

ALTER TABLE public.whatsapp_dispatches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_dispatches' AND policyname = 'whatsapp_dispatches_select') THEN
    CREATE POLICY "whatsapp_dispatches_select" ON public.whatsapp_dispatches FOR SELECT TO authenticated, anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_dispatches' AND policyname = 'whatsapp_dispatches_insert') THEN
    CREATE POLICY "whatsapp_dispatches_insert" ON public.whatsapp_dispatches FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_dispatches' AND policyname = 'whatsapp_dispatches_update') THEN
    CREATE POLICY "whatsapp_dispatches_update" ON public.whatsapp_dispatches FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_dispatches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_dispatches;
  END IF;
END $$;
