BEGIN;

-- Replace the newly added empty table so the image-key check accepts ordinary
-- PNG/JPG/WebP extensions without a backslash in the Storage object key.
LOCK TABLE public.site_element_models IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_element_models LIMIT 1) THEN
    RAISE EXCEPTION 'site_element_models contains records. Reconcile them before replacing its path constraint.';
  END IF;
END;
$$;

ALTER TABLE public.site_element_models RENAME TO site_element_models_legacy_path_check;
DO $$
BEGIN
  IF to_regclass('public.site_element_models_pkey') IS NOT NULL THEN
    ALTER INDEX public.site_element_models_pkey RENAME TO site_element_models_legacy_path_check_pkey;
  END IF;
  IF to_regclass('public.site_element_models_image_path_key') IS NOT NULL THEN
    ALTER INDEX public.site_element_models_image_path_key RENAME TO site_element_models_legacy_path_check_image_path_key;
  END IF;
END;
$$;
REVOKE ALL ON TABLE public.site_element_models_legacy_path_check FROM PUBLIC, anon, authenticated;

CREATE TABLE public.site_element_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('carousel', 'top_bar')),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100 AND name = btrim(name)),
  image_path text NOT NULL UNIQUE,
  file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  width integer NOT NULL,
  height integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_element_models_standard_dimensions CHECK (
    width = 1920 AND ((kind = 'carousel' AND height = 620) OR (kind = 'top_bar' AND height = 80))
  ),
  CONSTRAINT site_element_models_image_path_scope CHECK (
    image_path LIKE ('site-elements/' || kind || '/' || id::text || '/%')
    AND length(image_path) - length(replace(image_path, '/', '')) = 3
    AND split_part(image_path, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|webp)$'
  ),
  CONSTRAINT site_element_models_image_mime_extension CHECK (
    (mime_type = 'image/png' AND right(image_path, 4) = '.png')
    OR (mime_type = 'image/jpeg' AND right(image_path, 4) = '.jpg')
    OR (mime_type = 'image/webp' AND right(image_path, 5) = '.webp')
  )
);

ALTER TABLE public.site_element_models ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.site_element_models FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_element_models TO authenticated;
CREATE POLICY site_element_models_marketing_access ON public.site_element_models
  FOR ALL TO authenticated
  USING ((SELECT public.has_manage_site_elements_permission()))
  WITH CHECK ((SELECT public.has_manage_site_elements_permission()));

CREATE INDEX site_element_models_kind_created_id_idx
  ON public.site_element_models (kind, created_at DESC, id);

CREATE TRIGGER site_element_models_updated_at
  BEFORE UPDATE ON public.site_element_models
  FOR EACH ROW EXECUTE FUNCTION public.touch_site_element_model_updated_at();

COMMENT ON TABLE public.site_element_models IS
  'Biblioteca de modelos de imagem do site: carrossel e barra de destaque. Cadastro não publica imagens no catálogo.';

COMMIT;
