BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.site_element_models
  ADD COLUMN link_url text,
  ADD CONSTRAINT site_element_models_carousel_link_url CHECK (
    link_url IS NULL OR (
      kind = 'carousel'
      AND char_length(link_url) BETWEEN 1 AND 2048
      AND link_url !~ '[[:space:][:cntrl:]]'
      AND position(chr(92) IN link_url) = 0
      AND (link_url ~ '^/([^/]|$)' OR link_url ~* '^https?://[^/?#@]+([/?#]|$)')
    )
  );

-- The existing anonymous policy limits the catalog to active, complete slides.
GRANT SELECT (link_url) ON public.site_element_models TO anon;

COMMENT ON COLUMN public.site_element_models.link_url IS
  'Destino opcional ao clicar no banner do carrossel do catálogo.';

COMMIT;
