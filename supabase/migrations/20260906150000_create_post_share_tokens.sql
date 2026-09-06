-- Migration: Tokens de compartilhamento de instruções de posts para IA.
-- Link secreto revogável, de alta entropia, sem enumeração.
-- Regra de negócio: um produto possui no máximo um share ativo padrão.
-- Não remove tabelas ou migrations anteriores.

CREATE TABLE IF NOT EXISTS public.post_share_tokens (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid        NOT NULL,
  variation_id  uuid,                             -- variação selecionada (preserva ?var=)
  token         text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  active        boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Índice para lookup rápido por token (rota pública)
CREATE INDEX IF NOT EXISTS post_share_tokens_token_idx
  ON public.post_share_tokens (token)
  WHERE active = true;

-- Índice para garantir que o produto reutilize o mesmo token
CREATE INDEX IF NOT EXISTS post_share_tokens_product_idx
  ON public.post_share_tokens (product_id)
  WHERE active = true;

ALTER TABLE public.post_share_tokens ENABLE ROW LEVEL SECURITY;

-- Acesso de leitura pública (sem login) — necessário para a página /share/...
DROP POLICY IF EXISTS "public_read_post_share_tokens" ON public.post_share_tokens;
CREATE POLICY "public_read_post_share_tokens"
  ON public.post_share_tokens
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Escrita restrita a usuários autenticados
DROP POLICY IF EXISTS "authenticated_manage_post_share_tokens" ON public.post_share_tokens;
CREATE POLICY "authenticated_manage_post_share_tokens"
  ON public.post_share_tokens
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
