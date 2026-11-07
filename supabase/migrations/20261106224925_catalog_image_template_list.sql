BEGIN;

CREATE VIEW public.catalog_image_template_list
WITH (security_invoker = true) AS
SELECT id, name, description, created_at, updated_at,
  lower(public.immutable_unaccent(concat_ws(' ', name, description, id::text))) AS search_text,
  (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS created_on
FROM public.catalog_image_templates;

REVOKE ALL ON public.catalog_image_template_list FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.catalog_image_template_list TO authenticated;

COMMIT;
