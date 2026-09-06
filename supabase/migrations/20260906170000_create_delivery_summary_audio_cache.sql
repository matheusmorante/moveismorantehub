-- Migration: Cache de Áudio do Resumo de Entregas por Conteúdo
-- Permite reutilizar áudio sintetizado (TTS) baseado estritamente no HASH do texto normalizado
-- e nas configurações de voz, sem invalidar por data, reload ou reabertura da tela.

CREATE TABLE IF NOT EXISTS delivery_summary_audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  normalized_text TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'gemini-3.1-flash-tts-preview',
  voice_id TEXT NOT NULL DEFAULT 'Kore',
  language TEXT NOT NULL DEFAULT 'pt-BR',
  speed NUMERIC DEFAULT 1.0,
  audio_url TEXT NOT NULL,
  audio_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscas ultra-rápidas por cache_key
CREATE INDEX IF NOT EXISTS idx_delivery_summary_audio_cache_key ON delivery_summary_audio_cache (cache_key);

-- Policy RLS para leitura e inserção pública/autenticada
ALTER TABLE delivery_summary_audio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permite leitura publica do cache de audio"
  ON delivery_summary_audio_cache FOR SELECT
  USING (true);

CREATE POLICY "Permite criacao e atualizacao no cache de audio"
  ON delivery_summary_audio_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permite edicao no cache de audio"
  ON delivery_summary_audio_cache FOR UPDATE
  USING (true);
