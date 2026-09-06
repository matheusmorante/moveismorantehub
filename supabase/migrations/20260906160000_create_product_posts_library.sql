-- Migration: Biblioteca de Posts — artes finais geradas externamente (ChatGPT/Gemini)
-- e importadas pelo usuário. NÃO é o histórico de geração interna (legado).
-- Sem FIFO. Exclusão explícita. Sem limite de artes por produto.
-- Formato: FEED_4_5 (4:5 / 1080×1350) ou STORY_STATUS_9_16 (9:16 / 1080×1920)

CREATE TABLE IF NOT EXISTS public.product_posts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid        NOT NULL,
  campaign_id           uuid        REFERENCES public.post_creator_campaigns(id) ON DELETE SET NULL,
  variation_id          uuid,                         -- variação associada (opcional)
  format                text        NOT NULL CHECK (format IN ('FEED_4_5', 'STORY_STATUS_9_16')),
  image_storage_path    text        NOT NULL,          -- caminho no Storage bucket product-posts
  image_url             text        NOT NULL,          -- URL pública HTTPS acessível
  title                 text,
  notes                 text,
  campaign_config_hash  text,                         -- hash da config da campanha no momento do upload
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Índices para os filtros principais da Biblioteca
CREATE INDEX IF NOT EXISTS product_posts_product_idx   ON public.product_posts (product_id);
CREATE INDEX IF NOT EXISTS product_posts_campaign_idx  ON public.product_posts (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS product_posts_format_idx    ON public.product_posts (format);

ALTER TABLE public.product_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_product_posts" ON public.product_posts;
CREATE POLICY "authenticated_manage_product_posts"
  ON public.product_posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ======================================================================
-- Expandir CHECK de element_type em post_creator_element_models
-- para incluir HEADER e FOOTER (novos tipos de elemento do documento).
-- Estratégia não destrutiva: DROP + ADD do constraint.
-- ======================================================================
ALTER TABLE public.post_creator_element_models
  DROP CONSTRAINT IF EXISTS post_creator_element_models_element_type_check;

ALTER TABLE public.post_creator_element_models
  ADD CONSTRAINT post_creator_element_models_element_type_check
  CHECK (element_type IN (
    'TITLE', 'PRODUCT_NAME', 'PRICE', 'OLD_PRICE', 'INSTALLMENT',
    'BADGE', 'BACKGROUND', 'LOGO', 'CTA',
    'PRODUCT_SLOGAN', 'COMPANY_SLOGAN',
    'HEADER', 'FOOTER'
  ));

-- Adicionar campo instructions (alias semântico de general_guidelines) às campanhas
-- para refletir a nova terminologia do documento, mantendo retrocompatibilidade.
ALTER TABLE public.post_creator_campaigns
  ADD COLUMN IF NOT EXISTS instructions text;

-- Adicionar campo config_hash às campanhas para versionamento
ALTER TABLE public.post_creator_campaigns
  ADD COLUMN IF NOT EXISTS config_hash text;

-- Sincronizar instructions com general_guidelines nos registros existentes
UPDATE public.post_creator_campaigns
SET instructions = general_guidelines
WHERE instructions IS NULL AND general_guidelines IS NOT NULL;
