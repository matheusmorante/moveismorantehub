BEGIN;

-- Reuses the existing products bucket; no default models or images are seeded.
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
    image_path ~ ('^site-elements/' || kind || '/' || id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$')
  )
);

-- This is a shared Marketing library; permissions use the same persisted roles as the ERP.
-- SECURITY INVOKER retains profiles/settings RLS, whose own-profile/read policies were verified.
CREATE FUNCTION public.has_manage_site_elements_permission()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    LEFT JOIN public.settings AS settings ON settings.id = 'app'
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN cardinality(array_remove(COALESCE(profile.roles, ARRAY[]::text[]), 'pending')) > 0
          THEN array_remove(profile.roles, 'pending')
        WHEN profile.role IS NOT NULL AND profile.role <> 'pending' THEN ARRAY[profile.role]
        ELSE ARRAY[]::text[]
      END AS roles
    ) AS current_profile
    WHERE profile.id = (SELECT auth.uid())
      AND (
        'administrator' = ANY(current_profile.roles)
        OR current_profile.roles && CASE
          WHEN settings.data -> 'rolePermissions' -> 'manageSiteElements' IS NULL THEN ARRAY['manager']::text[]
          WHEN jsonb_typeof(settings.data -> 'rolePermissions' -> 'manageSiteElements') = 'array'
            THEN ARRAY(SELECT jsonb_array_elements_text(settings.data -> 'rolePermissions' -> 'manageSiteElements'))
          ELSE ARRAY[]::text[]
        END
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_manage_site_elements_permission() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_manage_site_elements_permission() TO authenticated;

ALTER TABLE public.site_element_models ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_element_models TO authenticated;
REVOKE ALL ON public.site_element_models FROM PUBLIC, anon;
CREATE POLICY site_element_models_marketing_access ON public.site_element_models
  FOR ALL TO authenticated
  USING ((SELECT public.has_manage_site_elements_permission()))
  WITH CHECK ((SELECT public.has_manage_site_elements_permission()));

CREATE FUNCTION public.touch_site_element_model_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.touch_site_element_model_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER site_element_models_updated_at
  BEFORE UPDATE ON public.site_element_models
  FOR EACH ROW EXECUTE FUNCTION public.touch_site_element_model_updated_at();

COMMENT ON TABLE public.site_element_models IS
  'Biblioteca de modelos de imagem do site: carrossel e barra de destaque. Cadastro não publica imagens no catálogo.';

COMMIT;
