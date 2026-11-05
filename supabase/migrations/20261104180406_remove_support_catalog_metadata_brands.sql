BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_catalog_metadata()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public, pg_temp
AS $function$
  SELECT jsonb_build_object(
    'categories', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', category.id, 'name', category.name, 'slug', category.slug)
        ORDER BY category.name, category.id)
      FROM public.categories AS category
      WHERE category.type = 'category'
    ), '[]'::jsonb),
    'relations', coalesce((
      SELECT jsonb_agg(jsonb_build_object('parent_id', relation.parent_id, 'child_id', relation.child_id)
        ORDER BY relation.parent_id, relation.child_id)
      FROM public.category_relationships AS relation
    ), '[]'::jsonb)
  );
$function$;

COMMIT;
