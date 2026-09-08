-- O texto continua em delivery_summaries; o arquivo é permanente no Storage.
ALTER TABLE public.delivery_summaries
  ADD COLUMN IF NOT EXISTS audio_cache_key TEXT,
  ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-summary-audio', 'delivery-summary-audio', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can read delivery summary audio') THEN
    CREATE POLICY "Authenticated users can read delivery summary audio" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = 'delivery-summary-audio');
  END IF;
END $$;
