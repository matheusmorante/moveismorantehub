-- Imagem personalizada usada pelo selo de cada oportunidade nos posts.
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.opportunities.image_url IS
  'URL da imagem 4:1 usada como selo da oportunidade nos templates de posts.';
