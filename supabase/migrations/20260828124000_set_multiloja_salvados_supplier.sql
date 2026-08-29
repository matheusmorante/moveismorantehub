-- Usa exclusivamente o fornecedor já cadastrado, sem criar novos registros.
DO $$
DECLARE
    multiloja_salvados_id uuid;
BEGIN
    SELECT id INTO multiloja_salvados_id
    FROM public.people
    WHERE lower(trim(full_name)) = 'multiloja salvados'
      AND COALESCE(deleted, false) = false
      AND lower(COALESCE(person_type, '')) IN ('supplier', 'suppliers')
    LIMIT 1;

    IF multiloja_salvados_id IS NULL THEN
        RAISE EXCEPTION 'Fornecedor existente "Multiloja Salvados" não foi encontrado.';
    END IF;

    UPDATE public.products AS product
    SET
        supplier_id = multiloja_salvados_id,
        main_supplier_id = multiloja_salvados_id,
        updated_at = now()
    FROM public.opportunities AS opportunity
    WHERE product.opportunity_id = opportunity.id
      AND (lower(trim(opportunity.name)) = 'queima dos salvados' OR opportunity.slug = 'salvado');
END;
$$;
