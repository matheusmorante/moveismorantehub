BEGIN;
SET LOCAL lock_timeout = '5s';

LOCK TABLE public.site_element_models IN ACCESS EXCLUSIVE MODE;

-- The new CHECK validates legacy rows while the prior CHECK is retained.
ALTER TABLE public.site_element_models RENAME COLUMN height TO legacy_height;

ALTER TABLE public.site_element_models
  ALTER COLUMN legacy_height SET DEFAULT 620,
  ADD COLUMN height integer NOT NULL DEFAULT 620,
  ADD COLUMN tablet_image_path text,
  ADD COLUMN tablet_file_name text,
  ADD COLUMN tablet_mime_type text,
  ADD COLUMN tablet_size_bytes integer,
  ADD COLUMN tablet_width integer,
  ADD COLUMN tablet_height integer,
  ADD COLUMN mobile_image_path text,
  ADD COLUMN mobile_file_name text,
  ADD COLUMN mobile_mime_type text,
  ADD COLUMN mobile_size_bytes integer,
  ADD COLUMN mobile_width integer,
  ADD COLUMN mobile_height integer,
  ADD CONSTRAINT site_element_models_responsive_dimensions CHECK (
    (kind = 'top_bar' AND height = 80 AND tablet_image_path IS NULL AND mobile_image_path IS NULL)
    OR (
      kind = 'carousel'
      AND (
        (height = 620 AND tablet_image_path IS NULL AND mobile_image_path IS NULL)
        OR (
          height = 600 AND tablet_image_path IS NOT NULL AND mobile_image_path IS NOT NULL
          AND image_path <> tablet_image_path AND image_path <> mobile_image_path AND tablet_image_path <> mobile_image_path
        )
      )
    )
  ),
  ADD CONSTRAINT site_element_models_tablet_asset CHECK (
    num_nonnulls(tablet_image_path, tablet_file_name, tablet_mime_type, tablet_size_bytes, tablet_width, tablet_height) = 0
    OR (
      kind = 'carousel'
      AND num_nonnulls(tablet_image_path, tablet_file_name, tablet_mime_type, tablet_size_bytes, tablet_width, tablet_height) = 6
      AND tablet_width = 1200 AND tablet_height = 600
      AND tablet_file_name <> '' AND length(tablet_file_name) <= 255
      AND tablet_size_bytes BETWEEN 1 AND 5242880
      AND tablet_image_path ~ ('^site-elements/carousel/' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|webp)$')
      AND CASE tablet_mime_type
        WHEN 'image/png' THEN right(tablet_image_path, 4) = '.png'
        WHEN 'image/jpeg' THEN right(tablet_image_path, 4) = '.jpg'
        WHEN 'image/webp' THEN right(tablet_image_path, 5) = '.webp'
        ELSE false
      END
    )
  ),
  ADD CONSTRAINT site_element_models_mobile_asset CHECK (
    num_nonnulls(mobile_image_path, mobile_file_name, mobile_mime_type, mobile_size_bytes, mobile_width, mobile_height) = 0
    OR (
      kind = 'carousel'
      AND num_nonnulls(mobile_image_path, mobile_file_name, mobile_mime_type, mobile_size_bytes, mobile_width, mobile_height) = 6
      AND mobile_width = 800 AND mobile_height = 800
      AND mobile_file_name <> '' AND length(mobile_file_name) <= 255
      AND mobile_size_bytes BETWEEN 1 AND 5242880
      AND mobile_image_path ~ ('^site-elements/carousel/' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|webp)$')
      AND CASE mobile_mime_type
        WHEN 'image/png' THEN right(mobile_image_path, 4) = '.png'
        WHEN 'image/jpeg' THEN right(mobile_image_path, 4) = '.jpg'
        WHEN 'image/webp' THEN right(mobile_image_path, 5) = '.webp'
        ELSE false
      END
    )
  );

COMMENT ON COLUMN public.site_element_models.legacy_height IS
  'Mantém a restrição anterior para compatibilidade. A altura real da imagem é registrada em height.';
COMMENT ON TABLE public.site_element_models IS
  'Modelos de imagem do carrossel. A vitrine lê somente banners ativos com as três imagens completas.';

-- The storefront uses anon. Keep direct table privileges and the ERP policy
-- intact and allow only the columns used to render or order public slides.
GRANT SELECT (id, name, image_path, tablet_image_path, mobile_image_path, created_at)
  ON public.site_element_models TO anon;

CREATE POLICY site_element_models_public_complete_carousel
  ON public.site_element_models FOR SELECT TO anon
  USING (
    kind = 'carousel' AND active AND height = 600
    AND tablet_image_path IS NOT NULL AND mobile_image_path IS NOT NULL
  );

COMMIT;
