-- Ativar unaccent se ainda não estiver ativo
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Criar função imutável para unaccent se necessário
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text AS $$
    SELECT public.unaccent($1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
