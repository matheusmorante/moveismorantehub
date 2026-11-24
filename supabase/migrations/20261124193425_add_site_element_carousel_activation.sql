BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.site_element_models
  ADD COLUMN active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.site_element_models.active IS
  'Indica se o modelo de carrossel está ativo na biblioteca de elementos do site do ERP.';

COMMIT;
