-- Migration: 20261016030000_customer_support_whatsapp.sql
-- Módulo: Central de Atendimento WhatsApp (Estilo WhatsApp Web) integrado a clientes e pedidos
-- Tabelas: whatsapp_conversations, whatsapp_messages, whatsapp_usage_monthly

-- 1. Tabela de Conversas
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_phone_number_id TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL, -- Telefone formatado em E.164 (ex: +5511999999999)
  contact_wa_id TEXT NOT NULL, -- WhatsApp ID reportado pela Meta (ex: 5511999999999)
  contact_name TEXT, -- Nome de perfil reportado pela Meta
  customer_id TEXT REFERENCES public.people(id) ON DELETE SET NULL, -- Vínculo seguro com cadastro do ERP
  customer_link_status TEXT NOT NULL DEFAULT 'unlinked', -- 'unlinked', 'auto_matched', 'manually_linked', 'ambiguous'
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_customer_message_at TIMESTAMPTZ, -- Registro para controle da Janela de Atendimento de 24h
  unread_count INT NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  internal_notes TEXT, -- Notas internas visíveis apenas para a equipe (não enviadas ao cliente)
  tags TEXT[] DEFAULT '{}', -- Marcadores internos de atendimento
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Atendente responsável
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_whatsapp_conversations_business_wa UNIQUE (business_phone_number_id, contact_wa_id)
);

-- Índices otimizados para busca e paginação de conversas (Prevenção de Egress excessivo)
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON public.whatsapp_conversations(contact_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer ON public.whatsapp_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_msg ON public.whatsapp_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_archived ON public.whatsapp_conversations(is_archived);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_unread ON public.whatsapp_conversations(unread_count) WHERE unread_count > 0;

-- 2. Tabela de Mensagens
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  api_message_id TEXT UNIQUE, -- wamid oficial da Meta para idempotência estrita
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'document', 'audio', 'video', 'interactive', 'sticker', 'unsupported'
  text_content TEXT,
  media_id TEXT, -- ID de mídia da Meta
  media_mime_type TEXT,
  media_url TEXT, -- URL privada/proxy
  media_filename TEXT,
  media_caption TEXT,
  reply_to_message_id TEXT, -- ID da mensagem respondida
  reply_to_wamid TEXT,
  status TEXT NOT NULL DEFAULT 'received', -- 'sent', 'delivered', 'read', 'failed', 'received'
  error_code TEXT,
  failure_reason TEXT,
  raw_payload JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_api_id ON public.whatsapp_messages(api_message_id) WHERE api_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);

-- 3. Tabela de Controle de Consumo Mensal e Gratuidade (Meta Cloud API Pricing 2026)
CREATE TABLE IF NOT EXISTS public.whatsapp_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_phone_number_id TEXT NOT NULL,
  year_month TEXT NOT NULL, -- Formato 'YYYY-MM' (ex: '2026-10')
  free_tier_limit INT NOT NULL DEFAULT 1000, -- Franquia de 1.000 mensagens de serviço gratuitas/mês
  service_messages_count INT NOT NULL DEFAULT 0,
  last_reconciliation_at TIMESTAMPTZ,
  reconciliation_status TEXT NOT NULL DEFAULT 'estimated', -- 'estimated', 'meta_confirmed', 'unconfirmed'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_whatsapp_usage_monthly UNIQUE (business_phone_number_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_monthly_lookup ON public.whatsapp_usage_monthly(business_phone_number_id, year_month);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_usage_monthly ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Políticas para whatsapp_conversations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_conversations' AND policyname = 'whatsapp_conversations_select') THEN
    CREATE POLICY "whatsapp_conversations_select" ON public.whatsapp_conversations FOR SELECT TO authenticated, anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_conversations' AND policyname = 'whatsapp_conversations_insert') THEN
    CREATE POLICY "whatsapp_conversations_insert" ON public.whatsapp_conversations FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_conversations' AND policyname = 'whatsapp_conversations_update') THEN
    CREATE POLICY "whatsapp_conversations_update" ON public.whatsapp_conversations FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;

  -- Políticas para whatsapp_messages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_messages' AND policyname = 'whatsapp_messages_select') THEN
    CREATE POLICY "whatsapp_messages_select" ON public.whatsapp_messages FOR SELECT TO authenticated, anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_messages' AND policyname = 'whatsapp_messages_insert') THEN
    CREATE POLICY "whatsapp_messages_insert" ON public.whatsapp_messages FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_messages' AND policyname = 'whatsapp_messages_update') THEN
    CREATE POLICY "whatsapp_messages_update" ON public.whatsapp_messages FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;

  -- Políticas para whatsapp_usage_monthly
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_usage_monthly' AND policyname = 'whatsapp_usage_monthly_select') THEN
    CREATE POLICY "whatsapp_usage_monthly_select" ON public.whatsapp_usage_monthly FOR SELECT TO authenticated, anon USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_usage_monthly' AND policyname = 'whatsapp_usage_monthly_insert') THEN
    CREATE POLICY "whatsapp_usage_monthly_insert" ON public.whatsapp_usage_monthly FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_usage_monthly' AND policyname = 'whatsapp_usage_monthly_update') THEN
    CREATE POLICY "whatsapp_usage_monthly_update" ON public.whatsapp_usage_monthly FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Adicionar tabelas à publicação Realtime para sincronização reativa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
END $$;
