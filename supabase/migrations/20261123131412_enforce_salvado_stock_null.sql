CREATE OR REPLACE FUNCTION public.null_stock_for_salvado_product_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF lower(coalesce(NEW.product_kind, '')) IN ('salvado', 'salvados')
     OR lower(coalesce(NEW.condition, '')) IN ('salvado', 'salvados')
     OR coalesce(NEW.is_salvado, false)
     OR EXISTS (
       SELECT 1
       FROM public.opportunities AS opportunity
       WHERE opportunity.id = NEW.opportunity_id
         AND lower(coalesce(opportunity.name, '')) LIKE '%salvado%'
     ) THEN
    NEW.stock := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.null_stock_for_salvado_variation_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.products AS product
    LEFT JOIN public.opportunities AS opportunity
      ON opportunity.id = product.opportunity_id
    WHERE product.id = NEW.product_id
      AND (
        lower(coalesce(product.product_kind, '')) IN ('salvado', 'salvados')
        OR lower(coalesce(product.condition, '')) IN ('salvado', 'salvados')
        OR coalesce(product.is_salvado, false)
        OR lower(coalesce(opportunity.name, '')) LIKE '%salvado%'
      )
  ) THEN
    NEW.stock := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.null_stock_for_salvado_product_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.null_stock_for_salvado_variation_write() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER null_salvado_stock_on_product_write
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.null_stock_for_salvado_product_write();

CREATE TRIGGER null_salvado_stock_on_variation_write
BEFORE INSERT OR UPDATE ON public.product_variations
FOR EACH ROW
EXECUTE FUNCTION public.null_stock_for_salvado_variation_write();
