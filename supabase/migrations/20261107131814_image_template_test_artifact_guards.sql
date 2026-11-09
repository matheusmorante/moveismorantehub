BEGIN;

-- The fixture identity stays in the existing design JSON. Ordinary templates
-- keep the same shape and permissions; a saved fixture cannot lose its marker.
CREATE FUNCTION public.guard_catalog_image_template_test_artifact()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE
  v_metadata jsonb;
  v_identity jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_metadata := OLD.design->'testArtifact';
  ELSE
    v_metadata := NEW.design->'testArtifact';
    IF TG_OP = 'UPDATE' AND OLD.design->'testArtifact' IS DISTINCT FROM v_metadata THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: a identidade de um modelo salvo não pode ser alterada';
    END IF;
  END IF;

  IF v_metadata IS NOT NULL THEN
    v_identity := public.test_artifact_identity(v_metadata);
    IF jsonb_typeof(v_metadata) IS DISTINCT FROM 'object'
      OR v_identity IS NULL OR auth.uid() IS NULL
      OR NOT coalesce(public.is_administrator(), false)
      OR v_metadata->>'scenarioKey' IS DISTINCT FROM 'image_template_crud'
      OR v_metadata->>'runId' IS DISTINCT FROM v_identity->>'runId'
      OR v_metadata->>'ownerId' IS DISTINCT FROM auth.uid()::text THEN
      RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED: execução e operador administrador autenticado são obrigatórios';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.guard_catalog_image_template_test_artifact() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_catalog_image_template_test_artifact
  BEFORE INSERT OR UPDATE OR DELETE ON public.catalog_image_templates
  FOR EACH ROW EXECUTE FUNCTION public.guard_catalog_image_template_test_artifact();

-- This restricts only identified fixtures; the existing permission policy
-- remains required for every row and operation.
CREATE POLICY catalog_image_template_test_owner ON public.catalog_image_templates
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  design->'testArtifact' IS NULL
  OR ((SELECT public.is_administrator()) AND design#>>'{testArtifact,ownerId}' = (SELECT auth.uid())::text)
)
WITH CHECK (
  design->'testArtifact' IS NULL
  OR ((SELECT public.is_administrator()) AND design#>>'{testArtifact,ownerId}' = (SELECT auth.uid())::text)
);

-- Append a compact metadata projection without changing existing view columns.
CREATE OR REPLACE VIEW public.catalog_image_template_list
WITH (security_invoker = true) AS
SELECT id, name, description, created_at, updated_at,
  lower(public.immutable_unaccent(concat_ws(' ', name, description, id::text))) AS search_text,
  (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS created_on,
  design->'testArtifact' AS test_artifact
FROM public.catalog_image_templates;

REVOKE ALL ON public.catalog_image_template_list FROM PUBLIC, anon;
GRANT SELECT ON public.catalog_image_template_list TO authenticated;

COMMIT;
