-- Estado compartilhado do texto e da geração de áudio do resumo operacional.
-- Esta tabela é a fonte de verdade para todos os aparelhos conectados.
CREATE TABLE IF NOT EXISTS public.delivery_summaries (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('today', 'tomorrow', 'next_days', 'next5days')),
  data_fingerprint TEXT NOT NULL,
  text TEXT,
  audio_url TEXT,
  text_status TEXT NOT NULL DEFAULT 'MISSING'
    CHECK (text_status IN ('MISSING', 'GENERATING', 'READY', 'FAILED')),
  audio_status TEXT NOT NULL DEFAULT 'MISSING'
    CHECK (audio_status IN ('MISSING', 'GENERATING', 'READY', 'FAILED')),
  generator_version TEXT NOT NULL DEFAULT 'v1',
  tts_version TEXT NOT NULL DEFAULT 'v1',
  generation_started_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope, data_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_delivery_summaries_scope_updated
  ON public.delivery_summaries (scope, updated_at DESC);

ALTER TABLE public.delivery_summaries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'delivery_summaries'
      AND policyname = 'Leitura compartilhada dos resumos de entrega'
  ) THEN
    CREATE POLICY "Leitura compartilhada dos resumos de entrega"
      ON public.delivery_summaries FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'delivery_summaries'
      AND policyname = 'Atualizacao compartilhada dos resumos de entrega'
  ) THEN
    CREATE POLICY "Atualizacao compartilhada dos resumos de entrega"
      ON public.delivery_summaries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.delivery_summaries REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_summaries;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
