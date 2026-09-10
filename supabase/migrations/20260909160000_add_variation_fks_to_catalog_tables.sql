-- Adiciona FKs explícitas para variation_id nas tabelas de catálogo digital.
--
-- Contexto (auditoria 2026-09-09):
-- Ambas as tabelas já tinham a coluna `variation_id uuid` mas sem REFERENCES declarado.
-- Isso significava que o banco não verificava se o UUID referenciado existia
-- em product_variations, permitindo UUIDs órfãos silenciosamente.
--
-- Semântica:
--   ON DELETE SET NULL — o post/token continua existindo se a variação for excluída;
--   apenas o vínculo de variação é limpo. O produto pai (product_id) continua resolvendo
--   o recurso de forma degradada.
--
-- NOT VALID — preserva registros históricos que possam ter variation_id orfão;
--   novas inserções e atualizações são validadas imediatamente.
-- Para validar os registros existentes no futuro: VALIDATE CONSTRAINT.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'post_share_tokens_variation_id_fkey'
      AND conrelid = 'public.post_share_tokens'::regclass
  ) THEN
    ALTER TABLE public.post_share_tokens
      ADD CONSTRAINT post_share_tokens_variation_id_fkey
      FOREIGN KEY (variation_id)
      REFERENCES public.product_variations(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_posts_variation_id_fkey'
      AND conrelid = 'public.product_posts'::regclass
  ) THEN
    ALTER TABLE public.product_posts
      ADD CONSTRAINT product_posts_variation_id_fkey
      FOREIGN KEY (variation_id)
      REFERENCES public.product_variations(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- Índice auxiliar para a FK de post_share_tokens (evita full-scan na exclusão de variação)
CREATE INDEX IF NOT EXISTS post_share_tokens_variation_id_idx
  ON public.post_share_tokens (variation_id)
  WHERE variation_id IS NOT NULL;

-- Índice auxiliar para a FK de product_posts
CREATE INDEX IF NOT EXISTS product_posts_variation_id_idx
  ON public.product_posts (variation_id)
  WHERE variation_id IS NOT NULL;
