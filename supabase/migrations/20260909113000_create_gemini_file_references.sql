-- Referências temporárias do Gemini. O documento oficial permanece no Storage.
CREATE TABLE IF NOT EXISTS public.gemini_file_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_sha256 TEXT NOT NULL,
    source_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    gemini_file_name TEXT,
    gemini_file_uri TEXT,
    state TEXT NOT NULL CHECK (state IN ('PROCESSING', 'ACTIVE', 'FAILED', 'EXPIRED')),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    lock_token UUID,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error_code TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (owner_id, source_sha256)
);

CREATE INDEX IF NOT EXISTS idx_gemini_file_references_reuse
    ON public.gemini_file_references (owner_id, source_sha256, state, expires_at);

ALTER TABLE public.gemini_file_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their Gemini file references"
    ON public.gemini_file_references FOR SELECT
    USING (owner_id = auth.uid());
