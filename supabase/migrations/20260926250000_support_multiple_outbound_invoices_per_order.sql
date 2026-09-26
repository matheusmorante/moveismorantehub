ALTER TABLE public.nfe_documents
  ADD COLUMN IF NOT EXISTS emission_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_documents_emission_request
  ON public.nfe_documents(emission_request_id)
  WHERE emission_request_id IS NOT NULL;

DROP INDEX IF EXISTS public.uq_nfe_documents_active_order_model_environment;

COMMENT ON COLUMN public.nfe_documents.emission_request_id IS
  'Chave idempotente de uma tentativa de emissão; permite várias NF-e legítimas no mesmo pedido sem duplicar reenvios.';
