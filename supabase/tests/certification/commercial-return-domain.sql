-- Pure-function contract tests. Read only: no business fixtures or transactions.
-- Run after the reviewed migration is applied to the authorized project.
SELECT 'partial return' AS scenario,
  public.commercial_return_validation_error('[{"productId":"p","variationId":"v","description":"Cadeira","quantity":3}]'::jsonb,
    '[]'::jsonb,
    '[{"productId":"p","variationId":"v","description":"Cadeira","quantity":1,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM NULL::text AS passed;

SELECT 'complete return' AS scenario,
  public.commercial_return_validation_error('[{"productId":"p","variationId":"v","description":"Cadeira","quantity":3}]'::jsonb,
    '[]'::jsonb,
    '[{"productId":"p","variationId":"v","description":"Cadeira","quantity":3,"returnedQuantity":3,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM NULL::text AS passed;

SELECT 'empty' AS scenario,
  public.commercial_return_validation_error('[{"quantity":1}]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_ITEMS_REQUIRED' AS passed;

SELECT 'missing index' AS scenario,
  public.commercial_return_validation_error('[{"quantity":1}]'::jsonb,
    '[]'::jsonb,
    '[{"quantity":1}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_SOURCE_LINE_INVALID' AS passed;

SELECT 'negative index' AS scenario,
  public.commercial_return_validation_error('[{"quantity":1}]'::jsonb,
    '[]'::jsonb,
    '[{"quantity":1,"originalOrderItemIndex":-1}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_SOURCE_LINE_INVALID' AS passed;

SELECT 'fractional index' AS scenario,
  public.commercial_return_validation_error('[{"quantity":1}]'::jsonb,
    '[]'::jsonb,
    '[{"quantity":1,"originalOrderItemIndex":0.5}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_SOURCE_LINE_INVALID' AS passed;

SELECT 'foreign variation' AS scenario,
  public.commercial_return_validation_error('[{"variationId":"v1","quantity":1}]'::jsonb,
    '[]'::jsonb,
    '[{"variationId":"v2","quantity":1,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_SOURCE_LINE_MISMATCH' AS passed;

SELECT 'zero quantity' AS scenario,
  public.commercial_return_validation_error('[{"quantity":1}]'::jsonb,
    '[]'::jsonb,
    '[{"quantity":0,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_QUANTITY_INVALID' AS passed;

SELECT 'negative quantity' AS scenario,
  public.commercial_return_validation_error('[{"quantity":1}]'::jsonb,
    '[]'::jsonb,
    '[{"quantity":-1,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_QUANTITY_INVALID' AS passed;

SELECT 'divergent physical quantity' AS scenario,
  public.commercial_return_validation_error('[{"quantity":3}]'::jsonb,
    '[]'::jsonb,
    '[{"quantity":3,"returnedQuantity":1,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_QUANTITY_MISMATCH' AS passed;

SELECT 'over capacity' AS scenario,
  public.commercial_return_validation_error('[{"quantity":1}]'::jsonb,
    '[]'::jsonb,
    '[{"quantity":2,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_CAPACITY_EXCEEDED' AS passed;

SELECT 'repeated same line' AS scenario,
  public.commercial_return_validation_error('[{"quantity":1}]'::jsonb,
    '[]'::jsonb,
    '[{"quantity":1,"originalOrderItemIndex":0},{"quantity":1,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_CAPACITY_EXCEEDED' AS passed;

SELECT 'identical sku lines retain independent capacity' AS scenario,
  public.commercial_return_validation_error('[{"productId":"p","quantity":1},{"productId":"p","quantity":3}]'::jsonb,
    '[{"status":"fulfilled","items":[{"productId":"p","quantity":1,"originalOrderItemIndex":0}]}]'::jsonb,
    '[{"productId":"p","quantity":1,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_CAPACITY_EXCEEDED' AS passed;

SELECT 'legacy allocated in source order' AS scenario,
  public.commercial_return_validation_error('[{"productId":"p","quantity":1},{"productId":"p","quantity":3}]'::jsonb,
    '[{"status":"fulfilled","items":[{"productId":"p","quantity":1}]}]'::jsonb,
    '[{"productId":"p","quantity":1,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM 'RETURN_CAPACITY_EXCEEDED' AS passed;

SELECT 'cancelled return releases capacity' AS scenario,
  public.commercial_return_validation_error('[{"quantity":1}]'::jsonb,
    '[{"status":"cancelled","items":[{"quantity":1,"originalOrderItemIndex":0}]}]'::jsonb,
    '[{"quantity":1,"originalOrderItemIndex":0}]'::jsonb)
  IS NOT DISTINCT FROM NULL::text AS passed;
