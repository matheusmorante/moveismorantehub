-- Check functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_definition ILIKE '%product_variation_suppliers%';
