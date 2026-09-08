-- A leitura por imagem é assistida: a chave pode estar ausente ou parcial e será
-- conferida manualmente no ERP. A unicidade continua valendo quando houver chave.
ALTER TABLE public.inbound_invoices
  ALTER COLUMN chave_acesso DROP NOT NULL;
