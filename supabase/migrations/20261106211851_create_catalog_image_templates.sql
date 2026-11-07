BEGIN;

CREATE TABLE public.catalog_image_templates (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 100),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 400),
  design jsonb NOT NULL CHECK (
    octet_length(design::text) <= 131072
    AND (design->'version' = '1'::jsonb) IS TRUE
    AND (jsonb_typeof(design->'formats'->'1:1'->'layers') = 'array') IS TRUE
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Logos and overlays are immutable and can be shared by copies of a model.
CREATE TABLE public.catalog_image_template_assets (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  webp_base64 text NOT NULL CHECK (octet_length(webp_base64) BETWEEN 16 AND 409600),
  CONSTRAINT catalog_image_template_asset_content CHECK (
    encode(sha256(decode(webp_base64, 'base64')), 'hex') = id
    AND substring(decode(webp_base64, 'base64') FROM 1 FOR 4) = decode('52494646', 'hex')
    AND substring(decode(webp_base64, 'base64') FROM 9 FOR 4) = decode('57454250', 'hex')
  )
);

CREATE FUNCTION public.has_manage_catalog_image_templates_permission()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS profile
    LEFT JOIN public.settings AS settings ON settings.id = 'app'
    CROSS JOIN LATERAL (
      SELECT ARRAY(SELECT role FROM unnest(profile.roles) AS roles(role) WHERE btrim(role) <> '' AND role <> 'pending') AS roles,
        settings.data -> 'rolePermissions' -> 'manageCatalogImageTemplates' AS configured
    ) AS assigned
    CROSS JOIN LATERAL (
      SELECT CASE WHEN cardinality(assigned.roles) > 0 THEN assigned.roles
        WHEN btrim(profile.role) <> '' AND profile.role <> 'pending' THEN ARRAY[profile.role]
        ELSE ARRAY[]::text[] END AS roles
    ) AS effective
    WHERE profile.id = (SELECT auth.uid())
      AND ('administrator' = ANY(effective.roles) OR effective.roles && CASE
        WHEN jsonb_typeof(assigned.configured) = 'array' THEN ARRAY(
          SELECT value #>> '{}' FROM jsonb_array_elements(assigned.configured) AS configured_role(value)
          WHERE jsonb_typeof(value) = 'string'
        ) ELSE ARRAY['manager']::text[] END)
  );
$fn$;

REVOKE ALL ON FUNCTION public.has_manage_catalog_image_templates_permission() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_manage_catalog_image_templates_permission() TO authenticated;

ALTER TABLE public.catalog_image_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_image_template_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_image_templates, public.catalog_image_template_assets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_image_templates TO authenticated;
GRANT SELECT, INSERT ON public.catalog_image_template_assets TO authenticated;

CREATE POLICY manage_catalog_image_templates ON public.catalog_image_templates FOR ALL TO authenticated
  USING ((SELECT public.has_manage_catalog_image_templates_permission()))
  WITH CHECK ((SELECT public.has_manage_catalog_image_templates_permission()));
CREATE POLICY read_catalog_image_template_assets ON public.catalog_image_template_assets FOR SELECT TO authenticated
  USING ((SELECT public.has_manage_catalog_image_templates_permission()));
CREATE POLICY insert_catalog_image_template_assets ON public.catalog_image_template_assets FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_manage_catalog_image_templates_permission()));

CREATE FUNCTION public.validate_catalog_image_template_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE
  v_assets text[];
BEGIN
  IF TG_OP = 'INSERT' OR NEW.design IS DISTINCT FROM OLD.design THEN
    SELECT ARRAY(
      SELECT DISTINCT value #>> '{}'
      FROM jsonb_path_query(NEW.design, '$.formats.*.layers[*] ? (@.type == "image").assetId ? (@.type() == "string")') AS image(value)
    ) INTO v_assets;
    IF cardinality(v_assets) > 12 OR EXISTS (
      SELECT 1 FROM unnest(v_assets) AS asset(id)
      WHERE NOT EXISTS (SELECT 1 FROM public.catalog_image_template_assets AS stored WHERE stored.id = asset.id)
    ) THEN
      RAISE EXCEPTION 'Imagens do modelo ausentes ou acima do limite.' USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.validate_catalog_image_template_write() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_catalog_image_template_write BEFORE INSERT OR UPDATE ON public.catalog_image_templates
  FOR EACH ROW EXECUTE FUNCTION public.validate_catalog_image_template_write();

COMMIT;
