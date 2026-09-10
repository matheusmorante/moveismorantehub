-- Execute este script no Supabase SQL Editor após confirmar 0 órfãos.
-- Pré-condição: Bloco 6 do sku_swap_test.cjs retornou 0 órfãos em ambas as tabelas. ✅

-- Validar FK de post_share_tokens
ALTER TABLE public.post_share_tokens
  VALIDATE CONSTRAINT post_share_tokens_variation_id_fkey;

-- Validar FK de product_posts
ALTER TABLE public.product_posts
  VALIDATE CONSTRAINT product_posts_variation_id_fkey;

-- Confirmar que convalidated = true após execução:
SELECT
    con.conname        AS constraint_name,
    tc.table_name,
    con.convalidated   AS validated
FROM information_schema.table_constraints tc
JOIN pg_constraint con ON con.conname = tc.constraint_name
WHERE tc.constraint_name IN (
    'post_share_tokens_variation_id_fkey',
    'product_posts_variation_id_fkey'
)
ORDER BY tc.table_name;
