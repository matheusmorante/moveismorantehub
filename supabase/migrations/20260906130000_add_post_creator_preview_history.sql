-- Histórico de previews: múltiplas gerações podem compartilhar a mesma entrada.
ALTER TABLE public.post_creator_previews
  ADD COLUMN IF NOT EXISTS accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.post_creator_previews
  DROP CONSTRAINT IF EXISTS post_creator_previews_input_hash_key;

CREATE INDEX IF NOT EXISTS post_creator_previews_context_created_idx
  ON public.post_creator_previews (campaign_id, product_id, format, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS post_creator_one_accepted_preview
  ON public.post_creator_previews (campaign_id, product_id, format)
  WHERE accepted;

-- Retrocompatibilidade: mantém como principal o cache mais recente já existente.
WITH latest AS (
  SELECT DISTINCT ON (campaign_id, product_id, format) id
  FROM public.post_creator_previews
  ORDER BY campaign_id, product_id, format, created_at DESC
)
UPDATE public.post_creator_previews AS preview
SET accepted = true
FROM latest
WHERE preview.id = latest.id
  AND NOT EXISTS (
    SELECT 1 FROM public.post_creator_previews AS accepted
    WHERE accepted.campaign_id = preview.campaign_id
      AND accepted.product_id = preview.product_id
      AND accepted.format = preview.format
      AND accepted.accepted
  );
