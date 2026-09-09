-- Campos aditivos: notas históricas continuam válidas e os itens permanecem
-- no JSONB para preservar a estrutura fiscal integral sem 150 colunas.
ALTER TABLE public.inbound_invoices
  ADD COLUMN IF NOT EXISTS valor_icms_st NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extraction_status TEXT NOT NULL DEFAULT 'completed'
    CHECK (extraction_status IN ('processing', 'completed', 'review_required', 'failed')),
  ADD COLUMN IF NOT EXISTS extraction_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extraction_ai_model TEXT,
  ADD COLUMN IF NOT EXISTS raw_extraction JSONB,
  ADD COLUMN IF NOT EXISTS informacoes_adicionais TEXT;

CREATE INDEX IF NOT EXISTS idx_inbound_invoices_extraction_status
  ON public.inbound_invoices (extraction_status, updated_at DESC);
