-- Mantém a tabela de categorias compatível com o cadastro do ERP e o catálogo digital.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS seo_description text;

-- Preenche um slug básico para os registros antigos que ainda não possuem esse campo.
UPDATE public.categories
SET slug = trim(both '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR btrim(slug) = '';
