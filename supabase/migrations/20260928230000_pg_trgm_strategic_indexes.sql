-- Migration: 20260928230000_pg_trgm_strategic_indexes.sql
-- Descrição: Declaração idempotente das extensões pg_trgm e unaccent, com criação de índices GIN trigram estratégicos
-- estritamente justificados para busca textual aproximada (eliminação de Seq Scans em buscas de nomes/descrições).

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

-- Função auxiliar imutável para unaccent se ainda não existir
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
    SELECT public.unaccent($1);
$$;

ALTER FUNCTION public.immutable_unaccent(text) SET search_path = public, pg_temp;

-- 2. Índice GIN Trigram para Variações de Produto (elimina Seq Scan nas buscas da listagem e catálogo)
CREATE INDEX IF NOT EXISTS idx_product_variations_name_trgm 
ON public.product_variations USING gin (name gin_trgm_ops);

-- 3. Índice GIN Trigram para Pessoas / Clientes / Fornecedores (elimina Seq Scan no searchPeople)
CREATE INDEX IF NOT EXISTS idx_people_full_name_trgm 
ON public.people USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_people_social_name_trgm 
ON public.people USING gin (social_name gin_trgm_ops) 
WHERE social_name IS NOT NULL;

-- 4. Índice GIN Trigram para Pedidos por Nome do Cliente (elimina Seq Scan na busca de pedidos por cliente)
CREATE INDEX IF NOT EXISTS idx_orders_customer_name_trgm 
ON public.orders USING gin (customer_name gin_trgm_ops) 
WHERE customer_name IS NOT NULL;

-- 5. Índice GIN Trigram para Composições
CREATE INDEX IF NOT EXISTS idx_compositions_name_trgm 
ON public.compositions USING gin (name gin_trgm_ops);

-- 6. Índice GIN Trigram Funcional para Catálogo de NCM (acelera busca textual de NCM de ~320ms para <5ms)
CREATE INDEX IF NOT EXISTS idx_ncms_desc_unaccent_trgm 
ON public.ncms USING gin (public.immutable_unaccent(official_description) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ncm_aliases_term_unaccent_trgm 
ON public.ncm_aliases USING gin (public.immutable_unaccent(term) gin_trgm_ops);
