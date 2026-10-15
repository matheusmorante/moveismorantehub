-- Migration: 20261015120000_require_doors_drawers_key_categories.sql
-- Goal: Set 'Quantidade de portas' and 'Quantidade de gavetas' as mandatory (is_required = true)
--       for Guarda-Roupas, Balcões para Pia, Cômodas, and Cozinhas Moduladas e Compactas.
--       Also ensure option values up to 20 doors/drawers exist.

-- 1. Ensure attribute_values for 11 to 20 doors and drawers exist
INSERT INTO public.attribute_values (attribute_id, value)
SELECT '8ed99f89-ca07-4676-abd0-87ab87422c3a'::uuid, v || ' portas'
FROM unnest(ARRAY['11','12','13','14','15','16','17','18','19','20']) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM public.attribute_values 
  WHERE attribute_id = '8ed99f89-ca07-4676-abd0-87ab87422c3a' AND value = v || ' portas'
);

INSERT INTO public.attribute_values (attribute_id, value)
SELECT 'cfd2c4d5-2138-4e95-ac7f-ef5af56ecba9'::uuid, v || ' gavetas'
FROM unnest(ARRAY['11','12','13','14','15','16','17','18','19','20']) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM public.attribute_values 
  WHERE attribute_id = 'cfd2c4d5-2138-4e95-ac7f-ef5af56ecba9' AND value = v || ' gavetas'
);

-- 2. Update category_attributes to make Quantidade de portas and Quantidade de gavetas required
UPDATE public.category_attributes
SET is_required = true
WHERE category_id IN (
  '1859e792-0790-4554-b269-e3b0b707896e', -- Guarda-Roupas
  'ba076524-c8f1-494e-a055-cf5881c4d906', -- Balcões para Pia
  '4fd92708-2390-4a35-bd54-fbd513ec6677', -- Cômodas
  'b3a1a235-fd4c-4706-a058-6f8200b3731a'  -- Cozinhas Moduladas e Compactas
)
AND attribute_id IN (
  '8ed99f89-ca07-4676-abd0-87ab87422c3a', -- Quantidade de portas
  'cfd2c4d5-2138-4e95-ac7f-ef5af56ecba9'  -- Quantidade de gavetas
);
