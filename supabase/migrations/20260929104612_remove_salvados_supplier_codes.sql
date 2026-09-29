DELETE FROM public.product_supplier_codes
WHERE supplier_id IN (
    SELECT id::text 
    FROM public.people 
    WHERE 'salvados' = ANY(stock_origins) 
      AND NOT ('normal' = ANY(stock_origins))
);

