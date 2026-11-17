BEGIN;

-- Responsiveness is stored separately from the legacy single-image table so
-- the existing carousel data and its fixed-dimension constraints stay intact.
CREATE TABLE public.site_element_top_bar_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100 AND name = btrim(name)),
  image_path text NOT NULL UNIQUE,
  file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  width integer NOT NULL CHECK (width = 2880),
  height integer NOT NULL CHECK (height = 720),
  mobile_image_path text NOT NULL UNIQUE,
  mobile_file_name text NOT NULL CHECK (length(mobile_file_name) BETWEEN 1 AND 255),
  mobile_mime_type text NOT NULL CHECK (mobile_mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  mobile_size_bytes integer NOT NULL CHECK (mobile_size_bytes BETWEEN 1 AND 5242880),
  mobile_width integer NOT NULL CHECK (mobile_width = 900),
  mobile_height integer NOT NULL CHECK (mobile_height = 600),
  tablet_image_path text NOT NULL UNIQUE,
  tablet_file_name text NOT NULL CHECK (length(tablet_file_name) BETWEEN 1 AND 255),
  tablet_mime_type text NOT NULL CHECK (tablet_mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  tablet_size_bytes integer NOT NULL CHECK (tablet_size_bytes BETWEEN 1 AND 5242880),
  tablet_width integer NOT NULL CHECK (tablet_width = 1600),
  tablet_height integer NOT NULL CHECK (tablet_height = 600),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_element_top_bar_models_image_path_scope CHECK (
    image_path LIKE ('site-elements/top_bar/' || id::text || '/%')
    AND length(image_path) - length(replace(image_path, '/', '')) = 3
    AND split_part(image_path, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|webp)$'
  ),
  CONSTRAINT site_element_top_bar_models_image_mime_extension CHECK (
    (mime_type = 'image/png' AND right(image_path, 4) = '.png')
    OR (mime_type = 'image/jpeg' AND right(image_path, 4) = '.jpg')
    OR (mime_type = 'image/webp' AND right(image_path, 5) = '.webp')
  ),
  CONSTRAINT site_element_top_bar_models_mobile_path_scope CHECK (
    mobile_image_path LIKE ('site-elements/top_bar/' || id::text || '/%')
    AND length(mobile_image_path) - length(replace(mobile_image_path, '/', '')) = 3
    AND split_part(mobile_image_path, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|webp)$'
  ),
  CONSTRAINT site_element_top_bar_models_mobile_mime_extension CHECK (
    (mobile_mime_type = 'image/png' AND right(mobile_image_path, 4) = '.png')
    OR (mobile_mime_type = 'image/jpeg' AND right(mobile_image_path, 4) = '.jpg')
    OR (mobile_mime_type = 'image/webp' AND right(mobile_image_path, 5) = '.webp')
  ),
  CONSTRAINT site_element_top_bar_models_tablet_path_scope CHECK (
    tablet_image_path LIKE ('site-elements/top_bar/' || id::text || '/%')
    AND length(tablet_image_path) - length(replace(tablet_image_path, '/', '')) = 3
    AND split_part(tablet_image_path, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|webp)$'
  ),
  CONSTRAINT site_element_top_bar_models_tablet_mime_extension CHECK (
    (tablet_mime_type = 'image/png' AND right(tablet_image_path, 4) = '.png')
    OR (tablet_mime_type = 'image/jpeg' AND right(tablet_image_path, 4) = '.jpg')
    OR (tablet_mime_type = 'image/webp' AND right(tablet_image_path, 5) = '.webp')
  )
);

ALTER TABLE public.site_element_top_bar_models ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.site_element_top_bar_models FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_element_top_bar_models TO authenticated;
CREATE POLICY site_element_top_bar_models_marketing_access ON public.site_element_top_bar_models
  FOR ALL TO authenticated
  USING ((SELECT public.has_manage_site_elements_permission()))
  WITH CHECK ((SELECT public.has_manage_site_elements_permission()));

CREATE INDEX site_element_top_bar_models_created_id_idx
  ON public.site_element_top_bar_models (created_at DESC, id);
CREATE TRIGGER site_element_top_bar_models_updated_at
  BEFORE UPDATE ON public.site_element_top_bar_models
  FOR EACH ROW EXECUTE FUNCTION public.touch_site_element_model_updated_at();

COMMENT ON TABLE public.site_element_top_bar_models IS
  'Modelos da barra de destaque com imagens separadas para desktop, celular e tablet. Cadastro não publica imagens no catálogo.';
COMMENT ON COLUMN public.site_element_top_bar_models.image_path IS 'Imagem desktop (2880 × 720 px).';
COMMENT ON COLUMN public.site_element_top_bar_models.mobile_image_path IS 'Imagem para celular (900 × 600 px).';
COMMENT ON COLUMN public.site_element_top_bar_models.tablet_image_path IS 'Imagem para tablet (1600 × 600 px).';

COMMIT;
